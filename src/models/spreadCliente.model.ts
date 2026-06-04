export interface SpreadCliente {
  pk: string;                  // SPREAD_CLIENTE#{segmento}
  sk: string;                  // #MONEDA#{moneda}#RANGO#{rangoId}
  segmento: string;
  moneda: string;
  rangoId: string;
  valorSpread: number;
  estado: 'ACTIVO' | 'INACTIVO';
  creadoPor: string;
  fechaCreacion: string;
  modificadoPor?: string;
  fechaModificacion?: string;
}
