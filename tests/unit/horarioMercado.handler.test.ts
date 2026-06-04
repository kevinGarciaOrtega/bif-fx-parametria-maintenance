import { APIGatewayProxyEvent } from "aws-lambda";
import { listar, actualizar } from "../../src/handlers/horarioMercado.handler";
import { HorarioMercadoRepository } from "../../src/repositories/horarioMercado.repository";

jest.mock("../../src/repositories/horarioMercado.repository");
const mockRepo = HorarioMercadoRepository as jest.Mocked<typeof HorarioMercadoRepository>;

const mockEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent =>
  ({ pathParameters: null, body: null, requestContext: { authorizer: null } as any,
     headers: {}, multiValueHeaders: {}, httpMethod: "GET", isBase64Encoded: false,
     path: "/", queryStringParameters: null, multiValueQueryStringParameters: null,
     stageVariables: null, resource: "/", ...overrides } as APIGatewayProxyEvent);

const item = {
  id: "001", nombre: "Horario de mercado abierto",
  horaApertura: "09:00", horaCierre: "15:00", pips: 120,
  updatedAt: "2026-05-25T08:30:00Z", updatedBy: "ROBERT.GARCIA",
};

const bodyValido = JSON.stringify({ pips: 130, horaApertura: "08:00", horaCierre: "14:00" });

describe("horarioMercado.handler", () => {

  beforeEach(() => jest.clearAllMocks());

  describe("listar()", () => {
    it("retorna 200 con data y total", async () => {
      mockRepo.listarTodos.mockResolvedValueOnce([item]);
      const res = await listar(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(200);
      const body = JSON.parse(res!.body);
      expect(body.data).toHaveLength(1);
      expect(body.total).toBe(1);
    });
    it("retorna 200 vacío", async () => {
      mockRepo.listarTodos.mockResolvedValueOnce([]);
      const res = await listar(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(200);
      expect(JSON.parse(res!.body).total).toBe(0);
    });
    it("retorna 500 ante error", async () => {
      mockRepo.listarTodos.mockRejectedValueOnce(new Error("err"));
      const res = await listar(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(500);
    });
  });

  describe("actualizar()", () => {
    it("retorna 200 con datos actualizados", async () => {
      mockRepo.actualizar.mockResolvedValueOnce({ ...item, pips: 130, horaApertura: "08:00", horaCierre: "14:00" });
      const res = await actualizar(mockEvent({ pathParameters: { id: "001" }, body: bodyValido }), {} as any, () => {});
      expect(res!.statusCode).toBe(200);
      const body = JSON.parse(res!.body);
      expect(body.pips).toBe(130);
    });
    it("retorna 400 FX-MNT-011 sin id", async () => {
      const res = await actualizar(mockEvent({ body: bodyValido }), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-011");
    });
    it("retorna 400 FX-MNT-012 pips negativo", async () => {
      const res = await actualizar(
        mockEvent({ pathParameters: { id: "001" }, body: JSON.stringify({ pips: -1, horaApertura: "09:00", horaCierre: "15:00" }) }),
        {} as any, () => {}
      );
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-012");
    });
    it("retorna 400 FX-MNT-012 hora inválida", async () => {
      const res = await actualizar(
        mockEvent({ pathParameters: { id: "001" }, body: JSON.stringify({ pips: 120, horaApertura: "25:00", horaCierre: "15:00" }) }),
        {} as any, () => {}
      );
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-012");
    });
    it("retorna 404 FX-MNT-013 id no existe", async () => {
      mockRepo.actualizar.mockResolvedValueOnce(null);
      const res = await actualizar(mockEvent({ pathParameters: { id: "999" }, body: bodyValido }), {} as any, () => {});
      expect(res!.statusCode).toBe(404);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-013");
    });
    it("retorna 500 ante error", async () => {
      mockRepo.actualizar.mockRejectedValueOnce(new Error("err"));
      const res = await actualizar(mockEvent({ pathParameters: { id: "001" }, body: bodyValido }), {} as any, () => {});
      expect(res!.statusCode).toBe(500);
    });
  });
});
