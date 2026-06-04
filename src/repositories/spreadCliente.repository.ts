import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { dynamoDb, TABLE } from "./dynamodb.client";
import {
  SpreadCliente,
  SpreadClienteCreateRequest,
  SpreadClienteCreateResult,
  SpreadClienteFiltros,
  SpreadClienteResponse,
  SpreadClienteUpdateRequest,
} from "../models/spreadCliente.model";

const mapToResponse = (item: SpreadCliente): SpreadClienteResponse => ({
  codigoIbs: item.codigoIbs,
  tipoPersoneria: item.tipoPersoneria,
  tipoDocumento: item.tipoDocumento,
  nroDocumento: item.nroDocumento,
  razonSocial: item.razonSocial,
  apellidoPaterno: item.apellidoPaterno,
  apellidoMaterno: item.apellidoMaterno,
  nombres: item.nombres,
  codigoBanca: item.codigoBanca,
  descripcionBanca: item.descripcionBanca,
  spreadPips: item.spreadPips,
  flagMotor: item.flagMotor,
  updatedAt: item.updatedAt,
  updatedBy: item.updatedBy,
});

const aplicarFiltros = (items: SpreadCliente[], filtros: SpreadClienteFiltros): SpreadCliente[] =>
  items.filter((item) => {
    if (filtros.codigoIbs && item.codigoIbs !== filtros.codigoIbs) return false;
    if (filtros.nroDocumento && item.nroDocumento !== filtros.nroDocumento) return false;
    if (filtros.tipoDocumento && item.tipoDocumento !== filtros.tipoDocumento) return false;
    if (filtros.tipoPersoneria && item.tipoPersoneria !== filtros.tipoPersoneria) return false;
    if (filtros.flagMotor && item.flagMotor !== filtros.flagMotor) return false;
    if (filtros.nombreCliente) {
      const query = filtros.nombreCliente.toUpperCase();
      const enRazon = item.razonSocial.toUpperCase().includes(query);
      const enApellido = item.apellidoPaterno.toUpperCase().includes(query);
      const enNombres = item.nombres.toUpperCase().includes(query);
      if (!enRazon && !enApellido && !enNombres) return false;
    }
    return true;
  });

const spreadClientePk = (codigoIbs: string) => `SPREAD_CLIENTE#${codigoIbs}`;

export const SpreadClienteRepository = {
  async buscar(filtros: SpreadClienteFiltros = {}): Promise<SpreadClienteResponse[]> {
    const result = await dynamoDb.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "#tipo = :tipo",
        ExpressionAttributeNames: { "#tipo": "tipo" },
        ExpressionAttributeValues: { ":tipo": "SPREAD_CLIENTE" },
      })
    );

    const items = (result.Items as SpreadCliente[]) ?? [];
    return aplicarFiltros(items, filtros).map(mapToResponse);
  },

  async obtenerPorCodigoIbs(codigoIbs: string): Promise<SpreadClienteResponse | null> {
    const result = await dynamoDb.send(
      new GetCommand({
        TableName: TABLE,
        Key: {
          PK: spreadClientePk(codigoIbs),
          SK: "METADATA",
        },
      })
    );

    if (!result.Item) return null;
    return mapToResponse(result.Item as SpreadCliente);
  },

  async crear(
    data: SpreadClienteCreateRequest,
    usuario: string
  ): Promise<SpreadClienteCreateResult> {
    const existente = await this.obtenerPorCodigoIbs(data.codigoIbs);
    if (existente) return { error: "DUPLICADO" };

    const now = new Date().toISOString();
    const item: SpreadCliente = {
      pk: spreadClientePk(data.codigoIbs),
      sk: "METADATA",
      tipo: "SPREAD_CLIENTE",
      codigoIbs: data.codigoIbs,
      tipoPersoneria: data.tipoPersoneria,
      tipoDocumento: data.tipoDocumento,
      nroDocumento: data.nroDocumento,
      razonSocial: data.razonSocial,
      apellidoPaterno: data.apellidoPaterno,
      apellidoMaterno: data.apellidoMaterno,
      nombres: data.nombres,
      codigoBanca: data.codigoBanca,
      descripcionBanca: data.descripcionBanca,
      spreadPips: data.spreadPips,
      flagMotor: data.flagMotor,
      updatedAt: now,
      updatedBy: usuario,
      gsi2pk: "SPREAD_CLIENTE",
      gsi2sk: data.codigoIbs,
    };

    await dynamoDb.send(
      new PutCommand({
        TableName: TABLE,
        Item: item,
      })
    );

    return { data: mapToResponse(item) };
  },

  async actualizar(
    codigoIbs: string,
    data: SpreadClienteUpdateRequest,
    usuario: string
  ): Promise<SpreadClienteResponse | null> {
    const existente = await this.obtenerPorCodigoIbs(codigoIbs);
    if (!existente) return null;

    const now = new Date().toISOString();
    await dynamoDb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: {
          PK: spreadClientePk(codigoIbs),
          SK: "METADATA",
        },
        UpdateExpression:
          "SET codigoBanca = :codigoBanca, descripcionBanca = :descripcionBanca, spreadPips = :spreadPips, flagMotor = :flagMotor, updatedAt = :updatedAt, updatedBy = :updatedBy",
        ExpressionAttributeValues: {
          ":codigoBanca": data.codigoBanca,
          ":descripcionBanca": data.descripcionBanca,
          ":spreadPips": data.spreadPips,
          ":flagMotor": data.flagMotor,
          ":updatedAt": now,
          ":updatedBy": usuario,
        },
      })
    );

    return {
      ...existente,
      codigoBanca: data.codigoBanca,
      descripcionBanca: data.descripcionBanca,
      spreadPips: data.spreadPips,
      flagMotor: data.flagMotor,
      updatedAt: now,
      updatedBy: usuario,
    };
  },

  async eliminar(codigoIbs: string): Promise<boolean> {
    const existe = await this.obtenerPorCodigoIbs(codigoIbs);
    if (!existe) return false;

    await dynamoDb.send(
      new DeleteCommand({
        TableName: TABLE,
        Key: {
          PK: spreadClientePk(codigoIbs),
          SK: "METADATA",
        },
      })
    );

    return true;
  },
};
