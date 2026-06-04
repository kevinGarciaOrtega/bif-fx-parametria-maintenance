import { APIGatewayProxyHandler } from "aws-lambda";
import { VolatilidadRepository } from "../repositories/volatilidad.repository";
import { VolatilidadUpdateSchema } from "../validators/schemas";
import {
  ok,
  badRequest,
  notFound,
  serverError,
} from "../utils/response.util";
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
    // 1. Validar id en path
    const id = event.pathParameters?.id;
    if (!id) {
      return badRequest("FX-MNT-001", "ID requerido");
    }

    // 2. Parsear body
    let body: unknown;
    try {
      body = JSON.parse(event.body ?? "{}");
    } catch {
      return badRequest("FX-MNT-002", "Body inválido, se esperaba JSON");
    }

    // 3. Validar schema con Zod
    const parsed = VolatilidadUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("FX-MNT-002", parsed.error.errors[0].message);
    }

    // 4. Obtener usuario del contexto
    const usuario = getUsuario(event);

    // 5. Actualizar en DynamoDB
    const result = await VolatilidadRepository.actualizar(
      id,
      parsed.data.pips,
      parsed.data.estadoActual,
      usuario
    );

    // 6. Retornar resultado
    if (!result) {
      return notFound("FX-MNT-003", `Volatilidad ${id} no encontrada`);
    }
    return ok(result);

  } catch (error) {
    return serverError(error);
  }
};
