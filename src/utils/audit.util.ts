export interface AuditoriaFields {
  updatedAt: string;
  updatedBy: string;
}

export const auditoria = (usuario: string): AuditoriaFields => ({
  updatedAt: new Date().toISOString(),
  updatedBy: usuario,
});

export const getUsuario = (event: {
  requestContext?: { authorizer?: Record<string, unknown> | null };
}): string => {
  const authorizer = event.requestContext?.authorizer;
  if (authorizer && typeof authorizer === "object" && "username" in authorizer) {
    return (authorizer.username as string) ?? "SISTEMA";
  }
  return "SISTEMA";
};
