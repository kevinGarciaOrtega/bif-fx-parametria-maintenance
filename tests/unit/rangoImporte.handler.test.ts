import { APIGatewayProxyEvent } from "aws-lambda";
import {
  listarPN,
  crearPN,
  actualizarPN,
  eliminarPN,
  listarPJ,
  crearPJ,
  actualizarPJ,
  eliminarPJ,
} from "../../src/handlers/rangoImporte.handler";
import { RangoImporteRepository } from "../../src/repositories/rangoImporte.repository";

jest.mock("../../src/repositories/rangoImporte.repository");
const mockRepo = RangoImporteRepository as jest.Mocked<typeof RangoImporteRepository>;

const mockEvent = (o: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent =>
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
    ...o,
  } as APIGatewayProxyEvent);

const itemPN = {
  id: "001",
  tipoPersoneria: "PN" as const,
  importeMinimo: 0,
  importeMaximo: 500,
  pips: 100,
  updatedAt: "2026-05-25T08:30:00Z",
  updatedBy: "ROBERT.GARCIA",
};

const bodyCrear = JSON.stringify({ importeMaximo: 1500, pips: 80 });
const bodyActualizar = JSON.stringify({ importeMaximo: 2000, pips: 75 });

describe("rangoImporte.handler", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("listarPN()", () => {
    it("retorna 200 con tipoPersoneria PN, data y total", async () => {
      mockRepo.listar.mockResolvedValueOnce([itemPN]);
      const res = await listarPN(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(200);
      const b = JSON.parse(res!.body);
      expect(b.tipoPersoneria).toBe("PN");
      expect(b.total).toBe(1);
    });

    it("retorna 200 vacío", async () => {
      mockRepo.listar.mockResolvedValueOnce([]);
      const res = await listarPN(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(200);
      expect(JSON.parse(res!.body).total).toBe(0);
    });

    it("retorna 500 ante error", async () => {
      mockRepo.listar.mockRejectedValueOnce(new Error("err"));
      const res = await listarPN(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(500);
    });
  });

  describe("crearPN()", () => {
    it("retorna 201 con rango creado", async () => {
      mockRepo.crear.mockResolvedValueOnce({ data: { ...itemPN, importeMinimo: 500, importeMaximo: 1500 } });
      const res = await crearPN(mockEvent({ body: bodyCrear }), {} as any, () => {});
      expect(res!.statusCode).toBe(201);
      expect(JSON.parse(res!.body).importeMaximo).toBe(1500);
    });

    it("retorna 400 FX-MNT-032 importeMaximo <= importeMinimo", async () => {
      mockRepo.crear.mockResolvedValueOnce({ error: "IMPORTE_INVALIDO", importeMinimoActual: 500 });
      const res = await crearPN(mockEvent({ body: bodyCrear }), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-032");
      expect(JSON.parse(res!.body).mensaje).toContain("500");
    });

    it("retorna 400 FX-MNT-032 importeMaximo negativo", async () => {
      const res = await crearPN(mockEvent({ body: JSON.stringify({ importeMaximo: -1, pips: 100 }) }), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-032");
    });

    it("retorna 400 FX-MNT-032 pips negativo", async () => {
      const res = await crearPN(mockEvent({ body: JSON.stringify({ importeMaximo: 500, pips: -1 }) }), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-032");
    });

    it("retorna 400 body vacío", async () => {
      const res = await crearPN(mockEvent({ body: "{}" }), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
    });

    it("retorna 500 ante error", async () => {
      mockRepo.crear.mockRejectedValueOnce(new Error("err"));
      const res = await crearPN(mockEvent({ body: bodyCrear }), {} as any, () => {});
      expect(res!.statusCode).toBe(500);
    });
  });

  describe("actualizarPN()", () => {
    it("retorna 200 con datos actualizados", async () => {
      mockRepo.actualizar.mockResolvedValueOnce({ ...itemPN, importeMaximo: 2000, pips: 75 });
      const res = await actualizarPN(mockEvent({ pathParameters: { id: "001" }, body: bodyActualizar }), {} as any, () => {});
      expect(res!.statusCode).toBe(200);
      expect(JSON.parse(res!.body).importeMaximo).toBe(2000);
    });

    it("retorna 400 FX-MNT-031 sin id", async () => {
      const res = await actualizarPN(mockEvent({ body: bodyActualizar }), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-031");
    });

    it("retorna 400 FX-MNT-032 importeMaximo negativo", async () => {
      const res = await actualizarPN(mockEvent({ pathParameters: { id: "001" }, body: JSON.stringify({ importeMaximo: -1, pips: 75 }) }), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-032");
    });

    it("retorna 404 FX-MNT-033 id no existe", async () => {
      mockRepo.actualizar.mockResolvedValueOnce(null);
      const res = await actualizarPN(mockEvent({ pathParameters: { id: "999" }, body: bodyActualizar }), {} as any, () => {});
      expect(res!.statusCode).toBe(404);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-033");
    });

    it("retorna 500 ante error", async () => {
      mockRepo.actualizar.mockRejectedValueOnce(new Error("err"));
      const res = await actualizarPN(mockEvent({ pathParameters: { id: "001" }, body: bodyActualizar }), {} as any, () => {});
      expect(res!.statusCode).toBe(500);
    });
  });

  describe("eliminarPN()", () => {
    it("retorna 204 al eliminar", async () => {
      mockRepo.eliminar.mockResolvedValueOnce(true);
      const res = await eliminarPN(mockEvent({ pathParameters: { id: "001" } }), {} as any, () => {});
      expect(res!.statusCode).toBe(204);
    });

    it("retorna 400 FX-MNT-031 sin id", async () => {
      const res = await eliminarPN(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-031");
    });

    it("retorna 404 FX-MNT-034 id no existe", async () => {
      mockRepo.eliminar.mockResolvedValueOnce(false);
      const res = await eliminarPN(mockEvent({ pathParameters: { id: "999" } }), {} as any, () => {});
      expect(res!.statusCode).toBe(404);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-034");
    });

    it("retorna 500 ante error", async () => {
      mockRepo.eliminar.mockRejectedValueOnce(new Error("err"));
      const res = await eliminarPN(mockEvent({ pathParameters: { id: "001" } }), {} as any, () => {});
      expect(res!.statusCode).toBe(500);
    });
  });

  describe("listarPJ()", () => {
    it("retorna 200 con tipoPersoneria PJ", async () => {
      mockRepo.listar.mockResolvedValueOnce([{ ...itemPN, tipoPersoneria: "PJ" as const }]);
      const res = await listarPJ(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(200);
      expect(JSON.parse(res!.body).tipoPersoneria).toBe("PJ");
    });
  });

  describe("crearPJ()", () => {
    it("retorna 201 con rango PJ creado", async () => {
      mockRepo.crear.mockResolvedValueOnce({ data: { ...itemPN, tipoPersoneria: "PJ" as const, importeMaximo: 1000 } });
      const res = await crearPJ(mockEvent({ body: JSON.stringify({ importeMaximo: 1000, pips: 100 }) }), {} as any, () => {});
      expect(res!.statusCode).toBe(201);
    });
  });

  describe("actualizarPJ()", () => {
    it("retorna 404 FX-MNT-033 id PJ no existe", async () => {
      mockRepo.actualizar.mockResolvedValueOnce(null);
      const res = await actualizarPJ(mockEvent({ pathParameters: { id: "999" }, body: bodyActualizar }), {} as any, () => {});
      expect(res!.statusCode).toBe(404);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-033");
    });
  });

  describe("eliminarPJ()", () => {
    it("retorna 204 al eliminar PJ", async () => {
      mockRepo.eliminar.mockResolvedValueOnce(true);
      const res = await eliminarPJ(mockEvent({ pathParameters: { id: "001" } }), {} as any, () => {});
      expect(res!.statusCode).toBe(204);
    });
  });
});
