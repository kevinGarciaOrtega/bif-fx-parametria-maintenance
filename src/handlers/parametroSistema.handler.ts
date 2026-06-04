import { APIGatewayProxyHandler } from "aws-lambda";
import { ParametroSistemaRepository } from "../repositories/parametroSistema.repository";
import { ParametroSistemaUpdateSchema } from "../validators/schemas";
import { ok, badRequest, notFound, serverError } from "../utils/response.util";
import { getUsuario } from "../utils/audit.util";

export const listar: APIGatewayProxyHandler = async (event) => {
  try {
    const grupo = event.queryStringParameters?.grupo ?? undefined;
    const grupos = await ParametroSistemaRepository.listar(grupo);
    const totalParametros = grupos.reduce((acc, g) => acc + g.parametros.length, 0);
    return ok({
      data: grupos,
      totalGrupos: grupos.length,
      totalParametros,
    });
  } catch (error) {
    return serverError(error);
  }
};

export const actualizar: APIGatewayProxyHandler = async (event) => {
  try {
    const grupo = event.pathParameters?.grupo;
    const clave = event.pathParameters?.clave;

    if (!grupo || !clave) {
      return badRequest("FX-MNT-070", "grupo y clave son requeridos en el path");
    }

    let body: unknown;
    try {
      body = JSON.parse(event.body ?? "{}");
    } catch {
      return badRequest("FX-MNT-072", "Body inválido, se esperaba JSON");
    }

    const parsed = ParametroSistemaUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("FX-MNT-072", parsed.error.errors[0].message);
    }

    const usuario = getUsuario(event);
    const result = await ParametroSistemaRepository.actualizar(
      grupo,
      clave,
      parsed.data.valor,
      usuario
    );

    if (!result) {
      return notFound("FX-MNT-073", `Parámetro ${grupo}/${clave} no encontrado`);
    }
    return ok(result);
  } catch (error) {
    return serverError(error);
  }
};
