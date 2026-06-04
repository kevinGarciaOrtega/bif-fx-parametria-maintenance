import { VolatilidadRepository } from "../../src/repositories/volatilidad.repository";
import { dynamo, TABLE } from "../../src/repositories/dynamodb.client";

jest.mock("../../src/repositories/dynamodb.client", () => ({
  dynamo: { send: jest.fn() },
  TABLE: "tablero-test",
}));

const mockSend = dynamo.send as jest.Mock;

const itemDynamo = {
  pk: "VOLATILIDAD#001",
  sk: "METADATA",
  tipo: "VOLATILIDAD",
  id: "001",
  nombre: "Volatilidad Activa",
  pips: 100,
  estadoActual: false,
  updatedAt: "2026-05-25T08:30:00Z",
  updatedBy: "ROBERT.GARCIA",
};

const responseEsperado = {
  id: "001",
  nombre: "Volatilidad Activa",
  pips: 100,
  estadoActual: false,
  updatedAt: "2026-05-25T08:30:00Z",
  updatedBy: "ROBERT.GARCIA",
};

describe("VolatilidadRepository", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── listarTodos ───────────────────────────────────────────
  describe("listarTodos()", () => {

    it("retorna lista mapeada sin campos internos (pk, sk, tipo)", async () => {
      mockSend.mockResolvedValueOnce({ Items: [itemDynamo] });
      const result = await VolatilidadRepository.listarTodos();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(responseEsperado);
      expect(result[0]).not.toHaveProperty("pk");
      expect(result[0]).not.toHaveProperty("sk");
      expect(result[0]).not.toHaveProperty("tipo");
    });

    it("retorna array vacío cuando no hay items", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      const result = await VolatilidadRepository.listarTodos();
      expect(result).toEqual([]);
    });

    it("retorna array vacío cuando Items es undefined", async () => {
      mockSend.mockResolvedValueOnce({});
      const result = await VolatilidadRepository.listarTodos();
      expect(result).toEqual([]);
    });

    it("usa FilterExpression con tipo=VOLATILIDAD", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      await VolatilidadRepository.listarTodos();
      const callArg = mockSend.mock.calls[0][0].input;
      expect(callArg.FilterExpression).toBe("#tipo = :tipo");
      expect(callArg.ExpressionAttributeValues[":tipo"]).toBe("VOLATILIDAD");
    });
  });

  // ── obtenerPorId ──────────────────────────────────────────
  describe("obtenerPorId()", () => {

    it("retorna VolatilidadResponse cuando el item existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: itemDynamo });
      const result = await VolatilidadRepository.obtenerPorId("001");
      expect(result).toEqual(responseEsperado);
    });

    it("retorna null cuando el item no existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      const result = await VolatilidadRepository.obtenerPorId("999");
      expect(result).toBeNull();
    });

    it("construye la PK correctamente VOLATILIDAD#<id>", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      await VolatilidadRepository.obtenerPorId("001");
      const callArg = mockSend.mock.calls[0][0].input;
      expect(callArg.Key.PK).toBe("VOLATILIDAD#001");
      expect(callArg.Key.SK).toBe("METADATA");
    });
  });

  // ── actualizar ────────────────────────────────────────────
  describe("actualizar()", () => {

    it("retorna null si la volatilidad no existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      const result = await VolatilidadRepository.actualizar("999", 150, true, "SISTEMA");
      expect(result).toBeNull();
    });

    it("llama UpdateCommand con los 4 campos correctos", async () => {
      mockSend
        .mockResolvedValueOnce({ Item: itemDynamo }) // GetCommand
        .mockResolvedValueOnce({});                  // UpdateCommand

      await VolatilidadRepository.actualizar("001", 150, true, "ANA.TORRES");

      const updateArg = mockSend.mock.calls[1][0].input;
      expect(updateArg.UpdateExpression).toContain("pips");
      expect(updateArg.UpdateExpression).toContain("estadoActual");
      expect(updateArg.UpdateExpression).toContain("updatedAt");
      expect(updateArg.UpdateExpression).toContain("updatedBy");
    });

    it("UpdateExpression NO contiene nombre ni pk ni sk ni tipo ni id", async () => {
      mockSend
        .mockResolvedValueOnce({ Item: itemDynamo })
        .mockResolvedValueOnce({});

      await VolatilidadRepository.actualizar("001", 150, true, "SISTEMA");

      const updateArg = mockSend.mock.calls[1][0].input;
      expect(updateArg.UpdateExpression).not.toContain("nombre");
      expect(updateArg.UpdateExpression).not.toContain("#pk");
      expect(updateArg.UpdateExpression).not.toContain("#sk");
      expect(updateArg.UpdateExpression).not.toContain("#id");
    });

    it("updatedBy toma el usuario recibido como parámetro", async () => {
      mockSend
        .mockResolvedValueOnce({ Item: itemDynamo })
        .mockResolvedValueOnce({});

      const result = await VolatilidadRepository.actualizar("001", 150, true, "ANA.TORRES");
      expect(result?.updatedBy).toBe("ANA.TORRES");
    });

    it("retorna el objeto con los nuevos valores", async () => {
      mockSend
        .mockResolvedValueOnce({ Item: itemDynamo })
        .mockResolvedValueOnce({});

      const result = await VolatilidadRepository.actualizar("001", 150, true, "SISTEMA");
      expect(result?.pips).toBe(150);
      expect(result?.estadoActual).toBe(true);
      expect(result?.nombre).toBe("Volatilidad Activa");
    });

    it("updatedAt es un ISO string válido", async () => {
      mockSend
        .mockResolvedValueOnce({ Item: itemDynamo })
        .mockResolvedValueOnce({});

      const result = await VolatilidadRepository.actualizar("001", 150, true, "SISTEMA");
      expect(new Date(result!.updatedAt).toISOString()).toBe(result!.updatedAt);
    });
  });
});
