export type TipoValorParametro = "INTEGER" | "DECIMAL" | "STRING" | "TIME";

export interface ParametroSistema {
  pk: string;
  sk: string;
  tipo: "PARAMETRO";
  grupo: string;
  clave: string;
  nombre: string;
  valor: string;
  tipoValor: TipoValorParametro;
  updatedAt: string;
  updatedBy: string;
}

export interface ParametroSistemaUpdateRequest {
  valor: string;
}

export interface ParametroSistemaItemResponse {
  clave: string;
  nombre: string;
  valor: string;
  tipoValor: TipoValorParametro;
  updatedAt: string;
  updatedBy: string;
}

export interface ParametroSistemaGrupoResponse {
  grupo: string;
  parametros: ParametroSistemaItemResponse[];
}

export interface ParametroSistemaResponse {
  grupo: string;
  clave: string;
  nombre: string;
  valor: string;
  tipoValor: TipoValorParametro;
  updatedAt: string;
  updatedBy: string;
}
