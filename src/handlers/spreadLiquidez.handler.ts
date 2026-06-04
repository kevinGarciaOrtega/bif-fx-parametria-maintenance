import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // TODO: implement spreadLiquidez handler
  return { statusCode: 200, body: JSON.stringify({ message: 'spreadLiquidez handler' }) };
};
