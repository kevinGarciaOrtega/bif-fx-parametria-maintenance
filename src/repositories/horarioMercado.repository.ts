import { GetCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo, TABLE } from "./dynamodb.client";
import { HorarioMercado, HorarioMercadoResponse } from "../models/horarioMercado.model";

const mapToResponse = (item: HorarioMercado): HorarioMercadoResponse => ({
  id: item.id,
  nombre: item.nombre,
  horaApertura: item.horaApertura,
  horaCierre: item.horaCierre,
  pips: item.pips,
  updatedAt: item.updatedAt,
  updatedBy: item.updatedBy,
});

export const HorarioMercadoRepository = {

  async listarTodos(): Promise<HorarioMercadoResponse[]> {
    const result = await dynamo.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "#tipo = :tipo",
        ExpressionAttributeNames: { "#tipo": "tipo" },
        ExpressionAttributeValues: { ":tipo": "HORARIO" },
      })
    );
    if (!result.Items || result.Items.length === 0) return [];
    return (result.Items as HorarioMercado[]).map(mapToResponse);
  },

  async obtenerPorId(id: string): Promise<HorarioMercadoResponse | null> {
    const result = await dynamo.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `HORARIO#${id}`, SK: "METADATA" },
      })
    );
    if (!result.Item) return null;
    return mapToResponse(result.Item as HorarioMercado);
  },

  async actualizar(
    id: string,
    pips: number,
    horaApertura: string,
    horaCierre: string,
    usuario: string
  ): Promise<HorarioMercadoResponse | null> {
    const existente = await this.obtenerPorId(id);
    if (!existente) return null;

    const now = new Date().toISOString();

    await dynamo.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `HORARIO#${id}`, SK: "METADATA" },
        UpdateExpression:
          "SET pips = :pips, horaApertura = :horaApertura, horaCierre = :horaCierre, updatedAt = :updatedAt, updatedBy = :updatedBy",
        ExpressionAttributeValues: {
          ":pips": pips,
          ":horaApertura": horaApertura,
          ":horaCierre": horaCierre,
          ":updatedAt": now,
          ":updatedBy": usuario,
        },
      })
    );

    return { ...existente, pips, horaApertura, horaCierre, updatedAt: now, updatedBy: usuario };
  },
};
