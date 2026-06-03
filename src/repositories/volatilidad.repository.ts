import { GetCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo, TABLE } from "./dynamodb.client";
import { Volatilidad, VolatilidadResponse } from "../models/volatilidad.model";

const mapToResponse = (item: Volatilidad): VolatilidadResponse => ({
  id: item.id,
  nombre: item.nombre,
  pips: item.pips,
  estadoActual: item.estadoActual,
  updatedAt: item.updatedAt,
  updatedBy: item.updatedBy,
});

export const VolatilidadRepository = {

  async listarTodos(): Promise<VolatilidadResponse[]> {
    const result = await dynamo.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "#tipo = :tipo",
        ExpressionAttributeNames: { "#tipo": "tipo" },
        ExpressionAttributeValues: { ":tipo": "VOLATILIDAD" },
      })
    );
    return ((result.Items ?? []) as Volatilidad[]).map(mapToResponse);
  },

  async obtenerPorId(id: string): Promise<VolatilidadResponse | null> {
    const result = await dynamo.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `VOLATILIDAD#${id}`, SK: "METADATA" },
      })
    );
    if (!result.Item) return null;
    return mapToResponse(result.Item as Volatilidad);
  },

  async actualizar(
    id: string,
    pips: number,
    estadoActual: boolean,
    usuario: string
  ): Promise<VolatilidadResponse | null> {
    const existe = await this.obtenerPorId(id);
    if (!existe) return null;

    const now = new Date().toISOString();

    await dynamo.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `VOLATILIDAD#${id}`, SK: "METADATA" },
        UpdateExpression:
          "SET pips = :pips, estadoActual = :estadoActual, updatedAt = :updatedAt, updatedBy = :updatedBy",
        ExpressionAttributeValues: {
          ":pips": pips,
          ":estadoActual": estadoActual,
          ":updatedAt": now,
          ":updatedBy": usuario,
        },
      })
    );

    return { ...existe, pips, estadoActual, updatedAt: now, updatedBy: usuario };
  },
};
