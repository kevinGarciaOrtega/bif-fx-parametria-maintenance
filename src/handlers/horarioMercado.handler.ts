import { APIGatewayProxyHandler } from "aws-lambda";
import { HorarioMercadoRepository } from "../repositories/horarioMercado.repository";
import { HorarioMercadoUpdateSchema } from "../validators/schemas";
import { ok, badRequest, notFound, serverError } from "../utils/response.util";
import { getUsuario } from "../utils/audit.util";

export const listar: APIGatewayProxyHandler = async () => {
  try {
    const data = await HorarioMercadoRepository.listarTodos();
    return ok({ data, total: data.length });
  } catch (error) {
    return serverError(error);
  }
};

export const actualizar: APIGatewayProxyHandler = async (event) => {
  try {
    const id = event.pathParameters?.id;
    if (!id) return badRequest("FX-MNT-011", "ID requerido");

    let body: unknown;
    try {
      body = JSON.parse(event.body ?? "{}");
    } catch {
      return badRequest("FX-MNT-012", "Body inválido, se esperaba JSON");
    }

    const parsed = HorarioMercadoUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("FX-MNT-012", parsed.error.errors[0].message);
    }

    const usuario = getUsuario(event);
    const result = await HorarioMercadoRepository.actualizar(
      id,
      parsed.data.pips,
      parsed.data.horaApertura,
      parsed.data.horaCierre,
      usuario
    );

    if (!result) return notFound("FX-MNT-013", `Horario ${id} no encontrado`);
    return ok(result);
  } catch (error) {
    return serverError(error);
  }
};
