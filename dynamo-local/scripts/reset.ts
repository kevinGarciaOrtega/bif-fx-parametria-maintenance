import { DynamoDBClient, DeleteTableCommand, CreateTableCommand } from '@aws-sdk/client-dynamodb';
import * as tableSchema from '../schema/create-table.json';

const client = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: 'http://localhost:8000',
  credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
});

async function reset() {
  console.log('Eliminando tabla:', tableSchema.TableName);
  await client.send(new DeleteTableCommand({ TableName: tableSchema.TableName })).catch(() => {
    console.log('La tabla no existía, continuando...');
  });

  console.log('Recreando tabla:', tableSchema.TableName);
  await client.send(new CreateTableCommand(tableSchema as any));
  console.log('Reset completado.');
}

reset().catch(console.error);
