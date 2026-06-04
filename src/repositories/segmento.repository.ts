import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { dynamo, TABLE } from "./dynamodb.client";
import {
  Segmento,
  SegmentoCreateResult,
  SegmentoResponse,
} from "../models/segmento.model";

const mapToResponse = (item: Segmento): SegmentoResponse => ({
  codigoBanca: item.codigoBanca,
  descripcionBanca: item.descripcionBanca,
  pips: item.pips,
  origen: item.origen,
  updatedAt: item.updatedAt,
  updatedBy: item.updatedBy,
});

const calcularSiguienteCodigo = (segmentos: Segmento[]): string => {
  if (segmentos.length === 0) return "0001";
  const maxCodigo = Math.max(
    ...segmentos.map((s) => parseInt(s.codigoBanca, 10))
  );
  return String(maxCodigo + 1).padStart(4, "0");
};

export const SegmentoRepository = {
  async obtenerTodos(): Promise<Segmento[]> {
    const result = await dynamo.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "#tipo = :tipo",
        ExpressionAttributeNames: { "#tipo": "tipo" },
        ExpressionAttributeValues: { ":tipo": "SEGMENTO" },
      })
    );
    if (!result.Items || result.Items.length === 0) return [];
    return result.Items as Segmento[];
  },

  async buscar(descripcion?: string): Promise<SegmentoResponse[]> {
    const todos = await this.obtenerTodos();
    let filtrados = todos;

    if (descripcion && descripcion.trim() !== "") {
      const filtro = descripcion.toUpperCase();
      filtrados = todos.filter((s) =>
        s.descripcionBanca.toUpperCase().includes(filtro)
      );
    }

    return filtrados
      .sort((a, b) => a.codigoBanca.localeCompare(b.codigoBanca))
      .map(mapToResponse);
  },

  async obtenerPorCodigo(codigoBanca: string): Promise<SegmentoResponse | null> {
    const result = await dynamo.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `SEGMENTO#${codigoBanca}`, SK: "METADATA" },
      })
    );
    if (!result.Item) return null;
    return mapToResponse(result.Item as Segmento);
  },

  async crear(
    descripcionBanca: string,
    pips: number,
    usuario: string
  ): Promise<SegmentoCreateResult> {
    const todos = await this.obtenerTodos();
    const descripcionUpper = descripcionBanca.toUpperCase();

    const duplicado = todos.find(
      (s) => s.descripcionBanca.toUpperCase() === descripcionUpper
    );
    if (duplicado) {
      return { error: "DUPLICADO", descripcionExistente: duplicado.descripcionBanca };
    }

    const codigoBanca = calcularSiguienteCodigo(todos);
    const now = new Date().toISOString();

    const item: Segmento = {
      pk: `SEGMENTO#${codigoBanca}`,
      sk: "METADATA",
      tipo: "SEGMENTO",
      codigoBanca,
      descripcionBanca: descripcionUpper,
      pips,
      origen: "MANUAL",
      updatedAt: now,
      updatedBy: usuario,
      gsi2pk: "SEGMENTO",
      gsi2sk: descripcionUpper,
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    return { data: mapToResponse(item) };
  },

  async actualizar(
    codigoBanca: string,
    pips: number,
    usuario: string
  ): Promise<SegmentoResponse | null> {
    const existente = await this.obtenerPorCodigo(codigoBanca);
    if (!existente) return null;

    const now = new Date().toISOString();

    await dynamo.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `SEGMENTO#${codigoBanca}`, SK: "METADATA" },
        UpdateExpression:
          "SET pips = :pips, updatedAt = :updatedAt, updatedBy = :updatedBy",
        ExpressionAttributeValues: {
          ":pips": pips,
          ":updatedAt": now,
          ":updatedBy": usuario,
        },
      })
    );

    return { ...existente, pips, updatedAt: now, updatedBy: usuario };
  },

  async eliminar(codigoBanca: string): Promise<boolean> {
    const result = await dynamo.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `SEGMENTO#${codigoBanca}`, SK: "METADATA" },
      })
    );
    if (!result.Item) return false;

    await dynamo.send(
      new DeleteCommand({
        TableName: TABLE,
        Key: { PK: `SEGMENTO#${codigoBanca}`, SK: "METADATA" },
      })
    );

    return true;
  },
};
