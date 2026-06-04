import { APIGatewayProxyEvent } from "aws-lambda";
import { obtenerBase, editarBase, auditoriaBase, obtenerVentanilla, enviarVentanilla } from "../../src/handlers/tipoCambio.handler";
import { TipoCambioRepository } from "../../src/repositories/tipoCambio.repository";

jest.mock("../../src/repositories/tipoCambio.repository");
const mockRepo = TipoCambioRepository as jest.Mocked<typeof TipoCambioRepository>;

const mockEvent = (o: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent =>
  ({ pathParameters: null, body: null, requestContext: { authorizer: null } as any,
     headers: {}, multiValueHeaders: {}, httpMethod: "GET", isBase64Encoded: false,
     path: "/", queryStringParameters: null, multiValueQueryStringParameters: null,
     stageVariables: null, resource: "/", ...o } as APIGatewayProxyEvent);

const tcBaseResponse = {
  parMoneda: "USD_PEN", monedaOrigen: "USD", monedaDestino: "PEN",
  fuente: "DATATEC", fuenteCompra: "COMPRA", valorCompra: 3.368,
  fuenteVenta: "VENTA", valorVenta: 3.370,
  ultimaActualizacion: "2026-02-05T08:00:00Z",
  estadoVentana: "CERRADO", esEdicionManual: false,
  updatedAt: "2026-02-05T08:00:00Z", updatedBy: "SISTEMA",
};

const auditoriaResponse = {
  timestamp: "2026-06-03T10:00:00Z",
  valorCompraAnterior: 3.368, valorCompraNuevo: 3.370,
  valorVentaAnterior: 3.370, valorVentaNuevo: 3.375,
  esEdicionManual: true, motivoEdicion: "Contingencia",
  updatedBy: "ANA.TORRES",
};

const ventResponse = {
  segmento: "EMPLEADO", tcBaseCompraRef: 3.368, tcBaseVentaRef: 3.370,
  spreadCompraPips: -5, spreadVentaPips: 5,
  valorCompra: 3.3675, valorVenta: 3.3705,
  enviadoAt: "2026-06-03T10:00:00Z", enviadoBy: "ANA.TORRES",
};

const seg4Body = JSON.stringify({
  segmentos: [
    { segmento: "EMPLEADO",    spreadCompraPips: -5,   spreadVentaPips: 5   },
    { segmento: "PREMIUM",     spreadCompraPips: -55,  spreadVentaPips: 55  },
    { segmento: "PREFERENCIAL",spreadCompraPips: -180, spreadVentaPips: 180 },
    { segmento: "PIZARRA",     spreadCompraPips: -220, spreadVentaPips: 220 },
  ],
});

describe("tipoCambio.handler", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("obtenerBase()", () => {
    it("retorna 200 con TC Base", async () => {
      mockRepo.listarBase.mockResolvedValueOnce([tcBaseResponse]);
      const res = await obtenerBase(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(200);
      expect(JSON.parse(res!.body).total).toBe(1);
    });
    it("retorna 500 ante error", async () => {
      mockRepo.listarBase.mockRejectedValueOnce(new Error("err"));
      expect((await obtenerBase(mockEvent(), {} as any, () => {}))!.statusCode).toBe(500);
    });
  });

  describe("editarBase()", () => {
    const bodyValido = JSON.stringify({ valorCompra: 3.370, valorVenta: 3.375, motivoEdicion: "Contingencia" });
    it("retorna 200 actualizado", async () => {
      mockRepo.actualizarBase.mockResolvedValueOnce({ data: { ...tcBaseResponse, valorCompra: 3.370 } });
      const res = await editarBase(mockEvent({ pathParameters: { parMoneda: "USD_PEN" }, body: bodyValido }), {} as any, () => {});
      expect(res!.statusCode).toBe(200);
    });
    it("retorna 400 FX-TC-001 parMoneda inválido", async () => {
      const res = await editarBase(mockEvent({ pathParameters: { parMoneda: "GBP_PEN" }, body: bodyValido }), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-TC-001");
    });
    it("retorna 400 FX-TC-002 valorVenta < valorCompra", async () => {
      const res = await editarBase(mockEvent({ pathParameters: { parMoneda: "USD_PEN" }, body: JSON.stringify({ valorCompra: 3.375, valorVenta: 3.368, motivoEdicion: "test" }) }), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-TC-002");
    });
    it("retorna 400 FX-TC-002 motivoEdicion vacío", async () => {
      const res = await editarBase(mockEvent({ pathParameters: { parMoneda: "USD_PEN" }, body: JSON.stringify({ valorCompra: 3.368, valorVenta: 3.370, motivoEdicion: "" }) }), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-TC-002");
    });
    it("retorna 404 FX-TC-003 no existe", async () => {
      mockRepo.actualizarBase.mockResolvedValueOnce({ error: "NO_ENCONTRADO" });
      const res = await editarBase(mockEvent({ pathParameters: { parMoneda: "USD_PEN" }, body: bodyValido }), {} as any, () => {});
      expect(res!.statusCode).toBe(404);
      expect(JSON.parse(res!.body).codigo).toBe("FX-TC-003");
    });
    it("retorna 500 ante error", async () => {
      mockRepo.actualizarBase.mockRejectedValueOnce(new Error("err"));
      const res = await editarBase(mockEvent({ pathParameters: { parMoneda: "USD_PEN" }, body: bodyValido }), {} as any, () => {});
      expect(res!.statusCode).toBe(500);
    });
  });

  describe("auditoriaBase()", () => {
    it("retorna 200 con historial", async () => {
      mockRepo.obtenerAuditoria.mockResolvedValueOnce([auditoriaResponse]);
      const res = await auditoriaBase(mockEvent({ pathParameters: { parMoneda: "USD_PEN" } }), {} as any, () => {});
      expect(res!.statusCode).toBe(200);
      const b = JSON.parse(res!.body);
      expect(b.parMoneda).toBe("USD_PEN");
      expect(b.total).toBe(1);
    });
    it("retorna 400 FX-TC-001 parMoneda inválido", async () => {
      const res = await auditoriaBase(mockEvent({ pathParameters: { parMoneda: "INVALIDO" } }), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-TC-001");
    });
    it("retorna 500 ante error", async () => {
      mockRepo.obtenerAuditoria.mockRejectedValueOnce(new Error("err"));
      const res = await auditoriaBase(mockEvent({ pathParameters: { parMoneda: "USD_PEN" } }), {} as any, () => {});
      expect(res!.statusCode).toBe(500);
    });
  });

  describe("obtenerVentanilla()", () => {
    it("retorna 200 con segmentos", async () => {
      mockRepo.listarVentanilla.mockResolvedValueOnce([ventResponse]);
      const res = await obtenerVentanilla(mockEvent({ pathParameters: { parMoneda: "USD_PEN" } }), {} as any, () => {});
      expect(res!.statusCode).toBe(200);
      expect(JSON.parse(res!.body).parMoneda).toBe("USD_PEN");
    });
    it("retorna 400 FX-TC-001 parMoneda inválido", async () => {
      const res = await obtenerVentanilla(mockEvent({ pathParameters: { parMoneda: "INVALIDO" } }), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-TC-001");
    });
    it("retorna 500 ante error", async () => {
      mockRepo.listarVentanilla.mockRejectedValueOnce(new Error("err"));
      const res = await obtenerVentanilla(mockEvent({ pathParameters: { parMoneda: "USD_PEN" } }), {} as any, () => {});
      expect(res!.statusCode).toBe(500);
    });
  });

  describe("enviarVentanilla()", () => {
    it("retorna 201 con 4 segmentos", async () => {
      mockRepo.enviarVentanilla.mockResolvedValueOnce({ data: [ventResponse, ventResponse, ventResponse, ventResponse] });
      const res = await enviarVentanilla(mockEvent({ pathParameters: { parMoneda: "USD_PEN" }, body: seg4Body }), {} as any, () => {});
      expect(res!.statusCode).toBe(201);
      expect(JSON.parse(res!.body).total).toBe(4);
    });
    it("retorna 400 FX-TC-001 parMoneda inválido", async () => {
      const res = await enviarVentanilla(mockEvent({ pathParameters: { parMoneda: "INVALIDO" }, body: seg4Body }), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-TC-001");
    });
    it("retorna 400 FX-TC-004 menos de 4 segmentos", async () => {
      const body3 = JSON.stringify({ segmentos: [{ segmento: "EMPLEADO", spreadCompraPips: 0, spreadVentaPips: 0 }, { segmento: "PREMIUM", spreadCompraPips: 0, spreadVentaPips: 0 }, { segmento: "PREFERENCIAL", spreadCompraPips: 0, spreadVentaPips: 0 }] });
      const res = await enviarVentanilla(mockEvent({ pathParameters: { parMoneda: "USD_PEN" }, body: body3 }), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-TC-004");
    });
    it("retorna 400 FX-TC-004 spreadCompraPips decimal", async () => {
      const bodyDecimal = JSON.stringify({ segmentos: [{ segmento: "EMPLEADO", spreadCompraPips: 10.5, spreadVentaPips: 5 }, { segmento: "PREMIUM", spreadCompraPips: 0, spreadVentaPips: 0 }, { segmento: "PREFERENCIAL", spreadCompraPips: 0, spreadVentaPips: 0 }, { segmento: "PIZARRA", spreadCompraPips: 0, spreadVentaPips: 0 }] });
      const res = await enviarVentanilla(mockEvent({ pathParameters: { parMoneda: "USD_PEN" }, body: bodyDecimal }), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-TC-004");
    });
    it("retorna 404 FX-TC-003 TC Base no encontrado", async () => {
      mockRepo.enviarVentanilla.mockResolvedValueOnce({ error: "TC_BASE_NO_ENCONTRADO" });
      const res = await enviarVentanilla(mockEvent({ pathParameters: { parMoneda: "USD_PEN" }, body: seg4Body }), {} as any, () => {});
      expect(res!.statusCode).toBe(404);
      expect(JSON.parse(res!.body).codigo).toBe("FX-TC-003");
    });
    it("retorna 500 ante error", async () => {
      mockRepo.enviarVentanilla.mockRejectedValueOnce(new Error("err"));
      const res = await enviarVentanilla(mockEvent({ pathParameters: { parMoneda: "USD_PEN" }, body: seg4Body }), {} as any, () => {});
      expect(res!.statusCode).toBe(500);
    });
  });
});
