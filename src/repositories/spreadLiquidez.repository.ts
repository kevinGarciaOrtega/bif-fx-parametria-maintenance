import { GetCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo, TABLE } from "./dynamodb.client";
import {
  SpreadLiquidez,
  SpreadLiquidezResponse,
  TipoMercado,
  SentidoOperacion,
} from "../models/spreadLiquidez.model";

const mapToResponse = (item: SpreadLiquidez): SpreadLiquidezResponse => ({
  tipoMercado: item.tipoMercado,
  sentidoOperacion: item.sentidoOperacion,
  pips: item.pips,
  updatedAt: item.updatedAt,
  updatedBy: item.updatedBy,
});

export const SpreadLiquidezRepository = {
  async listar(): Promise<SpreadLiquidezResponse[]> {
    const result = await dynamo.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "#tipo = :tipo",
        ExpressionAttributeNames: { "#tipo": "tipo" },
        ExpressionAttributeValues: { ":tipo": "SPREAD_LIQUIDEZ" },
      })
    );
    if (!result.Items || result.Items.length === 0) return [];

    const items = (result.Items as SpreadLiquidez[]).filter(
      (item): item is SpreadLiquidez =>
        typeof item.tipoMercado === "string" &&
        typeof item.sentidoOperacion === "string"
    );

    return items
      .sort((a, b) => {
        const tipoA = a.tipoMercado ?? "";
        const tipoB = b.tipoMercado ?? "";
        const tipoComp = tipoA.localeCompare(tipoB);
        if (tipoComp !== 0) return tipoComp;
        const sentidoA = a.sentidoOperacion ?? "";
        const sentidoB = b.sentidoOperacion ?? "";
        return sentidoA.localeCompare(sentidoB);
      })
      .map(mapToResponse);
  },

  async obtenerPorClave(
    tipoMercado: TipoMercado,
    sentidoOperacion: SentidoOperacion
  ): Promise<SpreadLiquidezResponse | null> {
    const result = await dynamo.send(
      new GetCommand({
        TableName: TABLE,
        Key: {
          PK: `SPREAD_LIQUIDEZ#${tipoMercado}`,
          SK: `SENTIDO#${sentidoOperacion}`,
        },
      })
    );
    if (!result.Item) return null;
    return mapToResponse(result.Item as SpreadLiquidez);
  },

  async actualizar(
    tipoMercado: TipoMercado,
    sentidoOperacion: SentidoOperacion,
    pips: number,
    usuario: string
  ): Promise<SpreadLiquidezResponse | null> {
    const existente = await this.obtenerPorClave(tipoMercado, sentidoOperacion);
    if (!existente) return null;

    const now = new Date().toISOString();

    await dynamo.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: {
          PK: `SPREAD_LIQUIDEZ#${tipoMercado}`,
          SK: `SENTIDO#${sentidoOperacion}`,
        },
        UpdateExpression:
          "SET pips = :pips, updatedAt = :updatedAt, updatedBy = :updatedBy",
        ExpressionAttributeValues: {
          ":pips": pips,
          ":updatedAt": now,
          ":updatedBy": usuario,
        },
      })
    );

    return {
      ...existente,
      pips,
      updatedAt: now,
      updatedBy: usuario,
    };
  },
};
