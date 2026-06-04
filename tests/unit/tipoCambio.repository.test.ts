import { TipoCambioRepository } from "../../src/repositories/tipoCambio.repository";
import { dynamo } from "../../src/repositories/dynamodb.client";

jest.mock("../../src/repositories/dynamodb.client", () => ({
  dynamo: { send: jest.fn() },
  TABLE: "tablero-test",
}));

const mockSend = dynamo.send as jest.Mock;

const tcBaseUSD: any = {
  pk: "TC_BASE#USD_PEN", sk: "ACTIVO", tipo: "TC_BASE",
  parMoneda: "USD_PEN", monedaOrigen: "USD", monedaDestino: "PEN",
  fuente: "DATATEC",
  fuenteCompra: "TIPO CAMBIO DATATEC COMPRA", valorCompra: 3.368,
  fuenteVenta: "TIPO CAMBIO DATATEC VENTA",   valorVenta: 3.370,
  ultimaActualizacion: "2026-02-05T08:00:00Z",
  estadoVentana: "CERRADO", esEdicionManual: false,
  updatedAt: "2026-02-05T08:00:00Z", updatedBy: "SISTEMA",
};

const auditoriaItem: any = {
  pk: "TC_BASE#USD_PEN", sk: "AUDITORIA#2026-06-03T10:00:00Z",
  tipo: "TC_BASE_AUDITORIA", parMoneda: "USD_PEN",
  valorCompraAnterior: 3.360, valorCompraNuevo: 3.368,
  valorVentaAnterior: 3.362, valorVentaNuevo: 3.370,
  esEdicionManual: true, motivoEdicion: "Contingencia",
  updatedAt: "2026-06-03T10:00:00Z", updatedBy: "ANA.TORRES",
};

