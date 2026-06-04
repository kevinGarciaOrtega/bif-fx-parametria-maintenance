export interface RangoImporte {
  pk: string;                  // RANGO#{moneda}
  sk: string;                  // #RANGO#{id}
  moneda: string;
  importeMin: number;
  importeMax: number;
  estado: 'ACTIVO' | 'INACTIVO';
  creadoPor: string;
  fechaCreacion: string;
  modificadoPor?: string;
  fechaModificacion?: string;
}
