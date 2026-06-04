import { APIGatewayProxyHandler } from "aws-lambda";
import { SegmentoRepository } from "../repositories/segmento.repository";
import {
  SegmentoCreateSchema,
  SegmentoUpdateSchema,
} from "../validators/schemas";
import {
  ok,
  created,
  noContent,
  badRequest,
  notFound,
  conflict,
  serverError,
} from "../utils/response.util";
import { getUsuario } from "../utils/audit.util";

const parseBody = (body: string | null) => {
  try {
    return { parsed: JSON.parse(body ?? "{}"), error: null };
  } catch {
    return { parsed: null, error: "Body inválido, se esperaba JSON" };
  }
};

export const listar: APIGatewayProxyHandler = async (event) => {
  try {
    const descripcion = event.queryStringParameters?.descripcion;
    const data = await SegmentoRepository.buscar(descripcion);
    return ok({ data, total: data.length });
  } catch (error) {
    return serverError(error);
  }
};

export const crear: APIGatewayProxyHandler = async (event) => {
  try {
    const { parsed, error } = parseBody(event.body);
    if (error) return badRequest("FX-MNT-041", error);

    const parsed_val = SegmentoCreateSchema.safeParse(parsed);
    if (!parsed_val.success) {
      return badRequest("FX-MNT-041", parsed_val.error.errors[0].message);
    }

    const usuario = getUsuario(event);
    const result = await SegmentoRepository.crear(
      parsed_val.data.descripcionBanca,
      parsed_val.data.pips,
      usuario
    );

    if (result.error === "DUPLICADO") {
      return conflict(
        "FX-MNT-042",
        `descripcionBanca ya existe: ${result.descripcionExistente}`
      );
    }

    return created(result.data!);
  } catch (error) {
    return serverError(error);
  }
};

export const actualizar: APIGatewayProxyHandler = async (event) => {
  try {
    const codigoBanca = event.pathParameters?.codigoBanca;
    if (!codigoBanca) return badRequest("FX-MNT-040", "codigoBanca es requerido");

    const { parsed, error } = parseBody(event.body);
    if (error) return badRequest("FX-MNT-041", error);

    const parsed_val = SegmentoUpdateSchema.safeParse(parsed);
    if (!parsed_val.success) {
      return badRequest("FX-MNT-041", parsed_val.error.errors[0].message);
    }

    const usuario = getUsuario(event);
    const result = await SegmentoRepository.actualizar(
      codigoBanca,
      parsed_val.data.pips,
      usuario
    );

    if (!result) return notFound("FX-MNT-043", `Segmento ${codigoBanca} no encontrado`);
    return ok(result);
  } catch (error) {
    return serverError(error);
  }
};

export const eliminar: APIGatewayProxyHandler = async (event) => {
  try {
    const codigoBanca = event.pathParameters?.codigoBanca;
    if (!codigoBanca) return badRequest("FX-MNT-040", "codigoBanca es requerido");

    const eliminado = await SegmentoRepository.eliminar(codigoBanca);
    if (!eliminado) {
      return notFound("FX-MNT-044", `Segmento ${codigoBanca} no encontrado`);
    }
    return noContent();
  } catch (error) {
    return serverError(error);
  }
};
