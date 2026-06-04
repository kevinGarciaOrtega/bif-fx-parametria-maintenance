export interface Feriado {
  pk: string;
  sk: string;
  tipo: "FERIADO";
  anio: number;
  fecha: string;
  descripcion: string;
  createdAt: string;
  createdBy: string;
}

export interface FeriadoCreateRequest {
  fecha: string;
  descripcion?: string;
}

export interface FeriadoResponse {
  fecha: string;
  descripcion: string;
  createdAt: string;
  createdBy: string;
}
