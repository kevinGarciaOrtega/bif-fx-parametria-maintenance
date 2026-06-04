import { APIGatewayProxyEvent } from "aws-lambda";
import { listar, actualizar } from "../../src/handlers/volatilidad.handler";
import { VolatilidadRepository } from "../../src/repositories/volatilidad.repository";

jest.mock("../../src/repositories/volatilidad.repository");

const mockRepo = VolatilidadRepository as jest.Mocked<typeof VolatilidadRepository>;

const mockEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent =>
  ({
    pathParameters: null,
    body: null,
    requestContext: { authorizer: null } as any,
    headers: {},
    multiValueHeaders: {},
    httpMethod: "GET",
    isBase64Encoded: false,
    path: "/",
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    resource: "/",
    ...overrides,
  } as APIGatewayProxyEvent);

const responseItem = {
  id: "001",
  nombre: "Volatilidad Activa",
  pips: 100,
  estadoActual: false,
  updatedAt: "2026-05-25T08:30:00Z",
  updatedBy: "ROBERT.GARCIA",
};

describe("volatilidad.handler", () => {

  beforeEach(() => jest.clearAllMocks());

  // ── listar ────────────────────────────────────────────────
  describe("listar()", () => {

    it("retorna 200 con data y total cuando hay registros", async () => {
      mockRepo.listarTodos.mockResolvedValueOnce([responseItem]);
      const res = await listar(mockEvent(), {} as any, () => {});
      expect(res).toBeDefined();
      if (res) {
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.data).toHaveLength(1);
        expect(body.total).toBe(1);
      }
    });

    it("retorna 200 con data=[] y total=0 cuando no hay registros", async () => {
      mockRepo.listarTodos.mockResolvedValueOnce([]);
      const res = await listar(mockEvent(), {} as any, () => {});
      if (res) {
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.data).toEqual([]);
        expect(body.total).toBe(0);
      }
    });

    it("retorna 500 cuando el repository lanza error", async () => {
      mockRepo.listarTodos.mockRejectedValueOnce(new Error("DynamoDB error"));
      const res = await listar(mockEvent(), {} as any, () => {});
      if (res) {
        expect(res.statusCode).toBe(500);
        const body = JSON.parse(res.body);
        expect(body.codigo).toBe("FX-MNT-500");
      }
    });

    it("incluye header Content-Type application/json", async () => {
      mockRepo.listarTodos.mockResolvedValueOnce([]);
      const res = await listar(mockEvent(), {} as any, () => {});
      if (res) {
        expect(res.headers?.["Content-Type"]).toBe("application/json");
      }
    });

    it("incluye header Access-Control-Allow-Origin *", async () => {
      mockRepo.listarTodos.mockResolvedValueOnce([]);
      const res = await listar(mockEvent(), {} as any, () => {});
      if (res) {
        expect(res.headers?.["Access-Control-Allow-Origin"]).toBe("*");
      }
    });
  });

  // ── actualizar ────────────────────────────────────────────
  describe("actualizar()", () => {

    const bodyValido = JSON.stringify({ pips: 150, estadoActual: true });

    it("retorna 200 con el registro actualizado", async () => {
      mockRepo.actualizar.mockResolvedValueOnce({ ...responseItem, pips: 150, estadoActual: true });
      const res = await actualizar(
        mockEvent({ pathParameters: { id: "001" }, body: bodyValido }),
        {} as any, () => {}
      );
      if (res) {
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.pips).toBe(150);
        expect(body.estadoActual).toBe(true);
      }
    });

    it("retorna 400 FX-MNT-001 cuando no hay id en el path", async () => {
      const res = await actualizar(
        mockEvent({ pathParameters: null, body: bodyValido }),
        {} as any, () => {}
      );
      if (res) {
        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body).codigo).toBe("FX-MNT-001");
      }
    });

    it("retorna 400 FX-MNT-002 cuando pips es negativo", async () => {
      const res = await actualizar(
        mockEvent({ pathParameters: { id: "001" }, body: JSON.stringify({ pips: -1, estadoActual: false }) }),
        {} as any, () => {}
      );
      if (res) {
        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body).codigo).toBe("FX-MNT-002");
        expect(JSON.parse(res.body).mensaje).toBe("PIPs debe ser >= 0");
      }
    });

    it("retorna 400 FX-MNT-002 cuando pips es decimal", async () => {
      const res = await actualizar(
        mockEvent({ pathParameters: { id: "001" }, body: JSON.stringify({ pips: 10.5, estadoActual: false }) }),
        {} as any, () => {}
      );
      if (res) {
        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body).codigo).toBe("FX-MNT-002");
      }
    });

    it("retorna 400 FX-MNT-002 cuando estadoActual no es boolean", async () => {
      const res = await actualizar(
        mockEvent({ pathParameters: { id: "001" }, body: JSON.stringify({ pips: 100, estadoActual: "activo" }) }),
        {} as any, () => {}
      );
      if (res) {
        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body).codigo).toBe("FX-MNT-002");
      }
    });

    it("retorna 400 FX-MNT-002 cuando body está vacío", async () => {
      const res = await actualizar(
        mockEvent({ pathParameters: { id: "001" }, body: "{}" }),
        {} as any, () => {}
      );
      if (res) {
        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body).codigo).toBe("FX-MNT-002");
      }
    });

    it("retorna 400 FX-MNT-002 cuando falta pips", async () => {
      const res = await actualizar(
        mockEvent({ pathParameters: { id: "001" }, body: JSON.stringify({ estadoActual: true }) }),
        {} as any, () => {}
      );
      if (res) {
        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body).codigo).toBe("FX-MNT-002");
      }
    });

    it("retorna 400 FX-MNT-002 cuando falta estadoActual", async () => {
      const res = await actualizar(
        mockEvent({ pathParameters: { id: "001" }, body: JSON.stringify({ pips: 100 }) }),
        {} as any, () => {}
      );
      if (res) {
        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body).codigo).toBe("FX-MNT-002");
      }
    });

    it("retorna 404 FX-MNT-003 cuando el id no existe", async () => {
      mockRepo.actualizar.mockResolvedValueOnce(null);
      const res = await actualizar(
        mockEvent({ pathParameters: { id: "999" }, body: bodyValido }),
        {} as any, () => {}
      );
      if (res) {
        expect(res.statusCode).toBe(404);
        expect(JSON.parse(res.body).codigo).toBe("FX-MNT-003");
        expect(JSON.parse(res.body).mensaje).toContain("999");
      }
    });

    it("retorna 500 FX-MNT-500 cuando el repository lanza error", async () => {
      mockRepo.actualizar.mockRejectedValueOnce(new Error("DynamoDB error"));
      const res = await actualizar(
        mockEvent({ pathParameters: { id: "001" }, body: bodyValido }),
        {} as any, () => {}
      );
      if (res) {
        expect(res.statusCode).toBe(500);
        expect(JSON.parse(res.body).codigo).toBe("FX-MNT-500");
      }
    });

    it("updatedBy es SISTEMA cuando no hay authorizer", async () => {
      mockRepo.actualizar.mockResolvedValueOnce({ ...responseItem, updatedBy: "SISTEMA" });
      const res = await actualizar(
        mockEvent({ pathParameters: { id: "001" }, body: bodyValido, requestContext: { authorizer: null } as any }),
        {} as any, () => {}
      );
      expect(mockRepo.actualizar).toHaveBeenCalledWith("001", 150, true, "SISTEMA");
    });

    it("updatedBy toma el username del authorizer", async () => {
      mockRepo.actualizar.mockResolvedValueOnce({ ...responseItem, updatedBy: "ANA.TORRES" });
      const res = await actualizar(
        mockEvent({
          pathParameters: { id: "001" },
          body: bodyValido,
          requestContext: { authorizer: { username: "ANA.TORRES" } } as any,
        }),
        {} as any, () => {}
      );
      expect(mockRepo.actualizar).toHaveBeenCalledWith("001", 150, true, "ANA.TORRES");
    });
  });
});
