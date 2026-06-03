import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { dynamo, TABLE } from "./dynamodb.client";
import {
  RangoImporte,
  RangoImporteResponse,
  TipoPersoneria,
} from "../models/rangoImporte.model";

const tipoKey = (tp: TipoPersoneria) => `RANGO_${tp}`;

const mapToResponse = (item: RangoImporte): RangoImporteResponse => ({
  id: item.id,
  tipoPersoneria: item.tipoPersoneria,
  importeMinimo: item.importeMinimo,
  importeMaximo: item.importeMaximo,
  pips: item.pips,
  updatedAt: item.updatedAt,
  updatedBy: item.updatedBy,
});

export const RangoImporteRepository = {

  async listar(tipoPersoneria: TipoPersoneria): Promise<RangoImporteResponse[]> {
    const result = await dynamo.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "#tipo = :tipo",
        ExpressionAttributeNames: { "#tipo": "tipo" },
        ExpressionAttributeValues: { ":tipo": tipoKey(tipoPersoneria) },
      })
    );
    const items = (result.Items as RangoImporte[]).sort(
      (a, b) => a.importeMinimo - b.importeMinimo
    );
    return items.map(mapToResponse);
  },

  async obtenerUltimo(tipoPersoneria: TipoPersoneria): Promise<RangoImporte | null> {
    const result = await dynamo.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "#tipo = :tipo",
        ExpressionAttributeNames: { "#tipo": "tipo" },
        ExpressionAttributeValues: { ":tipo": tipoKey(tipoPersoneria) },
      })
    );
    if (!result.Items || result.Items.length === 0) return null;
    const sorted = (result.Items as RangoImporte[]).sort(
      (a, b) => b.importeMaximo - a.importeMaximo
    );
    return sorted[0];
  },

  async crear(
    tipoPersoneria: TipoPersoneria,
    importeMaximo: number,
    pips: number,
    usuario: string
  ): Promise<RangoImporteResponse> {
    const ultimo = await this.obtenerUltimo(tipoPersoneria);
    const importeMinimo = ultimo ? ultimo.importeMaximo : 0;
    const id = uuidv4().substring(0, 8);
    const now = new Date().toISOString();

    const item: RangoImporte = {
      pk: `${tipoKey(tipoPersoneria)}#${id}`,
      sk: "METADATA",
      tipo: tipoKey(tipoPersoneria) as "RANGO_PN" | "RANGO_PJ",
      id,
      tipoPersoneria,
      importeMinimo,
      importeMaximo,
      pips,
      updatedAt: now,
      updatedBy: usuario,
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    return mapToResponse(item);
  },

  async actualizar(
    tipoPersoneria: TipoPersoneria,
    id: string,
    importeMaximo: number,
    pips: number,
    usuario: string
  ): Promise<RangoImporteResponse | null> {
    const result = await dynamo.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `${tipoKey(tipoPersoneria)}#${id}`, SK: "METADATA" },
      })
    );
    if (!result.Item) return null;

    const now = new Date().toISOString();
    await dynamo.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `${tipoKey(tipoPersoneria)}#${id}`, SK: "METADATA" },
        UpdateExpression:
          "SET importeMaximo = :importeMaximo, pips = :pips, updatedAt = :updatedAt, updatedBy = :updatedBy",
        ExpressionAttributeValues: {
          ":importeMaximo": importeMaximo,
          ":pips": pips,
          ":updatedAt": now,
          ":updatedBy": usuario,
        },
      })
    );

    const item = result.Item as RangoImporte;
    return mapToResponse({ ...item, importeMaximo, pips, updatedAt: now, updatedBy: usuario });
  },

  async eliminar(tipoPersoneria: TipoPersoneria, id: string): Promise<boolean> {
    const result = await dynamo.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `${tipoKey(tipoPersoneria)}#${id}`, SK: "METADATA" },
      })
    );
    if (!result.Item) return false;

    await dynamo.send(
      new DeleteCommand({
        TableName: TABLE,
        Key: { PK: `${tipoKey(tipoPersoneria)}#${id}`, SK: "METADATA" },
      })
    );
    return true;
  },
};
