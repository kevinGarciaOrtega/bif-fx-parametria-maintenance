import {
  DynamoDBClient,
  ScanCommand,
  DescribeTableCommand,
  AttributeValue,
} from '@aws-sdk/client-dynamodb';

// ─── DynamoDB client ────────────────────────────────────────────────────────

const DYNAMO_ENDPOINT = process.env.DYNAMO_ENDPOINT ?? 'http://127.0.0.1:8000';

const client = new DynamoDBClient({
  endpoint: DYNAMO_ENDPOINT,
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'local',
    secretAccessKey: 'local',
  },
});

const TABLE_NAME = 'tablero-dev';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CheckResult {
  entity: string;
  expected: number;
  obtained: number;
  ok: boolean;
}

// ─── scanByTipo ──────────────────────────────────────────────────────────────

async function scanByTipo(tipo: string): Promise<number> {
  let count = 0;
  let lastEvaluatedKey: Record<string, AttributeValue> | undefined = undefined;

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: '#tipo = :tipo',
        ExpressionAttributeNames: { '#tipo': 'tipo' },
        ExpressionAttributeValues: { ':tipo': { S: tipo } },
        ...(lastEvaluatedKey ? { ExclusiveStartKey: lastEvaluatedKey } : {}),
        Select: 'COUNT',
      }),
    );

    count += result.Count ?? 0;
    lastEvaluatedKey = result.LastEvaluatedKey as Record<string, AttributeValue> | undefined;
  } while (lastEvaluatedKey !== undefined);

  return count;
}

// ─── scanTcBaseActivo ────────────────────────────────────────────────────────

async function scanTcBaseActivo(): Promise<number> {
  let count = 0;
  let lastEvaluatedKey: Record<string, AttributeValue> | undefined = undefined;

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: '#tipo = :tipo AND SK = :sk',
        ExpressionAttributeNames: { '#tipo': 'tipo' },
        ExpressionAttributeValues: {
          ':tipo': { S: 'TC_BASE' },
          ':sk': { S: 'ACTIVO' },
        },
        ...(lastEvaluatedKey ? { ExclusiveStartKey: lastEvaluatedKey } : {}),
        Select: 'COUNT',
      }),
    );

    count += result.Count ?? 0;
    lastEvaluatedKey = result.LastEvaluatedKey as Record<string, AttributeValue> | undefined;
  } while (lastEvaluatedKey !== undefined);

  return count;
}

// ─── printTable ──────────────────────────────────────────────────────────────

function printTable(results: CheckResult[]): void {
  const COL_ENTITY = 22;
  const COL_EXPECTED = 10;
  const COL_OBTAINED = 10;
  const COL_STATUS = 8;

  const pad = (str: string, len: number): string => str.padEnd(len);
  const center = (str: string, len: number): string => {
    const total = len - str.length;
    const left = Math.floor(total / 2);
    const right = total - left;
    return ' '.repeat(left) + str + ' '.repeat(right);
  };

  const top    = `╔${'═'.repeat(COL_ENTITY + 2)}╦${'═'.repeat(COL_EXPECTED + 2)}╦${'═'.repeat(COL_OBTAINED + 2)}╦${'═'.repeat(COL_STATUS + 2)}╗`;
  const header = `║ ${pad('Entidad', COL_ENTITY)} ║${center('Esperado', COL_EXPECTED + 2)}║${center('Obtenido', COL_OBTAINED + 2)}║${center('Status', COL_STATUS + 2)}║`;
  const sep    = `╠${'═'.repeat(COL_ENTITY + 2)}╬${'═'.repeat(COL_EXPECTED + 2)}╬${'═'.repeat(COL_OBTAINED + 2)}╬${'═'.repeat(COL_STATUS + 2)}╣`;
  const bottom = `╚${'═'.repeat(COL_ENTITY + 2)}╩${'═'.repeat(COL_EXPECTED + 2)}╩${'═'.repeat(COL_OBTAINED + 2)}╩${'═'.repeat(COL_STATUS + 2)}╝`;

  console.log(top);
  console.log(header);
  console.log(sep);

  for (const r of results) {
    const status = r.ok ? '✅' : '❌';
    const row =
      `║ ${pad(r.entity, COL_ENTITY)} ║` +
      `${center(String(r.expected), COL_EXPECTED + 2)}║` +
      `${center(String(r.obtained), COL_OBTAINED + 2)}║` +
      `${center(status, COL_STATUS + 2)}║`;
    console.log(row);
  }

  console.log(bottom);
}

