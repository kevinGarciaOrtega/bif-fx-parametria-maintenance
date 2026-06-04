export interface TipoCambio {
  pk: string;                  // TIPO_CAMBIO#{moneda}
  sk: string;                  // #FECHA#{fecha}#HORA#{hora}
  moneda: string;
  fecha: string;               // YYYY-MM-DD
  hora: string;                // HH:mm
  compra: number;
  venta: number;
  fuente: string;
  estado: 'ACTIVO' | 'INACTIVO';
  creadoPor: string;
  fechaCreacion: string;
  modificadoPor?: string;
  fechaModificacion?: string;
}
