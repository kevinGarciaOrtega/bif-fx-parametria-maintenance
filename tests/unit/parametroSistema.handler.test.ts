import { APIGatewayProxyEvent } from "aws-lambda";
import { listar, actualizar } from "../../src/handlers/parametroSistema.handler";
import { ParametroSistemaRepository } from "../../src/repositories/parametroSistema.repository";

jest.mock("../../src/repositories/parametroSistema.repository");
const mockRepo = ParametroSistemaRepository as jest.Mocked<typeof ParametroSistemaRepository>;

const mockEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent =>
  ({ pathParameters: null, body: null, requestContext: { authorizer: null } as any,
     headers: {}, multiValueHeaders: {}, httpMethod: "GET", isBase64Encoded: false,
     path: "/", queryStringParameters: null, multiValueQueryStringParameters: null,
     stageVariables: null, resource: "/", ...overrides } as APIGatewayProxyEvent);

const parametro = {
  grupo: "GENERAL",
  parametros: [{
    clave: "MONEDA",
    nombre: "Moneda Base",
    valor: "USD",
    tipoValor: "STRING" as const,
    updatedAt: "2026-05-25T08:30:00Z",
    updatedBy: "SISTEMA",
  }],
};

const bodyValido = JSON.stringify({ valor: "909" });

describe("parametroSistema.handler", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("listar()", () => {
    it("retorna 200 con grupos y totales", async () => {
      mockRepo.listar.mockResolvedValueOnce([parametro]);
      const res = await listar(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(200);
      const body = JSON.parse(res!.body);
      expect(body.data).toEqual([parametro]);
      expect(body.totalGrupos).toBe(1);
      expect(body.totalParametros).toBe(1);
    });

    it("retorna 200 cuando no hay parámetros", async () => {
      mockRepo.listar.mockResolvedValueOnce([]);
      const res = await listar(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(200);
      const body = JSON.parse(res!.body);
      expect(body.totalGrupos).toBe(0);
      expect(body.totalParametros).toBe(0);
    });

    it("retorna 500 ante error interno", async () => {
      mockRepo.listar.mockRejectedValueOnce(new Error("boom"));
      const res = await listar(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(500);
    });
  });

  describe("actualizar()", () => {
    it("retorna 200 con el parámetro actualizado", async () => {
      mockRepo.actualizar.mockResolvedValueOnce({
        grupo: "GENERAL",
        clave: "MONEDA",
        nombre: "Moneda Base",
        valor: "EUR",
        tipoValor: "STRING",
        updatedAt: "2026-05-25T08:30:00Z",
        updatedBy: "SISTEMA",
      });

      const res = await actualizar(
        mockEvent({
          pathParameters: { grupo: "GENERAL", clave: "MONEDA" },
          body: bodyValido,
        }),
        {} as any,
        () => {}
      );

      expect(res!.statusCode).toBe(200);
      const body = JSON.parse(res!.body);
      expect(body.valor).toBe("EUR");
      expect(body.clave).toBe("MONEDA");
    });

    it("retorna 400 cuando faltan grupo o clave", async () => {
      const res = await actualizar(mockEvent({ body: bodyValido }), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-070");
    });

    it("retorna 400 cuando el body no es JSON válido", async () => {
      const res = await actualizar(
        mockEvent({ pathParameters: { grupo: "GENERAL", clave: "MONEDA" }, body: "{ invalid" }),
        {} as any,
        () => {}
      );
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-072");
    });

    it("retorna 400 cuando falta valor en el body", async () => {
      const res = await actualizar(
        mockEvent({ pathParameters: { grupo: "GENERAL", clave: "MONEDA" }, body: JSON.stringify({}) }),
        {} as any,
        () => {}
      );
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-072");
    });

    it("retorna 404 cuando el parámetro no existe", async () => {
      mockRepo.actualizar.mockResolvedValueOnce(null);
      const res = await actualizar(
        mockEvent({ pathParameters: { grupo: "GENERAL", clave: "NO_EXISTE" }, body: bodyValido }),
        {} as any,
        () => {}
      );
      expect(res!.statusCode).toBe(404);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-073");
    });

    it("retorna 500 ante error interno", async () => {
      mockRepo.actualizar.mockRejectedValueOnce(new Error("boom"));
      const res = await actualizar(
        mockEvent({ pathParameters: { grupo: "GENERAL", clave: "MONEDA" }, body: bodyValido }),
        {} as any,
        () => {}
      );
      expect(res!.statusCode).toBe(500);
    });
  });
});
