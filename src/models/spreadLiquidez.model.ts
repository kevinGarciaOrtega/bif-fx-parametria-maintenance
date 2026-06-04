export type TipoMercado = "HORARIO_MERCADO_ABIERTO" | "HORARIO_MERCADO_CERRADO";
export type SentidoOperacion = "BANCO_COMPRA_DOLARES" | "BANCO_VENDE_DOLARES";

export interface SpreadLiquidez {
  pk: string;
  sk: string;
  tipo: "SPREAD_LIQUIDEZ";
  tipoMercado: TipoMercado;
  sentidoOperacion: SentidoOperacion;
  pips: number;
  updatedAt: string;
  updatedBy: string;
}

export interface SpreadLiquidezUpdateRequest {
  pips: number;
}

export interface SpreadLiquidezResponse {
  tipoMercado: TipoMercado;
  sentidoOperacion: SentidoOperacion;
  pips: number;
  updatedAt: string;
  updatedBy: string;
}
