export type TipoPersoneria = "PN" | "PJ";

export interface RangoImporte {
  pk: string;           // RANGO_PN#<id> | RANGO_PJ#<id>
  sk: string;           // METADATA
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
