import { RangoImporteRepository } from "../../src/repositories/rangoImporte.repository";
import { dynamo } from "../../src/repositories/dynamodb.client";

jest.mock("../../src/repositories/dynamodb.client", () => ({
  dynamo: { send: jest.fn() },
  TABLE: "tablero-test",
}));

const mockSend = dynamo.send as jest.Mock;

const itemPN = {
  pk: "RANGO_PN#001",
  sk: "METADATA",
  tipo: "RANGO_PN",
  id: "001",
  tipoPersoneria: "PN",
  importeMinimo: 0,
  importeMaximo: 500,
  pips: 100,
  updatedAt: "2026-05-25T08:30:00Z",
  updatedBy: "ROBERT.GARCIA",
};

const responsePN = {
  id: "001",
  tipoPersoneria: "PN",
  importeMinimo: 0,
  importeMaximo: 500,
  pips: 100,
  updatedAt: "2026-05-25T08:30:00Z",
  updatedBy: "ROBERT.GARCIA",
};

describe("RangoImporteRepository", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("listar()", () => {
    it("retorna lista mapeada sin pk, sk, tipo", async () => {
      mockSend.mockResolvedValueOnce({ Items: [itemPN] });
      const result = await RangoImporteRepository.listar("PN");
      expect(result[0]).toEqual(responsePN);
      expect(result[0]).not.toHaveProperty("pk");
      expect(result[0]).not.toHaveProperty("sk");
      expect(result[0]).not.toHaveProperty("tipo");
    });

    it("retorna lista ordenada por importeMinimo ASC", async () => {
      const item2 = { ...itemPN, pk: "RANGO_PN#002", id: "002", importeMinimo: 500, importeMaximo: 1500 };
      mockSend.mockResolvedValueOnce({ Items: [item2, itemPN] });
      const result = await RangoImporteRepository.listar("PN");
      expect(result[0].importeMinimo).toBe(0);
      expect(result[1].importeMinimo).toBe(500);
    });

    it("retorna array vacío sin items", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      expect(await RangoImporteRepository.listar("PN")).toEqual([]);
    });

    it("usa FilterExpression tipo=RANGO_PN para PN", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      await RangoImporteRepository.listar("PN");
      expect(mockSend.mock.calls[0][0].input.ExpressionAttributeValues[":tipo"]).toBe("RANGO_PN");
    });

    it("usa FilterExpression tipo=RANGO_PJ para PJ", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      await RangoImporteRepository.listar("PJ");
      expect(mockSend.mock.calls[0][0].input.ExpressionAttributeValues[":tipo"]).toBe("RANGO_PJ");
    });
  });

  describe("crear()", () => {
    it("importeMinimo = 0 cuando no hay rangos previos", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] }).mockResolvedValueOnce({});
      const result = await RangoImporteRepository.crear("PN", 500, 100, "SISTEMA");
      expect(result.data?.importeMinimo).toBe(0);
      expect(result.data?.importeMaximo).toBe(500);
    });

    it("importeMinimo = max(importeMaximo) de rangos existentes", async () => {
      mockSend.mockResolvedValueOnce({ Items: [itemPN] }).mockResolvedValueOnce({});
      const result = await RangoImporteRepository.crear("PN", 1500, 80, "ANA.TORRES");
      expect(result.data?.importeMinimo).toBe(500);
      expect(result.data?.importeMaximo).toBe(1500);
    });

    it("retorna error IMPORTE_INVALIDO cuando importeMaximo <= importeMinimo", async () => {
      mockSend.mockResolvedValueOnce({ Items: [itemPN] });
      const result = await RangoImporteRepository.crear("PN", 400, 100, "SISTEMA");
      expect(result.error).toBe("IMPORTE_INVALIDO");
      expect(result.importeMinimoActual).toBe(500);
    });

    it("retorna error IMPORTE_INVALIDO cuando importeMaximo = importeMinimo", async () => {
      mockSend.mockResolvedValueOnce({ Items: [itemPN] });
      const result = await RangoImporteRepository.crear("PN", 500, 100, "SISTEMA");
      expect(result.error).toBe("IMPORTE_INVALIDO");
    });

    it("PK del PutCommand es RANGO_PN#<id>", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] }).mockResolvedValueOnce({});
      await RangoImporteRepository.crear("PN", 500, 100, "SISTEMA");
      const putArg = mockSend.mock.calls[1][0].input;
      expect(putArg.Item.pk).toMatch(/^RANGO_PN#/);
      expect(putArg.Item.sk).toBe("METADATA");
    });
  });

  describe("obtenerPorId()", () => {
    it("retorna respuesta mapeada cuando existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: itemPN });
      expect(await RangoImporteRepository.obtenerPorId("PN", "001")).toEqual(responsePN);
    });

    it("retorna null cuando no existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      expect(await RangoImporteRepository.obtenerPorId("PN", "999")).toBeNull();
    });

    it("construye PK RANGO_PN#001", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      await RangoImporteRepository.obtenerPorId("PN", "001");
      expect(mockSend.mock.calls[0][0].input.Key.PK).toBe("RANGO_PN#001");
    });
  });

  describe("actualizar()", () => {
    it("retorna null si no existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      expect(await RangoImporteRepository.actualizar("PN", "999", 2000, 75, "SISTEMA")).toBeNull();
    });

    it("UpdateExpression contiene importeMaximo, pips, updatedAt, updatedBy", async () => {
      mockSend.mockResolvedValueOnce({ Item: itemPN }).mockResolvedValueOnce({});
      await RangoImporteRepository.actualizar("PN", "001", 2000, 75, "ANA.TORRES");
      const u = mockSend.mock.calls[1][0].input.UpdateExpression;
      expect(u).toContain("importeMaximo");
      expect(u).toContain("pips");
      expect(u).toContain("updatedAt");
      expect(u).toContain("updatedBy");
    });

    it("UpdateExpression NO contiene importeMinimo", async () => {
      mockSend.mockResolvedValueOnce({ Item: itemPN }).mockResolvedValueOnce({});
      await RangoImporteRepository.actualizar("PN", "001", 2000, 75, "SISTEMA");
      expect(mockSend.mock.calls[1][0].input.UpdateExpression).not.toContain("importeMinimo");
    });

    it("retorna objeto con nuevos valores e importeMinimo original", async () => {
      mockSend.mockResolvedValueOnce({ Item: itemPN }).mockResolvedValueOnce({});
      const result = await RangoImporteRepository.actualizar("PN", "001", 2000, 75, "SISTEMA");
      expect(result?.importeMaximo).toBe(2000);
      expect(result?.pips).toBe(75);
      expect(result?.importeMinimo).toBe(0);
    });
  });

  describe("eliminar()", () => {
    it("retorna false si no existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      expect(await RangoImporteRepository.eliminar("PN", "999")).toBe(false);
    });

    it("retorna true y llama DeleteCommand cuando existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: itemPN }).mockResolvedValueOnce({});
      expect(await RangoImporteRepository.eliminar("PN", "001")).toBe(true);
    });

    it("DeleteCommand usa PK=RANGO_PN#001", async () => {
      mockSend.mockResolvedValueOnce({ Item: itemPN }).mockResolvedValueOnce({});
      await RangoImporteRepository.eliminar("PN", "001");
      expect(mockSend.mock.calls[1][0].input.Key.PK).toBe("RANGO_PN#001");
    });
  });
});
