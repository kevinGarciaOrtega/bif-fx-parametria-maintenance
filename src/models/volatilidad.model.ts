export interface Volatilidad {
  pk: string;           // VOLATILIDAD#<id>
  sk: string;           // METADATA
  tipo: "VOLATILIDAD";
  id: string;
  nombre: string;
  pips: number;
  estadoActual: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface VolatilidadUpdateRequest {
  pips: number;
  estadoActual: boolean;
}

export interface VolatilidadResponse {
  id: string;
  nombre: string;
  pips: number;
  estadoActual: boolean;
  updatedAt: string;
  updatedBy: string;
}
