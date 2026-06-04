import { APIGatewayProxyResult } from "aws-lambda";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": true,
};

export const ok = (body: object): APIGatewayProxyResult => ({
  statusCode: 200,
  headers,
  body: JSON.stringify(body),
});

export const created = (body: object): APIGatewayProxyResult => ({
  statusCode: 201,
  headers,
  body: JSON.stringify(body),
});

export const noContent = (): APIGatewayProxyResult => ({
  statusCode: 204,
  headers,
  body: "",
});

export const badRequest = (
  codigo: string,
  mensaje: string
): APIGatewayProxyResult => ({
  statusCode: 400,
  headers,
  body: JSON.stringify({
    codigo,
    mensaje,
    timestamp: new Date().toISOString(),
  }),
});

export const notFound = (
  codigo: string,
  mensaje: string
): APIGatewayProxyResult => ({
  statusCode: 404,
  headers,
  body: JSON.stringify({
    codigo,
    mensaje,
    timestamp: new Date().toISOString(),
  }),
});

export const conflict = (
  codigo: string,
  mensaje: string
): APIGatewayProxyResult => ({
  statusCode: 409,
  headers,
  body: JSON.stringify({
    codigo,
    mensaje,
    timestamp: new Date().toISOString(),
  }),
});

export const serverError = (error: unknown): APIGatewayProxyResult => {
  console.error("[ERROR]", error);
  return {
    statusCode: 500,
    headers,
    body: JSON.stringify({
      codigo: "FX-MNT-500",
      mensaje: "Error interno del servidor",
      timestamp: new Date().toISOString(),
    }),
  };
};
