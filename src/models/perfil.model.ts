export interface Perfil {
  pk: string;                  // PERFIL#{codigo}
  sk: string;                  // #METADATA
  codigo: string;
  descripcion: string;
  permisos: string[];
  estado: 'ACTIVO' | 'INACTIVO';
  creadoPor: string;
  fechaCreacion: string;
  modificadoPor?: string;
  fechaModificacion?: string;
}
