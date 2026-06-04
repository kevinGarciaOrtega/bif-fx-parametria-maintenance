import { DynamoDBClient, CreateTableCommand } from '@aws-sdk/client-dynamodb';
import * as tableSchema from '../schema/create-table.json';

const client = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: 'http://localhost:8000',
  credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
});

async function setup() {
  console.log('Creando tabla:', tableSchema.TableName);
  await client.send(new CreateTableCommand(tableSchema as any));
  console.log('Tabla creada exitosamente.');
}

setup().catch(console.error);
