// Entry point for serverless-offline / Lambda RIC
// Re-exports named handlers so the handler string uses a single dot:
//   src/handlers/feriado.listar
//   src/handlers/feriado.crear
//   src/handlers/feriado.eliminar
export { listar, crear, eliminar } from "./feriado.handler";
