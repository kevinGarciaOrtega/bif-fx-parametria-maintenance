import { GetCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo, TABLE } from "./dynamodb.client";
import {
  ParametroSistema,
  ParametroSistemaGrupoResponse,
  ParametroSistemaItemResponse,
  ParametroSistemaResponse,
} from "../models/parametroSistema.model";

const getGrupo = (item: ParametroSistema): string => {
  if (item.grupo) return item.grupo;
  return (item.pk ?? (item as any).PK)?.split("#")[1] ?? "";
};

const getClave = (item: ParametroSistema): string => {
  if (item.clave) return item.clave;
  return (item.sk ?? (item as any).SK)?.split("#")[1] ?? "";
};

const mapToItem = (item: ParametroSistema): ParametroSistemaItemResponse => ({
  clave: getClave(item),
  nombre: item.nombre ?? "",
  valor: item.valor ?? "",
  tipoValor: item.tipoValor ?? "STRING",
  updatedAt: item.updatedAt ?? "",
  updatedBy: item.updatedBy ?? "",
});

const agrupar = (items: ParametroSistema[]): ParametroSistemaGrupoResponse[] => {
  const map = new Map<string, ParametroSistemaItemResponse[]>();
  for (const rawItem of items) {
    if (rawItem.tipo !== "PARAMETRO") continue;
    const grupo = getGrupo(rawItem);
    if (!grupo) continue;

    const item = {
      ...rawItem,
      grupo,
      clave: getClave(rawItem),
    } as ParametroSistema;

    if (!item.clave) continue;

    if (!map.has(grupo)) map.set(grupo, []);
    map.get(grupo)!.push(mapToItem(item));
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([grupo, parametros]) => ({
      grupo,
      parametros: parametros.sort((a, b) => a.clave.localeCompare(b.clave)),
    }));
};

export const ParametroSistemaRepository = {
  async listar(grupo?: string): Promise<ParametroSistemaGrupoResponse[]> {
    const filterExp = grupo ? "#tipo = :tipo AND PK = :pk" : "#tipo = :tipo";

    const expValues: Record<string, string> = { ":tipo": "PARAMETRO" };
    if (grupo) expValues[":pk"] = `PARAMETRO#${grupo}`;

    const result = await dynamo.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: filterExp,
        ExpressionAttributeNames: { "#tipo": "tipo" },
        ExpressionAttributeValues: expValues,
      })
    );

    if (!result.Items || result.Items.length === 0) return [];
    return agrupar(result.Items as ParametroSistema[]);
  },

  async obtenerPorClave(
    grupo: string,
    clave: string
  ): Promise<ParametroSistema | null> {
    const result = await dynamo.send(
      new GetCommand({
        TableName: TABLE,
        Key: {
          PK: `PARAMETRO#${grupo}`,
          SK: `PARAM#${clave}`,
        },
      })
    );
    if (!result.Item) return null;
    return result.Item as ParametroSistema;
  },

  async actualizar(
    grupo: string,
    clave: string,
    valor: string,
    usuario: string
  ): Promise<ParametroSistemaResponse | null> {
    const existente = await this.obtenerPorClave(grupo, clave);
    if (!existente) return null;

    const now = new Date().toISOString();

    await dynamo.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: {
          PK: `PARAMETRO#${grupo}`,
          SK: `PARAM#${clave}`,
        },
        UpdateExpression:
          "SET #valor = :valor, updatedAt = :updatedAt, updatedBy = :updatedBy",
        ExpressionAttributeNames: { "#valor": "valor" },
        ExpressionAttributeValues: {
          ":valor": valor,
          ":updatedAt": now,
          ":updatedBy": usuario,
        },
      })
    );

    return {
      grupo: existente.grupo,
      clave: existente.clave,
      nombre: existente.nombre,
      valor,
      tipoValor: existente.tipoValor,
      updatedAt: now,
      updatedBy: usuario,
    };
  },
};
