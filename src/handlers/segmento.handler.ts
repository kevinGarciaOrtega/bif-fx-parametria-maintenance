import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // TODO: implement segmento handler
  return { statusCode: 200, body: JSON.stringify({ message: 'segmento handler' }) };
};
