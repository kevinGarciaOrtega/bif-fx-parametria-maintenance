import { APIGatewayProxyEvent, Context, Callback } from "aws-lambda";
import { VolatilidadRepository } from "../../src/repositories/volatilidad.repository";
import { listar, actualizar } from "../../src/handlers/volatilidad.handler";

jest.mock("../../src/repositories/volatilidad.repository");

// ── Helpers ──────────────────────────────────────────────────────────────────

const MockedRepo = VolatilidadRepository as jest.Mocked<typeof VolatilidadRepository>;

/** Builds a minimal APIGatewayProxyEvent for the handler tests */
const makeEvent = (
  overrides: {
    pathParameters?: Record<string, string> | null;
    body?: string | null;
    requestContext?: Partial<APIGatewayProxyEvent["requestContext"]>;
  } = {}
): APIGatewayProxyEvent =>
  ({
    pathParameters: overrides.pathParameters ?? null,
    body: overrides.body ?? null,
    requestContext: (overrides.requestContext ?? {}) as APIGatewayProxyEvent["requestContext"],
    // Remaining required fields — not used by the handlers under test
    headers: {},
    multiValueHeaders: {},
    httpMethod: "GET",
    isBase64Encoded: false,
    path: "/",
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    resource: "/",
  } as unknown as APIGatewayProxyEvent);

const dummyContext = {} as Context;
const dummyCallback = (() => {}) as Callback;

/** Sample VolatilidadResponse objects */
const makeRecord = (id = "EUR") => ({
  id,
  nombre: "Euro",
  pips: 10,
  estadoActual: true,
  updatedAt: "2024-01-01T00:00:00.000Z",
  updatedBy: "admin",
});

// ── Test suite ────────────────────────────────────────────────────────────────

