// Entry point for serverless-offline / Lambda RIC
// Re-exports named handlers so the handler string uses a single dot:
//   src/handlers/horarioMercado.listar
//   src/handlers/horarioMercado.actualizar
export { listar, actualizar } from "./horarioMercado.handler";
