export interface SpreadLiquidez {
  pk: string;                  // SPREAD_LIQUIDEZ#{moneda}
  sk: string;                  // #VIGENCIA#{fechaVigencia}
  moneda: string;
  fechaVigencia: string;       // YYYY-MM-DD
  valorSpread: number;
  estado: 'ACTIVO' | 'INACTIVO';
  creadoPor: string;
  fechaCreacion: string;
  modificadoPor?: string;
  fechaModificacion?: string;
}
