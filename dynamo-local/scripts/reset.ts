import * as readline from 'readline';
import {
  DynamoDBClient,
  DeleteTableCommand,
  DescribeTableCommand,
  ListTablesCommand,
} from '@aws-sdk/client-dynamodb';
import { main } from './setup';

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

// ─── waitForInput ─────────────────────────────────────────────────────────────

async function waitForInput(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(`⚠️  RESET: Esto eliminará TODOS los datos de ${TABLE_NAME}`);
  console.log('Presiona ENTER para continuar o Ctrl+C para cancelar...');

  await new Promise<void>((resolve) => {
    rl.once('line', () => {
      resolve();
    });
  });

  rl.close();
}

// ─── tableExists ─────────────────────────────────────────────────────────────

async function tableExists(): Promise<boolean> {
  const result = await client.send(new ListTablesCommand({}));
  return (result.TableNames ?? []).includes(TABLE_NAME);
}

// ─── deleteTable ─────────────────────────────────────────────────────────────

async function deleteTable(): Promise<void> {
  const exists = await tableExists();

  if (!exists) {
    console.log(`⚠️  Tabla '${TABLE_NAME}' no existe, omitiendo eliminación`);
    return;
  }

  await client.send(new DeleteTableCommand({ TableName: TABLE_NAME }));

  // Poll until table is fully deleted (ResourceNotFoundException)
  while (true) {
    await sleep(500);
    try {
      await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    } catch (err: unknown) {
      const error = err as { name?: string };
      if (error.name === 'ResourceNotFoundException') {
        break;
      }
      throw err;
    }
  }

  console.log(`✅ Tabla '${TABLE_NAME}' eliminada`);
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── reset ───────────────────────────────────────────────────────────────────

async function reset(): Promise<void> {
  await waitForInput();
  await deleteTable();
  await main();
  console.log('✅ Reset completado');
}

reset().catch(console.error);
