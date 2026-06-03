import { APIGatewayProxyHandler } from "aws-lambda";
import { RangoImporteRepository } from "../repositories/rangoImporte.repository";
import { RangoImporteCreateSchema, RangoImporteUpdateSchema } from "../validators/schemas";
import { ok, created, noContent, badRequest, notFound, serverError } from "../utils/response.util";
import { getUsuario } from "../utils/audit.util";
import { TipoPersoneria } from "../models/rangoImporte.model";

// ── PN ───────────────────────────────────────────────────────
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
    const body = JSON.parse(event.body ?? "{}");
    const parsed = RangoImporteCreateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("FX-MNT-010", parsed.error.errors[0].message);
    }
    const usuario = getUsuario(event);
    const result = await RangoImporteRepository.crear(
      "PN", parsed.data.importeMaximo, parsed.data.pips, usuario
    );
    return created(result);
  } catch (error) {
    return serverError(error);
  }
};

export const actualizarPN: APIGatewayProxyHandler = async (event) => {
  try {
    const id = event.pathParameters?.id;
    if (!id) return badRequest("FX-MNT-011", "ID requerido");

    const body = JSON.parse(event.body ?? "{}");
    const parsed = RangoImporteUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("FX-MNT-012", parsed.error.errors[0].message);
    }
    const usuario = getUsuario(event);
    const result = await RangoImporteRepository.actualizar(
      "PN", id, parsed.data.importeMaximo, parsed.data.pips, usuario
    );
    if (!result) return notFound("FX-MNT-013", `Rango PN ${id} no encontrado`);
    return ok(result);
  } catch (error) {
    return serverError(error);
  }
};

export const eliminarPN: APIGatewayProxyHandler = async (event) => {
  try {
    const id = event.pathParameters?.id;
    if (!id) return badRequest("FX-MNT-014", "ID requerido");

    const eliminado = await RangoImporteRepository.eliminar("PN", id);
    if (!eliminado) return notFound("FX-MNT-015", `Rango PN ${id} no encontrado`);
    return noContent();
  } catch (error) {
    return serverError(error);
  }
};

// ── PJ ───────────────────────────────────────────────────────
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
    const body = JSON.parse(event.body ?? "{}");
    const parsed = RangoImporteCreateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("FX-MNT-020", parsed.error.errors[0].message);
    }
    const usuario = getUsuario(event);
    const result = await RangoImporteRepository.crear(
      "PJ", parsed.data.importeMaximo, parsed.data.pips, usuario
    );
    return created(result);
  } catch (error) {
    return serverError(error);
  }
};

export const actualizarPJ: APIGatewayProxyHandler = async (event) => {
  try {
    const id = event.pathParameters?.id;
    if (!id) return badRequest("FX-MNT-021", "ID requerido");

    const body = JSON.parse(event.body ?? "{}");
    const parsed = RangoImporteUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("FX-MNT-022", parsed.error.errors[0].message);
    }
    const usuario = getUsuario(event);
    const result = await RangoImporteRepository.actualizar(
      "PJ", id, parsed.data.importeMaximo, parsed.data.pips, usuario
    );
    if (!result) return notFound("FX-MNT-023", `Rango PJ ${id} no encontrado`);
    return ok(result);
  } catch (error) {
    return serverError(error);
  }
};

export const eliminarPJ: APIGatewayProxyHandler = async (event) => {
  try {
    const id = event.pathParameters?.id;
    if (!id) return badRequest("FX-MNT-024", "ID requerido");

    const eliminado = await RangoImporteRepository.eliminar("PJ", id);
    if (!eliminado) return notFound("FX-MNT-025", `Rango PJ ${id} no encontrado`);
    return noContent();
  } catch (error) {
    return serverError(error);
  }
};
