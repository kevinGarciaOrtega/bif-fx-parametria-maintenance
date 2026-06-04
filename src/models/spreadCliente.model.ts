export type FlagMotor = "ACTIVO" | "INACTIVO";

export interface SpreadCliente {
  pk: string; // SPREAD_CLIENTE#<codigoIbs>
  sk: string; // METADATA
  tipo: "SPREAD_CLIENTE";
  codigoIbs: string;
  tipoPersoneria: string;
  tipoDocumento: string;
  nroDocumento: string;
  razonSocial: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombres: string;
  codigoBanca: string;
  descripcionBanca: string;
  spreadPips: number;
  flagMotor: FlagMotor;
  updatedAt: string;
  updatedBy: string;
  gsi2pk: string; // SPREAD_CLIENTE
  gsi2sk: string; // codigoIbs
}

export interface SpreadClienteCreateRequest {
  codigoIbs: string;
  tipoPersoneria: string;
  tipoDocumento: string;
  nroDocumento: string;
  razonSocial: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombres: string;
  codigoBanca: string;
  descripcionBanca: string;
  spreadPips: number;
  flagMotor: FlagMotor;
}

export interface SpreadClienteUpdateRequest {
  codigoBanca: string;
  descripcionBanca: string;
  spreadPips: number;
  flagMotor: FlagMotor;
}

export interface SpreadClienteResponse {
  codigoIbs: string;
  tipoPersoneria: string;
  tipoDocumento: string;
  nroDocumento: string;
  razonSocial: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombres: string;
  codigoBanca: string;
  descripcionBanca: string;
  spreadPips: number;
  flagMotor: FlagMotor;
  updatedAt: string;
  updatedBy: string;
}

export interface SpreadClienteFiltros {
  codigoIbs?: string;
  nroDocumento?: string;
  tipoDocumento?: string;
  tipoPersoneria?: string;
  flagMotor?: string;
  nombreCliente?: string;
}

export interface SpreadClienteCreateResult {
  data?: SpreadClienteResponse;
  error?: "DUPLICADO";
}
