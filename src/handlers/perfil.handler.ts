import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // TODO: implement perfil handler
  return { statusCode: 200, body: JSON.stringify({ message: 'perfil handler' }) };
};
