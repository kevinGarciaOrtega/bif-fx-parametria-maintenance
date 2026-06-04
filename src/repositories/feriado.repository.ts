import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { dynamo, TABLE } from "./dynamodb.client";
import { Feriado, FeriadoResponse } from "../models/feriado.model";

const mapToResponse = (item: Feriado): FeriadoResponse => ({
  fecha: item.fecha,
  descripcion: item.descripcion,
  createdAt: item.createdAt,
  createdBy: item.createdBy,
});

const extraerAnio = (fecha: string): number =>
  new Date(fecha + "T00:00:00").getFullYear();

export const FeriadoRepository = {

  async listarPorAnio(anio: number): Promise<FeriadoResponse[]> {
    const result = await dynamo.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": `FERIADO#${anio}`,
          ":sk": "FECHA#",
        },
      })
    );
    if (!result.Items || result.Items.length === 0) return [];
    return (result.Items as Feriado[])
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map(mapToResponse);
  },

  async existeFeriado(fecha: string): Promise<boolean> {
    const anio = extraerAnio(fecha);
    const result = await dynamo.send(
      new GetCommand({
        TableName: TABLE,
        Key: {
          PK: `FERIADO#${anio}`,
          SK: `FECHA#${fecha}`,
        },
      })
    );
    return !!result.Item;
  },

  async crear(
    fecha: string,
    descripcion: string,
    usuario: string
  ): Promise<FeriadoResponse | null> {
    const existe = await this.existeFeriado(fecha);
    if (existe) return null;

    const anio = extraerAnio(fecha);
    const now = new Date().toISOString();

    const item: Feriado = {
      pk: `FERIADO#${anio}`,
      sk: `FECHA#${fecha}`,
      tipo: "FERIADO",
      anio,
      fecha,
      descripcion,
      createdAt: now,
      createdBy: usuario,
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    return mapToResponse(item);
  },

  async eliminar(fecha: string): Promise<boolean> {
    const existe = await this.existeFeriado(fecha);
    if (!existe) return false;

    const anio = extraerAnio(fecha);

    await dynamo.send(
      new DeleteCommand({
        TableName: TABLE,
        Key: {
          PK: `FERIADO#${anio}`,
          SK: `FECHA#${fecha}`,
        },
      })
    );
    return true;
  },
};
