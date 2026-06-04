import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // TODO: implement rangoImporte handler
  return { statusCode: 200, body: JSON.stringify({ message: 'rangoImporte handler' }) };
};
