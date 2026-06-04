export interface ParametroSistema {
  pk: string;                  // PARAMETRO#{codigo}
  sk: string;                  // #METADATA
  codigo: string;
  descripcion: string;
  valor: string;
  tipo: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
  estado: 'ACTIVO' | 'INACTIVO';
  creadoPor: string;
  fechaCreacion: string;
  modificadoPor?: string;
  fechaModificacion?: string;
}
