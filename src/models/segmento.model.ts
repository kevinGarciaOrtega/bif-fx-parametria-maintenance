export type OrigenSegmento = "MANUAL" | "SYNC_IBS";

export interface Segmento {
  pk: string;
  sk: string;
  tipo: "SEGMENTO";
  codigoBanca: string;
  descripcionBanca: string;
  pips: number;
  origen: OrigenSegmento;
  updatedAt: string;
  updatedBy: string;
  gsi2pk: string;
  gsi2sk: string;
}

export interface SegmentoCreateRequest {
  descripcionBanca: string;
  pips?: number;
}

export interface SegmentoUpdateRequest {
  pips: number;
}

export interface SegmentoResponse {
  codigoBanca: string;
  descripcionBanca: string;
  pips: number;
  origen: OrigenSegmento;
  updatedAt: string;
  updatedBy: string;
}

export interface SegmentoCreateResult {
  data?: SegmentoResponse;
  error?: "DUPLICADO";
  descripcionExistente?: string;
}
