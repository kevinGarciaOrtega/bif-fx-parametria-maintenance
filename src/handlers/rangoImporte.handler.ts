import { APIGatewayProxyHandler } from "aws-lambda";
import { RangoImporteRepository } from "../repositories/rangoImporte.repository";
import {
  RangoImporteCreateSchema,
  RangoImporteUpdateSchema,
} from "../validators/schemas";
import {
  ok,
  created,
  noContent,
  badRequest,
  notFound,
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

export const listarPN: APIGatewayProxyHandler = async () => {
  try {
    const data = await RangoImporteRepository.listar("PN");
    return ok({ tipoPersoneria: "PN", data, total: data.length });
  } catch (error) {
    return serverError(error);
  }
};

export const crearPN: APIGatewayProxyHandler = async (event) => {
  try {
    const { parsed, error } = parseBody(event.body);
    if (error) return badRequest("FX-MNT-032", error);

    const parsed_val = RangoImporteCreateSchema.safeParse(parsed);
    if (!parsed_val.success) {
      return badRequest("FX-MNT-032", parsed_val.error.errors[0].message);
    }

    const usuario = getUsuario(event);
    const result = await RangoImporteRepository.crear(
      "PN",
      parsed_val.data.importeMaximo,
      parsed_val.data.pips,
      usuario
    );

    if (result.error === "IMPORTE_INVALIDO") {
      return badRequest(
        "FX-MNT-032",
        `Importe máximo debe ser mayor al importe mínimo (${result.importeMinimoActual})`
      );
    }
    return created(result.data!);
  } catch (error) {
    return serverError(error);
  }
};

export const actualizarPN: APIGatewayProxyHandler = async (event) => {
  try {
    const id = event.pathParameters?.id;
    if (!id) return badRequest("FX-MNT-031", "ID requerido");

    const { parsed, error } = parseBody(event.body);
    if (error) return badRequest("FX-MNT-032", error);

    const parsed_val = RangoImporteUpdateSchema.safeParse(parsed);
    if (!parsed_val.success) {
      return badRequest("FX-MNT-032", parsed_val.error.errors[0].message);
    }

    const usuario = getUsuario(event);
    const result = await RangoImporteRepository.actualizar(
      "PN",
      id,
      parsed_val.data.importeMaximo,
      parsed_val.data.pips,
      usuario
    );

    if (!result) return notFound("FX-MNT-033", `Rango PN ${id} no encontrado`);
    return ok(result);
  } catch (error) {
    return serverError(error);
  }
};

export const eliminarPN: APIGatewayProxyHandler = async (event) => {
  try {
    const id = event.pathParameters?.id;
    if (!id) return badRequest("FX-MNT-031", "ID requerido");

    const eliminado = await RangoImporteRepository.eliminar("PN", id);
    if (!eliminado) return notFound("FX-MNT-034", `Rango PN ${id} no encontrado`);
    return noContent();
  } catch (error) {
    return serverError(error);
  }
};

export const listarPJ: APIGatewayProxyHandler = async () => {
  try {
    const data = await RangoImporteRepository.listar("PJ");
    return ok({ tipoPersoneria: "PJ", data, total: data.length });
  } catch (error) {
    return serverError(error);
  }
};

export const crearPJ: APIGatewayProxyHandler = async (event) => {
  try {
    const { parsed, error } = parseBody(event.body);
    if (error) return badRequest("FX-MNT-032", error);

    const parsed_val = RangoImporteCreateSchema.safeParse(parsed);
    if (!parsed_val.success) {
      return badRequest("FX-MNT-032", parsed_val.error.errors[0].message);
    }

    const usuario = getUsuario(event);
    const result = await RangoImporteRepository.crear(
      "PJ",
      parsed_val.data.importeMaximo,
      parsed_val.data.pips,
      usuario
    );

    if (result.error === "IMPORTE_INVALIDO") {
      return badRequest(
        "FX-MNT-032",
        `Importe máximo debe ser mayor al importe mínimo (${result.importeMinimoActual})`
      );
    }
    return created(result.data!);
  } catch (error) {
    return serverError(error);
  }
};

export const actualizarPJ: APIGatewayProxyHandler = async (event) => {
  try {
    const id = event.pathParameters?.id;
    if (!id) return badRequest("FX-MNT-031", "ID requerido");

    const { parsed, error } = parseBody(event.body);
    if (error) return badRequest("FX-MNT-032", error);

    const parsed_val = RangoImporteUpdateSchema.safeParse(parsed);
    if (!parsed_val.success) {
      return badRequest("FX-MNT-032", parsed_val.error.errors[0].message);
    }

    const usuario = getUsuario(event);
    const result = await RangoImporteRepository.actualizar(
      "PJ",
      id,
      parsed_val.data.importeMaximo,
      parsed_val.data.pips,
      usuario
    );

    if (!result) return notFound("FX-MNT-033", `Rango PJ ${id} no encontrado`);
    return ok(result);
  } catch (error) {
    return serverError(error);
  }
};

export const eliminarPJ: APIGatewayProxyHandler = async (event) => {
  try {
    const id = event.pathParameters?.id;
    if (!id) return badRequest("FX-MNT-031", "ID requerido");

    const eliminado = await RangoImporteRepository.eliminar("PJ", id);
    if (!eliminado) return notFound("FX-MNT-034", `Rango PJ ${id} no encontrado`);
    return noContent();
  } catch (error) {
    return serverError(error);
  }
};
