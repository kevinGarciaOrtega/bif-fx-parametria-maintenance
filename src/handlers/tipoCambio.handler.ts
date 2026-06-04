import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // TODO: implement tipoCambio handler
  return { statusCode: 200, body: JSON.stringify({ message: 'tipoCambio handler' }) };
};
