import { APIGatewayProxyHandler } from "aws-lambda";
import { VolatilidadRepository } from "../repositories/volatilidad.repository";
import { VolatilidadUpdateSchema } from "../validators/schemas";
import { ok, badRequest, notFound, serverError } from "../utils/response.util";
import { getUsuario } from "../utils/audit.util";

export const listar: APIGatewayProxyHandler = async () => {
  try {
    const data = await VolatilidadRepository.listarTodos();
    return ok({ data, total: data.length });
  } catch (error) {
    return serverError(error);
  }
};

export const actualizar: APIGatewayProxyHandler = async (event) => {
  try {
    const id = event.pathParameters?.id;
    if (!id) return badRequest("FX-MNT-001", "ID requerido");

    const body = JSON.parse(event.body ?? "{}");
    const parsed = VolatilidadUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("FX-MNT-002", parsed.error.errors[0].message);
    }

    const usuario = getUsuario(event);
    const result = await VolatilidadRepository.actualizar(
      id,
      parsed.data.pips,
      parsed.data.estadoActual,
      usuario
    );

    if (!result) return notFound("FX-MNT-003", `Volatilidad ${id} no encontrada`);
    return ok(result);

  } catch (error) {
    return serverError(error);
  }
};
