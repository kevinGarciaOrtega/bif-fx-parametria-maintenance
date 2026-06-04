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
  RangoImporteCreateResult,
  RangoImporteResponse,
  TipoPersoneria,
} from "../models/rangoImporte.model";

const tipoKey = (tp: TipoPersoneria): "RANGO_PN" | "RANGO_PJ" =>
  tp === "PN" ? "RANGO_PN" : "RANGO_PJ";

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
    const tipo = tipoKey(tipoPersoneria);
    const result = await dynamo.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "#tipo = :tipo",
        ExpressionAttributeNames: { "#tipo": "tipo" },
        ExpressionAttributeValues: { ":tipo": tipo },
      })
    );
    if (!result.Items || result.Items.length === 0) return [];
    return (result.Items as RangoImporte[])
      .sort((a, b) => a.importeMinimo - b.importeMinimo)
      .map(mapToResponse);
  },

  async obtenerTodos(tipoPersoneria: TipoPersoneria): Promise<RangoImporte[]> {
    const tipo = tipoKey(tipoPersoneria);
    const result = await dynamo.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "#tipo = :tipo",
        ExpressionAttributeNames: { "#tipo": "tipo" },
        ExpressionAttributeValues: { ":tipo": tipo },
      })
    );
    if (!result.Items || result.Items.length === 0) return [];
    return result.Items as RangoImporte[];
  },

  async obtenerPorId(
    tipoPersoneria: TipoPersoneria,
    id: string
  ): Promise<RangoImporteResponse | null> {
    const tipo = tipoKey(tipoPersoneria);
    const result = await dynamo.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `${tipo}#${id}`, SK: "METADATA" },
      })
    );
    if (!result.Item) return null;
    return mapToResponse(result.Item as RangoImporte);
  },

  async crear(
    tipoPersoneria: TipoPersoneria,
    importeMaximo: number,
    pips: number,
    usuario: string
  ): Promise<RangoImporteCreateResult> {
    const todos = await this.obtenerTodos(tipoPersoneria);
    const importeMinimo =
      todos.length > 0
        ? Math.max(...todos.map((r) => r.importeMaximo))
        : 0;

    if (importeMaximo <= importeMinimo) {
      return { error: "IMPORTE_INVALIDO", importeMinimoActual: importeMinimo };
    }

    const tipo = tipoKey(tipoPersoneria);
    const id = uuidv4().replace(/-/g, "").substring(0, 8);
    const now = new Date().toISOString();

    const item: RangoImporte = {
      pk: `${tipo}#${id}`,
      sk: "METADATA",
      tipo,
      id,
      tipoPersoneria,
      importeMinimo,
      importeMaximo,
      pips,
      updatedAt: now,
      updatedBy: usuario,
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    return { data: mapToResponse(item) };
  },

  async actualizar(
    tipoPersoneria: TipoPersoneria,
    id: string,
    importeMaximo: number,
    pips: number,
    usuario: string
  ): Promise<RangoImporteResponse | null> {
    const existente = await this.obtenerPorId(tipoPersoneria, id);
    if (!existente) return null;

    const tipo = tipoKey(tipoPersoneria);
    const now = new Date().toISOString();

    await dynamo.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `${tipo}#${id}`, SK: "METADATA" },
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

    return { ...existente, importeMaximo, pips, updatedAt: now, updatedBy: usuario };
  },

  async eliminar(tipoPersoneria: TipoPersoneria, id: string): Promise<boolean> {
    const tipo = tipoKey(tipoPersoneria);
    const result = await dynamo.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `${tipo}#${id}`, SK: "METADATA" },
      })
    );
    if (!result.Item) return false;

    await dynamo.send(
      new DeleteCommand({
        TableName: TABLE,
        Key: { PK: `${tipo}#${id}`, SK: "METADATA" },
      })
    );
    return true;
  },
};
