import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: 'http://localhost:8000',
  credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
});

async function verify() {
  const result = await client.send(new ListTablesCommand({}));
  console.log('Tablas existentes en DynamoDB Local:', result.TableNames);
}

verify().catch(console.error);
