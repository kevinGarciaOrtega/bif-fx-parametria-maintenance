import { APIGatewayProxyHandler } from "aws-lambda";
import { FeriadoRepository } from "../repositories/feriado.repository";
import { FeriadoCreateSchema } from "../validators/schemas";
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

const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;

export const listar: APIGatewayProxyHandler = async (event) => {
  try {
    const anioStr = event.queryStringParameters?.anio;
    if (!anioStr) {
      return badRequest("FX-MNT-020", "El parámetro anio es requerido");
    }
    const anio = Number(anioStr);
    if (isNaN(anio) || !Number.isInteger(anio)) {
      return badRequest("FX-MNT-020", "El parámetro anio debe ser un número válido");
    }

    const data = await FeriadoRepository.listarPorAnio(anio);
    return ok({ anio, data, total: data.length });
  } catch (error) {
    return serverError(error);
  }
};

export const crear: APIGatewayProxyHandler = async (event) => {
  try {
    let body: unknown;
    try {
      body = JSON.parse(event.body ?? "{}");
    } catch {
      return badRequest("FX-MNT-021", "Body inválido, se esperaba JSON");
    }

    const parsed = FeriadoCreateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("FX-MNT-021", parsed.error.errors[0].message);
    }

    const usuario = getUsuario(event);
    const result = await FeriadoRepository.crear(
      parsed.data.fecha,
      parsed.data.descripcion ?? "",
      usuario
    );

    if (!result) {
      return conflict("FX-MNT-022", `El feriado ${parsed.data.fecha} ya existe`);
    }
    return created(result);
  } catch (error) {
    return serverError(error);
  }
};

export const eliminar: APIGatewayProxyHandler = async (event) => {
  try {
    const fecha = event.pathParameters?.fecha;
    if (!fecha) return badRequest("FX-MNT-023", "Fecha requerida en el path");

    if (!fechaRegex.test(fecha)) {
      return badRequest("FX-MNT-023", "Formato de fecha inválido, usar YYYY-MM-DD");
    }

    const eliminado = await FeriadoRepository.eliminar(fecha);
    if (!eliminado) return notFound("FX-MNT-024", `Feriado ${fecha} no encontrado`);
    return noContent();
  } catch (error) {
    return serverError(error);
  }
};
