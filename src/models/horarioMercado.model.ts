export interface HorarioMercado {
  pk: string;
  sk: string;
  tipo: "HORARIO";
  id: string;
  nombre: string;
  horaApertura: string;
  horaCierre: string;
  pips: number;
  updatedAt: string;
  updatedBy: string;
}

export interface HorarioMercadoUpdateRequest {
  pips: number;
  horaApertura: string;
  horaCierre: string;
}

export interface HorarioMercadoResponse {
  id: string;
  nombre: string;
  horaApertura: string;
  horaCierre: string;
  pips: number;
  updatedAt: string;
  updatedBy: string;
}
