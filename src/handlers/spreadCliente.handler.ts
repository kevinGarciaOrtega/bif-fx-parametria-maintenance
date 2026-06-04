import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { SpreadClienteRepository } from "../repositories/spreadCliente.repository";
import { SpreadClienteCreateSchema, SpreadClienteUpdateSchema } from "../validators/schemas";
import {
  badRequest,
  conflict,
  created,
  noContent,
  notFound,
  ok,
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

const getPathSegments = (event: APIGatewayProxyEvent): string[] =>
  (event.pathParameters?.proxy ?? "").split("/").filter(Boolean);

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const method = event.httpMethod;
    const segments = getPathSegments(event);

    if (method === "GET" && segments.length === 0) {
      return buscar(event);
    }

    if (method === "GET" && segments[0] === "buscar-ibs") {
      return buscarIbs(event, segments[1]);
    }

    if (method === "POST" && segments.length === 0) {
      return crear(event);
    }

    if (method === "PUT" && segments.length === 1) {
      return actualizar(event, segments[0]);
    }

    if (method === "DELETE" && segments.length === 1) {
      return eliminar(event, segments[0]);
    }

    return notFound("FX-MNT-065", "Ruta no encontrada");
  } catch (error) {
    return serverError(error);
  }
};

const buscar = async (event: APIGatewayProxyEvent) => {
  const query = event.queryStringParameters ?? {};
  const filtros = {
    codigoIbs: query.codigoIbs,
    nroDocumento: query.nroDocumento,
    tipoDocumento: query.tipoDocumento,
    tipoPersoneria: query.tipoPersoneria,
    flagMotor: query.flagMotor,
    nombreCliente: query.nombreCliente,
  };

  const data = await SpreadClienteRepository.buscar(filtros);
  return ok({ data, total: data.length });
};

const buscarIbs = async (
  event: APIGatewayProxyEvent,
  codigoIbs?: string
) => {
  if (!codigoIbs) {
    return badRequest("FX-MNT-060", "codigoIbs es requerido");
  }

  const result = await SpreadClienteRepository.obtenerPorCodigoIbs(codigoIbs);
  if (!result) {
    return notFound("FX-MNT-062", `Spread cliente ${codigoIbs} no encontrado`);
  }

  return ok(result);
};

const crear = async (event: APIGatewayProxyEvent) => {
  const { parsed, error } = parseBody(event.body);
  if (error) return badRequest("FX-MNT-061", error);

  const parsedVal = SpreadClienteCreateSchema.safeParse(parsed);
  if (!parsedVal.success) {
    return badRequest("FX-MNT-061", parsedVal.error.errors[0].message);
  }

  const usuario = getUsuario(event);
  const result = await SpreadClienteRepository.crear(parsedVal.data, usuario);

  if (result.error === "DUPLICADO") {
    return conflict("FX-MNT-063", `Spread cliente ${parsedVal.data.codigoIbs} ya existe`);
  }

  return created(result.data!);
};

const actualizar = async (
  event: APIGatewayProxyEvent,
  codigoIbs: string
) => {
  if (!codigoIbs) {
    return badRequest("FX-MNT-060", "codigoIbs es requerido");
  }

  const { parsed, error } = parseBody(event.body);
  if (error) return badRequest("FX-MNT-061", error);

  const parsedVal = SpreadClienteUpdateSchema.safeParse(parsed);
  if (!parsedVal.success) {
    return badRequest("FX-MNT-061", parsedVal.error.errors[0].message);
  }

  const usuario = getUsuario(event);
  const result = await SpreadClienteRepository.actualizar(
    codigoIbs,
    parsedVal.data,
    usuario
  );

  if (!result) {
    return notFound("FX-MNT-063", `Spread cliente ${codigoIbs} no encontrado`);
  }

  return ok(result);
};

const eliminar = async (
  event: APIGatewayProxyEvent,
  codigoIbs: string
) => {
  if (!codigoIbs) {
    return badRequest("FX-MNT-060", "codigoIbs es requerido");
  }

  const eliminado = await SpreadClienteRepository.eliminar(codigoIbs);
  if (!eliminado) {
    return notFound("FX-MNT-064", `Spread cliente ${codigoIbs} no encontrado`);
  }

  return noContent();
};
