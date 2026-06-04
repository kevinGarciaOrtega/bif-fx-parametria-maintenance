import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Solo usa endpoint local si DYNAMO_ENDPOINT está explícitamente definido
const dynamoEndpoint = process.env.DYNAMO_ENDPOINT;
const isLocal = !!dynamoEndpoint;

const client = new DynamoDBClient({
  region: process.env.AWS_REGION ?? "us-east-1",
  ...(isLocal && {
    endpoint: dynamoEndpoint,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "local",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "local",
    },
  }),
});

export const dynamo = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
});

/** Alias para compatibilidad con repositorios que importan dynamoDb */
export const dynamoDb = dynamo;

// UNA SOLA TABLA — Single Table Design
export const TABLE = process.env.DYNAMO_TABLE ?? "tablero-dev";
