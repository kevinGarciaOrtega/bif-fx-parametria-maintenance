export interface Segmento {
  pk: string;           // SEGMENTO#<codigoBanca>
  sk: string;           // METADATA
  tipo: "SEGMENTO";
  codigoBanca: string;
  descripcionBanca: string;
  pips: number;
  origen: "MANUAL" | "SYNC_IBS";
  updatedAt: string;
  updatedBy: string;
  gsi2pk: string;       // SEGMENTO
  gsi2sk: string;       // descripcionBanca
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
  origen: string;
  updatedAt: string;
  updatedBy: string;
}
