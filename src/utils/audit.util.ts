import { APIGatewayProxyEvent } from "aws-lambda";

export interface AuditoriaFields {
  updatedAt: string;
  updatedBy: string;
}

export const auditoria = (usuario: string): AuditoriaFields => ({
  updatedAt: new Date().toISOString(),
  updatedBy: usuario,
});

export const getUsuario = (event: APIGatewayProxyEvent): string => {
  const authorizer = event.requestContext?.authorizer;
  if (authorizer && typeof authorizer === "object" && "username" in authorizer) {
    return String(authorizer["username"]) ?? "SISTEMA";
  }
  return "SISTEMA";
};
