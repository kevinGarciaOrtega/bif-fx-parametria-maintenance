import {
  BatchWriteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { dynamo, TABLE } from "./dynamodb.client";
import {
  TCBase,
  TCBaseAuditoria,
  TCBaseAuditoriaResponse,
  TCBaseResponse,
  TCBaseUpdateResult,
  TCVentanilla,
  TCVentanillaEnviarResult,
  TCVentanillaResponse,
  TCVentanillaSegmentoRequest,
  ParMoneda,
} from "../models/tipoCambio.model";

const mapTCBaseToResponse = (item: TCBase): TCBaseResponse => ({
  parMoneda: item.parMoneda,
  monedaOrigen: item.monedaOrigen,
  monedaDestino: item.monedaDestino,
  fuente: item.fuente,
  fuenteCompra: item.fuenteCompra,
  valorCompra: item.valorCompra,
  fuenteVenta: item.fuenteVenta,
  valorVenta: item.valorVenta,
  ultimaActualizacion: item.ultimaActualizacion,
  estadoVentana: item.estadoVentana,
  esEdicionManual: item.esEdicionManual,
  updatedAt: item.updatedAt,
  updatedBy: item.updatedBy,
});

const mapAuditoriaToResponse = (item: TCBaseAuditoria): TCBaseAuditoriaResponse => ({
  timestamp: item.sk.replace("AUDITORIA#", ""),
  valorCompraAnterior: item.valorCompraAnterior,
  valorCompraNuevo: item.valorCompraNuevo,
  valorVentaAnterior: item.valorVentaAnterior,
  valorVentaNuevo: item.valorVentaNuevo,
  esEdicionManual: item.esEdicionManual,
  motivoEdicion: item.motivoEdicion,
  updatedBy: item.updatedBy,
});

const mapVentanillaToResponse = (item: TCVentanilla): TCVentanillaResponse => ({
  segmento: item.segmento,
  tcBaseCompraRef: item.tcBaseCompraRef,
  tcBaseVentaRef: item.tcBaseVentaRef,
  spreadCompraPips: item.spreadCompraPips,
  spreadVentaPips: item.spreadVentaPips,
  valorCompra: item.valorCompra,
  valorVenta: item.valorVenta,
  enviadoAt: item.enviadoAt,
  enviadoBy: item.enviadoBy,
});

const calcularValor = (tcBase: number, spreadPips: number): number =>
  Math.round((tcBase + spreadPips / 10000) * 1000000) / 1000000;

export const TipoCambioRepository = {
  async listarBase(): Promise<TCBaseResponse[]> {
    const result = await dynamo.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "#tipo = :tipo AND SK = :sk",
        ExpressionAttributeNames: { "#tipo": "tipo" },
        ExpressionAttributeValues: { ":tipo": "TC_BASE", ":sk": "ACTIVO" },
      })
    );
    if (!result.Items || result.Items.length === 0) return [];
    return (result.Items as TCBase[]).map(mapTCBaseToResponse);
  },

  async obtenerBaseActivo(parMoneda: ParMoneda): Promise<TCBase | null> {
    const result = await dynamo.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `TC_BASE#${parMoneda}`, SK: "ACTIVO" },
      })
    );
    if (!result.Item) return null;
    return result.Item as TCBase;
  },

  async actualizarBase(
    parMoneda: ParMoneda,
    valorCompra: number,
    valorVenta: number,
    motivoEdicion: string,
    usuario: string
  ): Promise<TCBaseUpdateResult> {
    const actual = await this.obtenerBaseActivo(parMoneda);
    if (!actual) return { error: "NO_ENCONTRADO" };

    const now = new Date().toISOString();

    await dynamo.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `TC_BASE#${parMoneda}`, SK: "ACTIVO" },
        UpdateExpression:
          "SET valorCompra = :vc, valorVenta = :vv, esEdicionManual = :manual, " +
          "ultimaActualizacion = :ua, updatedAt = :updatedAt, updatedBy = :updatedBy",
        ExpressionAttributeValues: {
          ":vc": valorCompra,
          ":vv": valorVenta,
          ":manual": true,
          ":ua": now,
          ":updatedAt": now,
          ":updatedBy": usuario,
        },
      })
    );

    const auditoria: TCBaseAuditoria = {
      pk: `TC_BASE#${parMoneda}`,
      sk: `AUDITORIA#${now}`,
      tipo: "TC_BASE_AUDITORIA",
      parMoneda,
      valorCompraAnterior: actual.valorCompra,
      valorCompraNuevo: valorCompra,
      valorVentaAnterior: actual.valorVenta,
      valorVentaNuevo: valorVenta,
      esEdicionManual: true,
      motivoEdicion,
      updatedAt: now,
      updatedBy: usuario,
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: auditoria }));

    return {
      data: {
        ...mapTCBaseToResponse(actual),
        valorCompra,
        valorVenta,
        esEdicionManual: true,
        ultimaActualizacion: now,
        updatedAt: now,
        updatedBy: usuario,
      },
    };
  },

  async obtenerAuditoria(parMoneda: ParMoneda): Promise<TCBaseAuditoriaResponse[]> {
    const result = await dynamo.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": `TC_BASE#${parMoneda}`,
          ":sk": "AUDITORIA#",
        },
      })
    );
    if (!result.Items || result.Items.length === 0) return [];
    return (result.Items as TCBaseAuditoria[])
      .sort((a, b) => b.sk.localeCompare(a.sk))
      .map(mapAuditoriaToResponse);
  },

  async listarVentanilla(parMoneda: ParMoneda): Promise<TCVentanillaResponse[]> {
    const result = await dynamo.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": `TC_VENTANILLA#${parMoneda}`,
          ":sk": "SEGMENTO#",
        },
      })
    );
    if (!result.Items || result.Items.length === 0) return [];
    return (result.Items as TCVentanilla[]).map(mapVentanillaToResponse);
  },

  async enviarVentanilla(
    parMoneda: ParMoneda,
    segmentos: TCVentanillaSegmentoRequest[],
    usuario: string
  ): Promise<TCVentanillaEnviarResult> {
    const tcBase = await this.obtenerBaseActivo(parMoneda);
    if (!tcBase) return { error: "TC_BASE_NO_ENCONTRADO" };

    const now = new Date().toISOString();

    const items: TCVentanilla[] = segmentos.map((seg) => ({
      pk: `TC_VENTANILLA#${parMoneda}`,
      sk: `SEGMENTO#${seg.segmento}`,
      tipo: "TC_VENTANILLA",
      parMoneda,
      segmento: seg.segmento,
      tcBaseCompraRef: tcBase.valorCompra,
      tcBaseVentaRef: tcBase.valorVenta,
      spreadCompraPips: seg.spreadCompraPips,
      spreadVentaPips: seg.spreadVentaPips,
      valorCompra: calcularValor(tcBase.valorCompra, seg.spreadCompraPips),
      valorVenta: calcularValor(tcBase.valorVenta, seg.spreadVentaPips),
      enviadoAt: now,
      enviadoBy: usuario,
    }));

    await dynamo.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE]: items.map((item) => ({ PutRequest: { Item: item } })),
        },
      })
    );

    return { data: items.map(mapVentanillaToResponse) };
  },
};