describe("TipoCambioRepository", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("listarBase()", () => {
    it("retorna lista mapeada sin pk/sk/tipo", async () => {
      mockSend.mockResolvedValueOnce({ Items: [tcBaseUSD] });
      const r = await TipoCambioRepository.listarBase();
      expect(r[0].parMoneda).toBe("USD_PEN");
      expect(r[0]).not.toHaveProperty("pk");
      expect(r[0]).not.toHaveProperty("sk");
      expect(r[0]).not.toHaveProperty("tipo");
    });
    it("retorna vacío sin items", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      expect(await TipoCambioRepository.listarBase()).toEqual([]);
    });
    it("filtra por tipo=TC_BASE y SK=ACTIVO", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      await TipoCambioRepository.listarBase();
      const arg = mockSend.mock.calls[0][0].input;
      expect(arg.ExpressionAttributeValues[":tipo"]).toBe("TC_BASE");
      expect(arg.ExpressionAttributeValues[":sk"]).toBe("ACTIVO");
    });
  });

  describe("obtenerBaseActivo()", () => {
    it("retorna TCBase cuando existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: tcBaseUSD });
      const r = await TipoCambioRepository.obtenerBaseActivo("USD_PEN");
      expect(r?.parMoneda).toBe("USD_PEN");
    });
    it("retorna null cuando no existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      expect(await TipoCambioRepository.obtenerBaseActivo("USD_PEN")).toBeNull();
    });
    it("construye PK y SK correctamente", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      await TipoCambioRepository.obtenerBaseActivo("USD_PEN");
      const arg = mockSend.mock.calls[0][0].input;
      expect(arg.Key.PK).toBe("TC_BASE#USD_PEN");
      expect(arg.Key.SK).toBe("ACTIVO");
    });
  });

  describe("actualizarBase()", () => {
    it("retorna NO_ENCONTRADO si no existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      const r = await TipoCambioRepository.actualizarBase("USD_PEN", 3.370, 3.375, "Test", "SISTEMA");
      expect(r.error).toBe("NO_ENCONTRADO");
    });

    it("ejecuta UpdateCommand + PutCommand (auditoría)", async () => {
      mockSend
        .mockResolvedValueOnce({ Item: tcBaseUSD })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});
      await TipoCambioRepository.actualizarBase("USD_PEN", 3.370, 3.375, "Motivo", "ANA.TORRES");
      expect(mockSend).toHaveBeenCalledTimes(3);
    });

    it("retorna datos actualizados con esEdicionManual=true", async () => {
      mockSend
        .mockResolvedValueOnce({ Item: tcBaseUSD })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});
      const r = await TipoCambioRepository.actualizarBase("USD_PEN", 3.370, 3.375, "Motivo", "ANA.TORRES");
      expect(r.data?.valorCompra).toBe(3.370);
      expect(r.data?.valorVenta).toBe(3.375);
      expect(r.data?.esEdicionManual).toBe(true);
      expect(r.data?.updatedBy).toBe("ANA.TORRES");
    });

    it("auditoría registra valores anteriores y nuevos", async () => {
      mockSend
        .mockResolvedValueOnce({ Item: tcBaseUSD })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});
      await TipoCambioRepository.actualizarBase("USD_PEN", 3.370, 3.375, "Motivo", "SISTEMA");
      const putArg = mockSend.mock.calls[2][0].input;
      expect(putArg.Item.valorCompraAnterior).toBe(3.368);
      expect(putArg.Item.valorCompraNuevo).toBe(3.370);
      expect(putArg.Item.motivoEdicion).toBe("Motivo");
      expect(putArg.Item.sk).toMatch(/^AUDITORIA#/);
    });
  });

  describe("obtenerAuditoria()", () => {
    it("retorna historial mapeado y ordenado DESC", async () => {
      const aud2: any = { ...auditoriaItem, sk: "AUDITORIA#2026-06-01T08:00:00Z" };
      mockSend.mockResolvedValueOnce({ Items: [aud2, auditoriaItem] });
      const r = await TipoCambioRepository.obtenerAuditoria("USD_PEN");
      expect(r[0].timestamp).toBe("2026-06-03T10:00:00Z");
      expect(r[1].timestamp).toBe("2026-06-01T08:00:00Z");
    });
    it("retorna vacío sin auditorías", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      expect(await TipoCambioRepository.obtenerAuditoria("USD_PEN")).toEqual([]);
    });
    it("usa QueryCommand con begins_with AUDITORIA#", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      await TipoCambioRepository.obtenerAuditoria("USD_PEN");
      const arg = mockSend.mock.calls[0][0].input;
      expect(arg.ExpressionAttributeValues[":pk"]).toBe("TC_BASE#USD_PEN");
      expect(arg.ExpressionAttributeValues[":sk"]).toBe("AUDITORIA#");
    });
  });

  describe("listarVentanilla()", () => {
    const ventItem: any = {
      pk: "TC_VENTANILLA#USD_PEN", sk: "SEGMENTO#EMPLEADO", tipo: "TC_VENTANILLA",
      parMoneda: "USD_PEN", segmento: "EMPLEADO",
      tcBaseCompraRef: 3.368, tcBaseVentaRef: 3.370,
      spreadCompraPips: -5, spreadVentaPips: 5,
      valorCompra: 3.3675, valorVenta: 3.3705,
      enviadoAt: "2026-06-03T10:00:00Z", enviadoBy: "ANA.TORRES",
    };
    it("retorna registros mapeados", async () => {
      mockSend.mockResolvedValueOnce({ Items: [ventItem] });
      const r = await TipoCambioRepository.listarVentanilla("USD_PEN");
      expect(r[0].segmento).toBe("EMPLEADO");
      expect(r[0]).not.toHaveProperty("pk");
    });
    it("usa QueryCommand con PK=TC_VENTANILLA#USD_PEN", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      await TipoCambioRepository.listarVentanilla("USD_PEN");
      expect(mockSend.mock.calls[0][0].input.ExpressionAttributeValues[":pk"]).toBe("TC_VENTANILLA#USD_PEN");
    });
  });

  describe("enviarVentanilla()", () => {
    const seg4 = [
      { segmento: "EMPLEADO",    spreadCompraPips: -5,   spreadVentaPips: 5   },
      { segmento: "PREMIUM",     spreadCompraPips: -55,  spreadVentaPips: 55  },
      { segmento: "PREFERENCIAL",spreadCompraPips: -180, spreadVentaPips: 180 },
      { segmento: "PIZARRA",     spreadCompraPips: -220, spreadVentaPips: 220 },
    ];

    it("retorna TC_BASE_NO_ENCONTRADO si no hay TC Base activo", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      const r = await TipoCambioRepository.enviarVentanilla("USD_PEN", seg4 as any, "SISTEMA");
      expect(r.error).toBe("TC_BASE_NO_ENCONTRADO");
    });

    it("calcula valorCompra y valorVenta correctamente", async () => {
      mockSend.mockResolvedValueOnce({ Item: tcBaseUSD }).mockResolvedValueOnce({});
      const r = await TipoCambioRepository.enviarVentanilla("USD_PEN", seg4 as any, "ANA.TORRES");
      const empleado = r.data?.find((s) => s.segmento === "EMPLEADO");
      expect(empleado?.valorCompra).toBe(3.3675);
      expect(empleado?.valorVenta).toBe(3.3705);
    });

    it("guarda tcBaseCompraRef y tcBaseVentaRef del TC Base actual", async () => {
      mockSend.mockResolvedValueOnce({ Item: tcBaseUSD }).mockResolvedValueOnce({});
      const r = await TipoCambioRepository.enviarVentanilla("USD_PEN", seg4 as any, "SISTEMA");
      expect(r.data?.[0].tcBaseCompraRef).toBe(3.368);
      expect(r.data?.[0].tcBaseVentaRef).toBe(3.370);
    });

    it("llama BatchWriteCommand con 4 items", async () => {
      mockSend.mockResolvedValueOnce({ Item: tcBaseUSD }).mockResolvedValueOnce({});
      await TipoCambioRepository.enviarVentanilla("USD_PEN", seg4 as any, "SISTEMA");
      const batchArg = mockSend.mock.calls[1][0].input;
      expect(batchArg.RequestItems["tablero-test"]).toHaveLength(4);
    });
  });
});
