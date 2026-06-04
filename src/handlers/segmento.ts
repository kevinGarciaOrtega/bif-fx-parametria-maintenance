// Entry point for serverless-offline / Lambda RIC
// Re-exports named handlers so the handler string uses a single dot:
//   src/handlers/segmento.listar
//   src/handlers/segmento.crear
//   src/handlers/segmento.actualizar
//   src/handlers/segmento.eliminar
export {
  listar,
  crear,
  actualizar,
  eliminar,
} from "./segmento.handler";
