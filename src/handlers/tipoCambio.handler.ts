import { APIGatewayProxyHandler } from "aws-lambda";
import { TipoCambioRepository } from "../repositories/tipoCambio.repository";
import { TCBaseUpdateSchema, TCVentanillaEnviarSchema } from "../validators/schemas";
import { ok, created, badRequest, notFound, serverError } from "../utils/response.util";
import { getUsuario } from "../utils/audit.util";
import { ParMoneda } from "../models/tipoCambio.model";

const PARES_VALIDOS: ParMoneda[] = ["USD_PEN", "EUR_PEN"];

const validarParMoneda = (par: string | undefined): ParMoneda | null => {
  if (!par || !PARES_VALIDOS.includes(par as ParMoneda)) return null;
  return par as ParMoneda;
};

export const obtenerBase: APIGatewayProxyHandler = async () => {
  try {
    const data = await TipoCambioRepository.listarBase();
    return ok({ data, total: data.length });
  } catch (error) {
    return serverError(error);
  }
};

export const editarBase: APIGatewayProxyHandler = async (event) => {
  try {
    const parMoneda = validarParMoneda(event.pathParameters?.parMoneda);
    if (!parMoneda) {
      return badRequest("FX-TC-001", `parMoneda inválido. Valores permitidos: ${PARES_VALIDOS.join(", ")}`);
    }

    let body: unknown;
    try {
      body = JSON.parse(event.body ?? "{}");
    } catch {
      return badRequest("FX-TC-002", "Body inválido, se esperaba JSON");
    }

    const parsed = TCBaseUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("FX-TC-002", parsed.error.errors[0].message);
    }

    const usuario = getUsuario(event);
    const result = await TipoCambioRepository.actualizarBase(
      parMoneda,
      parsed.data.valorCompra,
      parsed.data.valorVenta,
      parsed.data.motivoEdicion,
      usuario
    );

    if (result.error === "NO_ENCONTRADO") {
      return notFound("FX-TC-003", `TC Base ${parMoneda} no encontrado`);
    }
    return ok(result.data!);
  } catch (error) {
    return serverError(error);
  }
};

export const auditoriaBase: APIGatewayProxyHandler = async (event) => {
  try {
    const parMoneda = validarParMoneda(event.pathParameters?.parMoneda);
    if (!parMoneda) {
      return badRequest("FX-TC-001", `parMoneda inválido. Valores permitidos: ${PARES_VALIDOS.join(", ")}`);
    }

    const data = await TipoCambioRepository.obtenerAuditoria(parMoneda);
    return ok({ parMoneda, data, total: data.length });
  } catch (error) {
    return serverError(error);
  }
};

export const obtenerVentanilla: APIGatewayProxyHandler = async (event) => {
  try {
    const parMoneda = validarParMoneda(event.pathParameters?.parMoneda);
    if (!parMoneda) {
      return badRequest("FX-TC-001", `parMoneda inválido. Valores permitidos: ${PARES_VALIDOS.join(", ")}`);
    }

    const data = await TipoCambioRepository.listarVentanilla(parMoneda);
    return ok({ parMoneda, data, total: data.length });
  } catch (error) {
    return serverError(error);
  }
};

export const enviarVentanilla: APIGatewayProxyHandler = async (event) => {
  try {
    const parMoneda = validarParMoneda(event.pathParameters?.parMoneda);
    if (!parMoneda) {
      return badRequest("FX-TC-001", `parMoneda inválido. Valores permitidos: ${PARES_VALIDOS.join(", ")}`);
    }

    let body: unknown;
    try {
      body = JSON.parse(event.body ?? "{}");
    } catch {
      return badRequest("FX-TC-004", "Body inválido, se esperaba JSON");
    }

    const parsed = TCVentanillaEnviarSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("FX-TC-004", parsed.error.errors[0].message);
    }

    const usuario = getUsuario(event);
    const result = await TipoCambioRepository.enviarVentanilla(
      parMoneda,
      parsed.data.segmentos,
      usuario
    );

    if (result.error === "TC_BASE_NO_ENCONTRADO") {
      return notFound("FX-TC-003", `TC Base ${parMoneda} no encontrado`);
    }
    return created({ parMoneda, data: result.data, total: result.data!.length });
  } catch (error) {
    return serverError(error);
  }
};
