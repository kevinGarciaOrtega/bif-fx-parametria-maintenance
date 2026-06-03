export type SegmentoBanca = "EMPLEADO" | "PREMIUM" | "PREFERENCIAL" | "PIZARRA";
export type EstadoVentana = "ACTIVO" | "CERRADO";
export type FuenteTC = "DATATEC" | "BLOOMBERG";

export interface TCBase {
  pk: string;              // TC_BASE#<parMoneda>
  sk: string;              // ACTIVO | AUDITORIA#<timestamp>
  tipo: "TC_BASE" | "TC_BASE_AUDITORIA";
  parMoneda: string;
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

export interface TCBaseUpdateRequest {
  valorCompra: number;
  valorVenta: number;
  motivoEdicion: string;
}

export interface TCBaseResponse {
  parMoneda: string;
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

export interface TCVentanillaSegmento {
  pk: string;              // TC_VENTANILLA#<parMoneda>
  sk: string;              // SEGMENTO#<segmento>
  tipo: "TC_VENTANILLA";
  parMoneda: string;
  segmento: SegmentoBanca;
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
  segmento: SegmentoBanca;
  spreadCompraPips: number;
  spreadVentaPips: number;
}

export interface TCVentanillaEnviarRequest {
  segmentos: TCVentanillaSegmentoRequest[];
}
