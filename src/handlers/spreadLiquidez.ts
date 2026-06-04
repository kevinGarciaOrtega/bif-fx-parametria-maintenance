// Entry point for serverless-offline / Lambda RIC
// Re-exports named handlers so the handler string uses a single dot:
//   src/handlers/spreadLiquidez.listar
//   src/handlers/spreadLiquidez.actualizar
export { listar, actualizar } from "./spreadLiquidez.handler";
