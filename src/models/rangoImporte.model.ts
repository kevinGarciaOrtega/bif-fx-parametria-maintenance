export type TipoPersoneria = "PN" | "PJ";

export interface RangoImporte {
  pk: string;
  sk: string;
  tipo: "RANGO_PN" | "RANGO_PJ";
  id: string;
  tipoPersoneria: TipoPersoneria;
  importeMinimo: number;
  importeMaximo: number;
  pips: number;
  updatedAt: string;
  updatedBy: string;
}

export interface RangoImporteCreateRequest {
  importeMaximo: number;
  pips: number;
}

export interface RangoImporteUpdateRequest {
  importeMaximo: number;
  pips: number;
}

export interface RangoImporteResponse {
  id: string;
  tipoPersoneria: TipoPersoneria;
  importeMinimo: number;
  importeMaximo: number;
  pips: number;
  updatedAt: string;
  updatedBy: string;
}

export interface RangoImporteCreateResult {
  data?: RangoImporteResponse;
  error?: "IMPORTE_INVALIDO";
  importeMinimoActual?: number;
}
