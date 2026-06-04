export interface Segmento {
  pk: string;                  // SEGMENTO#{codigo}
  sk: string;                  // #METADATA
  codigo: string;
  descripcion: string;
  estado: 'ACTIVO' | 'INACTIVO';
  creadoPor: string;
  fechaCreacion: string;
  modificadoPor?: string;
  fechaModificacion?: string;
}