describe("volatilidad.handler", () => {
  beforeEach(() => jest.clearAllMocks());

  // ── listar() ────────────────────────────────────────────────────────────────
  describe("listar()", () => {
    it("retorna 200 con data y total cuando hay registros", async () => {
      const records = [makeRecord("EUR"), makeRecord("USD")];
      MockedRepo.listarTodos.mockResolvedValueOnce(records);

      const response = await listar(makeEvent(), dummyContext, dummyCallback);

      expect(response).not.toBeNull();
      expect(response!.statusCode).toBe(200);
      const body = JSON.parse(response!.body);
      expect(body.data).toEqual(records);
      expect(body.total).toBe(2);
    });

    it("retorna 200 con data=[] y total=0 cuando no hay registros", async () => {
      MockedRepo.listarTodos.mockResolvedValueOnce([]);

      const response = await listar(makeEvent(), dummyContext, dummyCallback);

      expect(response).not.toBeNull();
      expect(response!.statusCode).toBe(200);
      const body = JSON.parse(response!.body);
      expect(body.data).toEqual([]);
      expect(body.total).toBe(0);
    });

    it("retorna 500 cuando el repository lanza error", async () => {
      MockedRepo.listarTodos.mockRejectedValueOnce(new Error("DynamoDB down"));

      const response = await listar(makeEvent(), dummyContext, dummyCallback);

      expect(response).not.toBeNull();
      expect(response!.statusCode).toBe(500);
      const body = JSON.parse(response!.body);
      expect(body.codigo).toBe("FX-MNT-500");
    });

    it("el response incluye header Content-Type: application/json", async () => {
      MockedRepo.listarTodos.mockResolvedValueOnce([]);

      const response = await listar(makeEvent(), dummyContext, dummyCallback);

      expect(response!.headers?.["Content-Type"]).toBe("application/json");
    });

    it("el response incluye header Access-Control-Allow-Origin: *", async () => {
      MockedRepo.listarTodos.mockResolvedValueOnce([]);

      const response = await listar(makeEvent(), dummyContext, dummyCallback);

      expect(response!.headers?.["Access-Control-Allow-Origin"]).toBe("*");
    });
  });

  // ── actualizar() ────────────────────────────────────────────────────────────
  describe("actualizar()", () => {
    it("retorna 200 con el registro actualizado en caso exitoso", async () => {
      const updated = { ...makeRecord("EUR"), pips: 25, estadoActual: false, updatedBy: "SISTEMA" };
      MockedRepo.actualizar.mockResolvedValueOnce(updated);

      const event = makeEvent({
        pathParameters: { id: "EUR" },
        body: JSON.stringify({ pips: 25, estadoActual: false }),
      });

      const response = await actualizar(event, dummyContext, dummyCallback);

      expect(response!.statusCode).toBe(200);
      const body = JSON.parse(response!.body);
      expect(body).toEqual(updated);
    });

    it("retorna 400 FX-MNT-001 cuando no hay id en el path", async () => {
      const event = makeEvent({
        pathParameters: null,
        body: JSON.stringify({ pips: 10, estadoActual: true }),
      });

      const response = await actualizar(event, dummyContext, dummyCallback);

      expect(response!.statusCode).toBe(400);
      const body = JSON.parse(response!.body);
      expect(body.codigo).toBe("FX-MNT-001");
    });

    it("retorna 400 FX-MNT-002 cuando pips es negativo", async () => {
      const event = makeEvent({
        pathParameters: { id: "EUR" },
        body: JSON.stringify({ pips: -1, estadoActual: true }),
      });

      const response = await actualizar(event, dummyContext, dummyCallback);

      expect(response!.statusCode).toBe(400);
      const body = JSON.parse(response!.body);
      expect(body.codigo).toBe("FX-MNT-002");
    });

    it("retorna 400 FX-MNT-002 cuando pips es decimal", async () => {
      const event = makeEvent({
        pathParameters: { id: "EUR" },
        body: JSON.stringify({ pips: 1.5, estadoActual: true }),
      });

      const response = await actualizar(event, dummyContext, dummyCallback);

      expect(response!.statusCode).toBe(400);
      const body = JSON.parse(response!.body);
      expect(body.codigo).toBe("FX-MNT-002");
    });

    it("retorna 400 FX-MNT-002 cuando estadoActual no es boolean", async () => {
      const event = makeEvent({
        pathParameters: { id: "EUR" },
        body: JSON.stringify({ pips: 10, estadoActual: "yes" }),
      });

      const response = await actualizar(event, dummyContext, dummyCallback);

      expect(response!.statusCode).toBe(400);
      const body = JSON.parse(response!.body);
      expect(body.codigo).toBe("FX-MNT-002");
    });

    it("retorna 400 FX-MNT-002 cuando body está vacío", async () => {
      const event = makeEvent({
        pathParameters: { id: "EUR" },
        body: "{}",
      });

      const response = await actualizar(event, dummyContext, dummyCallback);

      expect(response!.statusCode).toBe(400);
      const body = JSON.parse(response!.body);
      expect(body.codigo).toBe("FX-MNT-002");
    });

    it("retorna 400 FX-MNT-002 cuando falta pips", async () => {
      const event = makeEvent({
        pathParameters: { id: "EUR" },
        body: JSON.stringify({ estadoActual: true }),
      });

      const response = await actualizar(event, dummyContext, dummyCallback);

      expect(response!.statusCode).toBe(400);
      const body = JSON.parse(response!.body);
      expect(body.codigo).toBe("FX-MNT-002");
    });

    it("retorna 400 FX-MNT-002 cuando falta estadoActual", async () => {
      const event = makeEvent({
        pathParameters: { id: "EUR" },
        body: JSON.stringify({ pips: 10 }),
      });

      const response = await actualizar(event, dummyContext, dummyCallback);

      expect(response!.statusCode).toBe(400);
      const body = JSON.parse(response!.body);
      expect(body.codigo).toBe("FX-MNT-002");
    });

    it("retorna 404 FX-MNT-003 cuando el id no existe en DynamoDB", async () => {
      MockedRepo.actualizar.mockResolvedValueOnce(null);

      const event = makeEvent({
        pathParameters: { id: "NOEXISTE" },
        body: JSON.stringify({ pips: 10, estadoActual: true }),
      });

      const response = await actualizar(event, dummyContext, dummyCallback);

      expect(response!.statusCode).toBe(404);
      const body = JSON.parse(response!.body);
      expect(body.codigo).toBe("FX-MNT-003");
    });

    it("retorna 500 FX-MNT-500 cuando el repository lanza error", async () => {
      MockedRepo.actualizar.mockRejectedValueOnce(new Error("DynamoDB error"));

      const event = makeEvent({
        pathParameters: { id: "EUR" },
        body: JSON.stringify({ pips: 10, estadoActual: true }),
      });

      const response = await actualizar(event, dummyContext, dummyCallback);

      expect(response!.statusCode).toBe(500);
      const body = JSON.parse(response!.body);
      expect(body.codigo).toBe("FX-MNT-500");
    });

    it("updatedBy es 'SISTEMA' cuando no hay authorizer", async () => {
      const updated = makeRecord("EUR");
      MockedRepo.actualizar.mockResolvedValueOnce(updated);

      const event = makeEvent({
        pathParameters: { id: "EUR" },
        body: JSON.stringify({ pips: 10, estadoActual: true }),
        // no requestContext.authorizer
      });

      await actualizar(event, dummyContext, dummyCallback);

      expect(MockedRepo.actualizar).toHaveBeenCalledWith("EUR", 10, true, "SISTEMA");
    });

    it("updatedBy toma el username del authorizer cuando existe", async () => {
      const updated = makeRecord("EUR");
      MockedRepo.actualizar.mockResolvedValueOnce(updated);

      const event = makeEvent({
        pathParameters: { id: "EUR" },
        body: JSON.stringify({ pips: 10, estadoActual: true }),
        requestContext: {
          authorizer: { username: "jdoe" },
        } as any,
      });

      await actualizar(event, dummyContext, dummyCallback);

      expect(MockedRepo.actualizar).toHaveBeenCalledWith("EUR", 10, true, "jdoe");
    });
  });
});
