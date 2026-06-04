// Entry point for serverless-offline / Lambda RIC
// Re-exports named handlers so the handler string uses a single dot:
//   src/handlers/parametroSistema.listar
//   src/handlers/parametroSistema.actualizar
export { listar, actualizar } from "./parametroSistema.handler";
