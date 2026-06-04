import { APIGatewayProxyHandler } from "aws-lambda";
import { SpreadLiquidezRepository } from "../repositories/spreadLiquidez.repository";
import { SpreadLiquidezUpdateSchema } from "../validators/schemas";
import { ok, badRequest, notFound, serverError } from "../utils/response.util";
import { getUsuario } from "../utils/audit.util";
import { TipoMercado, SentidoOperacion } from "../models/spreadLiquidez.model";

const TIPOS_MERCADO: TipoMercado[] = [
  "HORARIO_MERCADO_ABIERTO",
  "HORARIO_MERCADO_CERRADO",
];

const SENTIDOS: SentidoOperacion[] = [
  "BANCO_COMPRA_DOLARES",
  "BANCO_VENDE_DOLARES",
];

export const listar: APIGatewayProxyHandler = async () => {
  try {
    const data = await SpreadLiquidezRepository.listar();
    return ok({ data, total: data.length });
  } catch (error) {
    return serverError(error);
  }
};

export const actualizar: APIGatewayProxyHandler = async (event) => {
  try {
    const tipoMercado = event.pathParameters?.tipoMercado;
    const sentidoOperacion = event.pathParameters?.sentidoOperacion;

    if (!tipoMercado || !sentidoOperacion) {
      return badRequest("FX-MNT-050", "tipoMercado y sentidoOperacion son requeridos");
    }

    if (!TIPOS_MERCADO.includes(tipoMercado as TipoMercado)) {
      return badRequest(
        "FX-MNT-051",
        `tipoMercado inválido. Valores permitidos: ${TIPOS_MERCADO.join(", ")}`
      );
    }

    if (!SENTIDOS.includes(sentidoOperacion as SentidoOperacion)) {
      return badRequest(
        "FX-MNT-051",
        `sentidoOperacion inválido. Valores permitidos: ${SENTIDOS.join(", ")}`
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(event.body ?? "{}");
    } catch {
      return badRequest("FX-MNT-052", "Body inválido, se esperaba JSON");
    }

    const parsed = SpreadLiquidezUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("FX-MNT-052", parsed.error.errors[0].message);
    }

    const usuario = getUsuario(event);
    const result = await SpreadLiquidezRepository.actualizar(
      tipoMercado as TipoMercado,
      sentidoOperacion as SentidoOperacion,
      parsed.data.pips,
      usuario
    );

    if (!result) {
      return notFound("FX-MNT-053", "Spread de liquidez no encontrado");
    }
    return ok(result);
  } catch (error) {
    return serverError(error);
  }
};
