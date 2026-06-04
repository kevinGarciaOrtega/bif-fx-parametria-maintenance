export type ParMoneda = "USD_PEN" | "EUR_PEN";
export type SegmentoVentanilla = "EMPLEADO" | "PREMIUM" | "PREFERENCIAL" | "PIZARRA";
export type EstadoVentana = "ACTIVO" | "CERRADO";
export type FuenteTC = "DATATEC" | "BLOOMBERG";

export interface TCBase {
  pk: string;
  sk: string;
  tipo: "TC_BASE";
  parMoneda: ParMoneda;
  monedaOrigen: string;
  monedaDestino: string;
  fuente: FuenteTC;
  fuenteCompra: string;
  valorCompra: number;
  fuenteVenta: string;
  valorVenta: number;
  ultimaActualizacion: string;
  estadoVentana: EstadoVentana;
  esEdicionManual: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface TCBaseAuditoria {
  pk: string;
  sk: string;
  tipo: "TC_BASE_AUDITORIA";
  parMoneda: ParMoneda;
  valorCompraAnterior: number;
  valorCompraNuevo: number;
  valorVentaAnterior: number;
  valorVentaNuevo: number;
  esEdicionManual: boolean;
  motivoEdicion: string;
  updatedAt: string;
  updatedBy: string;
}

export interface TCVentanilla {
  pk: string;
  sk: string;
  tipo: "TC_VENTANILLA";
  parMoneda: ParMoneda;
  segmento: SegmentoVentanilla;
  tcBaseCompraRef: number;
  tcBaseVentaRef: number;
  spreadCompraPips: number;
  spreadVentaPips: number;
  valorCompra: number;
  valorVenta: number;
  enviadoAt: string;
  enviadoBy: string;
}

export interface TCBaseResponse {
  parMoneda: string;
  monedaOrigen: string;
  monedaDestino: string;
  fuente: string;
  fuenteCompra: string;
  valorCompra: number;
  fuenteVenta: string;
  valorVenta: number;
  ultimaActualizacion: string;
  estadoVentana: string;
  esEdicionManual: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface TCBaseAuditoriaResponse {
  timestamp: string;
  valorCompraAnterior: number;
  valorCompraNuevo: number;
  valorVentaAnterior: number;
  valorVentaNuevo: number;
  esEdicionManual: boolean;
  motivoEdicion: string;
  updatedBy: string;
}

export interface TCVentanillaResponse {
  segmento: string;
  tcBaseCompraRef: number;
  tcBaseVentaRef: number;
  spreadCompraPips: number;
  spreadVentaPips: number;
  valorCompra: number;
  valorVenta: number;
  enviadoAt: string;
  enviadoBy: string;
}

export interface TCVentanillaSegmentoRequest {
  segmento: SegmentoVentanilla;
  spreadCompraPips: number;
  spreadVentaPips: number;
}

export interface TCBaseUpdateResult {
  data?: TCBaseResponse;
  error?: "NO_ENCONTRADO";
}

export interface TCVentanillaEnviarResult {
  data?: TCVentanillaResponse[];
  error?: "TC_BASE_NO_ENCONTRADO";
}
