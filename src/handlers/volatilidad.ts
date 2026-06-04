// Entry point for serverless-offline / Lambda RIC
// Re-exports named handlers so the handler string uses a single dot:
//   src/handlers/volatilidad.listar
//   src/handlers/volatilidad.actualizar
export { listar, actualizar } from "./volatilidad.handler";
