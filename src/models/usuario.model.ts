export interface Usuario {
  pk: string;                  // USUARIO#{username}
  sk: string;                  // #METADATA
  username: string;
  nombre: string;
  apellido: string;
  email: string;
  perfilId: string;
  estado: 'ACTIVO' | 'INACTIVO';
  creadoPor: string;
  fechaCreacion: string;
  modificadoPor?: string;
  fechaModificacion?: string;
}
