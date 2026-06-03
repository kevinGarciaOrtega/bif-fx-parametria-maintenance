import * as fs from 'fs';
import * as path from 'path';
import {
  DynamoDBClient,
  CreateTableCommand,
  ListTablesCommand,
  DescribeTableCommand,
  BatchWriteItemCommand,
  CreateTableCommandInput,
  WriteRequest,
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

// ─── checkConnection ─────────────────────────────────────────────────────────

async function checkConnection(): Promise<void> {
  try {
    await client.send(new ListTablesCommand({}));
  } catch {
    throw new Error(
      `❌ DynamoDB Local no está corriendo en ${DYNAMO_ENDPOINT}. Ejecuta: npm run up`,
    );
  }
}

// ─── createTable ─────────────────────────────────────────────────────────────

async function createTable(): Promise<void> {
  const schemaPath = path.join(__dirname, '..', 'schema', 'create-table.json');
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  const tableDefinition = JSON.parse(schemaContent) as CreateTableCommandInput;

  try {
    await client.send(new CreateTableCommand(tableDefinition));
  } catch (err: unknown) {
    const error = err as { name?: string };
    if (error.name === 'ResourceInUseException') {
      console.log(`⚠️  Tabla '${TABLE_NAME}' ya existe, omitiendo creación`);
      return;
    }
    throw err;
  }

  // Poll until table is ACTIVE
  let status = '';
  while (status !== 'ACTIVE') {
    await sleep(500);
    const result = await client.send(
      new DescribeTableCommand({ TableName: TABLE_NAME }),
    );
    status = result.Table?.TableStatus ?? '';
  }

  console.log(`✅ Tabla '${TABLE_NAME}' creada`);
}

// ─── loadSeed ────────────────────────────────────────────────────────────────

async function loadSeed(filename: string): Promise<number> {
  const seedPath = path.join(__dirname, '..', 'seeds', filename);
  const seedContent = fs.readFileSync(seedPath, 'utf-8');
  const data = JSON.parse(seedContent) as Record<string, WriteRequest[]>;

  const items: WriteRequest[] = data[TABLE_NAME];
  if (!items || items.length === 0) {
    console.log(`📦 Cargando ${filename}... 0 items ✅`);
    return 0;
  }

  // BatchWriteItem supports max 25 items per call
  const BATCH_SIZE = 25;
  const batches: WriteRequest[][] = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    batches.push(items.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    let unprocessed: WriteRequest[] = batch;
    let attempts = 0;
    const MAX_RETRIES = 3;

    while (unprocessed.length > 0 && attempts <= MAX_RETRIES) {
      if (attempts > 0) {
        // Exponential backoff: 200ms, 400ms, 800ms
        await sleep(200 * Math.pow(2, attempts - 1));
      }

      const result = await client.send(
        new BatchWriteItemCommand({
          RequestItems: { [TABLE_NAME]: unprocessed },
        }),
      );

      const remaining = result.UnprocessedItems?.[TABLE_NAME];
      unprocessed = remaining && remaining.length > 0 ? remaining : [];
      attempts++;
    }

    if (unprocessed.length > 0) {
      throw new Error(
        `❌ No se pudieron procesar ${unprocessed.length} items de ${filename} tras ${MAX_RETRIES} reintentos`,
      );
    }
  }

  const count = items.length;
  console.log(`📦 Cargando ${filename}... ${count} items ✅`);
  return count;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── main ────────────────────────────────────────────────────────────────────

const SEED_FILES = [
  '01-volatilidad.json',
  '02-horario-mercado.json',
  '03-feriados.json',
  '04-rango-pn.json',
  '05-rango-pj.json',
  '06-segmentos.json',
  '07-spread-liquidez.json',
  '08-spread-clientes.json',
  '09-tc-base.json',
  '10-tc-ventanilla.json',
  '11-cotizaciones.json',
  '12-parametros-sistema.json',
  '13-perfiles.json',
  '14-pantallas.json',
  '15-perfil-accesos.json',
  '16-usuarios.json',
];

export async function main(): Promise<void> {
  await checkConnection();
  console.log('✅ DynamoDB Local conectado en http://localhost:8000');

  await createTable();

  let totalItems = 0;
  for (const file of SEED_FILES) {
    const count = await loadSeed(file);
    totalItems += count;
  }

  console.log(
    `🎉 Setup completado: ${SEED_FILES.length} archivos, ${totalItems} items totales`,
  );
}

main().catch(console.error);