// ─── verifyGSIs ──────────────────────────────────────────────────────────────

async function verifyGSIs(): Promise<boolean> {
  const EXPECTED_GSIS = [
    'GSI1-estado-fecha',
    'GSI2-cliente',
    'GSI3-perfil-pantalla',
  ];

  const result = await client.send(
    new DescribeTableCommand({ TableName: TABLE_NAME }),
  );

  const gsiList = result.Table?.GlobalSecondaryIndexes ?? [];
  let allActive = true;

  console.log('\n── GSIs ─────────────────────────────────────────────────────');
  for (const gsiName of EXPECTED_GSIS) {
    const gsi = gsiList.find((g) => g.IndexName === gsiName);
    const status = gsi?.IndexStatus ?? 'NOT_FOUND';
    const ok = status === 'ACTIVE';
    if (!ok) allActive = false;
    const icon = ok ? '✅' : '❌';
    console.log(`${icon} ${gsiName}: ${status}`);
  }

  return allActive;
}

// ─── verify ──────────────────────────────────────────────────────────────────

export async function verify(): Promise<void> {
  console.log('\n── Verificando integridad de datos en DynamoDB Local ────────\n');

  // Define all checks
  const checks: Array<{ entity: string; expected: number; scan: () => Promise<number> }> = [
    { entity: 'VOLATILIDAD',     expected: 2,  scan: () => scanByTipo('VOLATILIDAD') },
    { entity: 'HORARIO',         expected: 2,  scan: () => scanByTipo('HORARIO') },
    { entity: 'FERIADO 2026',    expected: 12, scan: () => scanByTipo('FERIADO') },
    { entity: 'RANGO_PN',        expected: 6,  scan: () => scanByTipo('RANGO_PN') },
    { entity: 'RANGO_PJ',        expected: 4,  scan: () => scanByTipo('RANGO_PJ') },
    { entity: 'SEGMENTO',        expected: 8,  scan: () => scanByTipo('SEGMENTO') },
    { entity: 'SPREAD_LIQUIDEZ', expected: 4,  scan: () => scanByTipo('SPREAD_LIQUIDEZ') },
    { entity: 'SPREAD_CLIENTE',  expected: 6,  scan: () => scanByTipo('SPREAD_CLIENTE') },
    { entity: 'TC_BASE (ACTIVO)',expected: 2,  scan: () => scanTcBaseActivo() },
    { entity: 'TC_VENTANILLA',   expected: 4,  scan: () => scanByTipo('TC_VENTANILLA') },
    { entity: 'COTIZACION',      expected: 2,  scan: () => scanByTipo('COTIZACION') },
    { entity: 'PARAMETRO',       expected: 9,  scan: () => scanByTipo('PARAMETRO') },
    { entity: 'PERFIL',          expected: 3,  scan: () => scanByTipo('PERFIL') },
    { entity: 'PANTALLA',        expected: 11, scan: () => scanByTipo('PANTALLA') },
    { entity: 'PERFIL_ACCESO',   expected: 19, scan: () => scanByTipo('PERFIL_ACCESO') },
    { entity: 'USUARIO',         expected: 3,  scan: () => scanByTipo('USUARIO') },
  ];

  // Run all scans
  const results: CheckResult[] = [];
  for (const check of checks) {
    const obtained = await check.scan();
    results.push({
      entity: check.entity,
      expected: check.expected,
      obtained,
      ok: obtained === check.expected,
    });
  }

  // Print results table
  printTable(results);

  // Summary
  const totalObtained = results.reduce((sum, r) => sum + r.obtained, 0);
  const allItemsOk = results.every((r) => r.ok);
  const totalIcon = allItemsOk ? '✅' : '❌';
  console.log(`\nTotal: ${totalObtained} items ${totalIcon}`);

  // Verify GSIs
  const gsiOk = await verifyGSIs();

  // Exit with error if any check failed
  if (!allItemsOk || !gsiOk) {
    console.error('\n❌ Verificación fallida: uno o más checks no pasaron.');
    process.exit(1);
  }

  console.log('\n✅ Verificación completada exitosamente.\n');
}

// ─── Run directly ─────────────────────────────────────────────────────────────

verify().catch((err: unknown) => {
  console.error('❌ Error durante la verificación:', err);
  process.exit(1);
});
