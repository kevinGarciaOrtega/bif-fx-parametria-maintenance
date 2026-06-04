import { APIGatewayProxyEvent } from "aws-lambda";
import { listar, crear, eliminar } from "../../src/handlers/feriado.handler";
import { FeriadoRepository } from "../../src/repositories/feriado.repository";

jest.mock("../../src/repositories/feriado.repository");
const mockRepo = FeriadoRepository as jest.Mocked<typeof FeriadoRepository>;

const mockEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent =>
  ({ pathParameters: null, body: null, requestContext: { authorizer: null } as any,
     headers: {}, multiValueHeaders: {}, httpMethod: "GET", isBase64Encoded: false,
     path: "/", queryStringParameters: null, multiValueQueryStringParameters: null,
     stageVariables: null, resource: "/", ...overrides } as APIGatewayProxyEvent);

const feriadoItem = {
  fecha: "2026-01-01", descripcion: "Año Nuevo",
  createdAt: "2026-01-01T00:00:00Z", createdBy: "ROBERT.GARCIA",
};

describe("feriado.handler", () => {

  beforeEach(() => jest.clearAllMocks());

  describe("listar()", () => {
    it("retorna 200 con anio, data y total", async () => {
      mockRepo.listarPorAnio.mockResolvedValueOnce([feriadoItem]);
      const res = await listar(
        mockEvent({ queryStringParameters: { anio: "2026" } }),
        {} as any, () => {}
      );
      expect(res!.statusCode).toBe(200);
      const body = JSON.parse(res!.body);
      expect(body.anio).toBe(2026);
      expect(body.total).toBe(1);
    });
    it("retorna 400 FX-MNT-020 sin parámetro anio", async () => {
      const res = await listar(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-020");
    });
    it("retorna 400 FX-MNT-020 con anio no numérico", async () => {
      const res = await listar(
        mockEvent({ queryStringParameters: { anio: "abc" } }),
        {} as any, () => {}
      );
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-020");
    });
    it("retorna 500 ante error", async () => {
      mockRepo.listarPorAnio.mockRejectedValueOnce(new Error("err"));
      const res = await listar(
        mockEvent({ queryStringParameters: { anio: "2026" } }),
        {} as any, () => {}
      );
      expect(res!.statusCode).toBe(500);
    });
  });

  describe("crear()", () => {
    it("retorna 201 con el feriado creado", async () => {
      mockRepo.crear.mockResolvedValueOnce(feriadoItem);
      const res = await crear(
        mockEvent({ body: JSON.stringify({ fecha: "2026-01-01", descripcion: "Año Nuevo" }) }),
        {} as any, () => {}
      );
      expect(res!.statusCode).toBe(201);
    });
    it("retorna 400 FX-MNT-021 fecha inválida", async () => {
      const res = await crear(
        mockEvent({ body: JSON.stringify({ fecha: "01-01-2026" }) }),
        {} as any, () => {}
      );
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-021");
    });
    it("retorna 409 FX-MNT-022 cuando ya existe", async () => {
      mockRepo.crear.mockResolvedValueOnce(null);
      const res = await crear(
        mockEvent({ body: JSON.stringify({ fecha: "2026-01-01" }) }),
        {} as any, () => {}
      );
      expect(res!.statusCode).toBe(409);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-022");
    });
    it("retorna 500 ante error", async () => {
      mockRepo.crear.mockRejectedValueOnce(new Error("err"));
      const res = await crear(
        mockEvent({ body: JSON.stringify({ fecha: "2026-01-01" }) }),
        {} as any, () => {}
      );
      expect(res!.statusCode).toBe(500);
    });
  });

  describe("eliminar()", () => {
    it("retorna 204 cuando elimina correctamente", async () => {
      mockRepo.eliminar.mockResolvedValueOnce(true);
      const res = await eliminar(
        mockEvent({ pathParameters: { fecha: "2026-01-01" } }),
        {} as any, () => {}
      );
      expect(res!.statusCode).toBe(204);
    });
    it("retorna 400 FX-MNT-023 sin fecha", async () => {
      const res = await eliminar(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-023");
    });
    it("retorna 400 FX-MNT-023 formato inválido", async () => {
      const res = await eliminar(
        mockEvent({ pathParameters: { fecha: "01-01-2026" } }),
        {} as any, () => {}
      );
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-023");
    });
    it("retorna 404 FX-MNT-024 cuando no existe", async () => {
      mockRepo.eliminar.mockResolvedValueOnce(false);
      const res = await eliminar(
        mockEvent({ pathParameters: { fecha: "2026-06-15" } }),
        {} as any, () => {}
      );
      expect(res!.statusCode).toBe(404);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-024");
    });
    it("retorna 500 ante error", async () => {
      mockRepo.eliminar.mockRejectedValueOnce(new Error("err"));
      const res = await eliminar(
        mockEvent({ pathParameters: { fecha: "2026-01-01" } }),
        {} as any, () => {}
      );
      expect(res!.statusCode).toBe(500);
    });
  });
});
