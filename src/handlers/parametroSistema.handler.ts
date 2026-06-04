import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // TODO: implement parametroSistema handler
  return { statusCode: 200, body: JSON.stringify({ message: 'parametroSistema handler' }) };
};
