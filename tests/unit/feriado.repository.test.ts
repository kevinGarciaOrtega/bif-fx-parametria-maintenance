import { FeriadoRepository } from "../../src/repositories/feriado.repository";
import { dynamo } from "../../src/repositories/dynamodb.client";

jest.mock("../../src/repositories/dynamodb.client", () => ({
  dynamo: { send: jest.fn() },
  TABLE: "tablero-test",
}));

const mockSend = dynamo.send as jest.Mock;

const itemDynamo = {
  pk: "FERIADO#2026", sk: "FECHA#2026-01-01", tipo: "FERIADO",
  anio: 2026, fecha: "2026-01-01", descripcion: "Año Nuevo",
  createdAt: "2026-01-01T00:00:00Z", createdBy: "ROBERT.GARCIA",
};

describe("FeriadoRepository", () => {

  beforeEach(() => jest.clearAllMocks());

  describe("listarPorAnio()", () => {
    it("retorna feriados mapeados sin pk, sk, tipo", async () => {
      mockSend.mockResolvedValueOnce({ Items: [itemDynamo] });
      const result = await FeriadoRepository.listarPorAnio(2026);
      expect(result[0]).not.toHaveProperty("pk");
      expect(result[0]).not.toHaveProperty("sk");
      expect(result[0]).not.toHaveProperty("tipo");
      expect(result[0].fecha).toBe("2026-01-01");
    });
    it("usa QueryCommand con PK=FERIADO#2026 y begins_with SK=FECHA#", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      await FeriadoRepository.listarPorAnio(2026);
      const arg = mockSend.mock.calls[0][0].input;
      expect(arg.ExpressionAttributeValues[":pk"]).toBe("FERIADO#2026");
      expect(arg.ExpressionAttributeValues[":sk"]).toBe("FECHA#");
    });
    it("retorna array vacío cuando no hay feriados", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      expect(await FeriadoRepository.listarPorAnio(2025)).toEqual([]);
    });
  });

  describe("existeFeriado()", () => {
    it("retorna true cuando existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: itemDynamo });
      expect(await FeriadoRepository.existeFeriado("2026-01-01")).toBe(true);
    });
    it("retorna false cuando no existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      expect(await FeriadoRepository.existeFeriado("2026-06-15")).toBe(false);
    });
    it("construye PK=FERIADO#2026 y SK=FECHA#2026-01-01", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      await FeriadoRepository.existeFeriado("2026-01-01");
      const arg = mockSend.mock.calls[0][0].input;
      expect(arg.Key.PK).toBe("FERIADO#2026");
      expect(arg.Key.SK).toBe("FECHA#2026-01-01");
    });
  });

  describe("crear()", () => {
    it("retorna null si el feriado ya existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: itemDynamo });
      expect(await FeriadoRepository.crear("2026-01-01", "Año Nuevo", "SISTEMA")).toBeNull();
    });
    it("crea el feriado y retorna FeriadoResponse", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined }).mockResolvedValueOnce({});
      const result = await FeriadoRepository.crear("2026-07-28", "Fiestas Patrias", "ANA.TORRES");
      expect(result?.fecha).toBe("2026-07-28");
      expect(result?.descripcion).toBe("Fiestas Patrias");
    });
    it("PK del PutCommand es FERIADO#2026", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined }).mockResolvedValueOnce({});
      await FeriadoRepository.crear("2026-07-28", "", "SISTEMA");
      const putArg = mockSend.mock.calls[1][0].input;
      expect(putArg.Item.pk).toBe("FERIADO#2026");
      expect(putArg.Item.sk).toBe("FECHA#2026-07-28");
    });
  });

  describe("eliminar()", () => {
    it("retorna false si el feriado no existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      expect(await FeriadoRepository.eliminar("2026-06-15")).toBe(false);
    });
    it("retorna true y llama DeleteCommand cuando existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: itemDynamo }).mockResolvedValueOnce({});
      expect(await FeriadoRepository.eliminar("2026-01-01")).toBe(true);
    });
    it("DeleteCommand usa PK=FERIADO#2026 SK=FECHA#2026-01-01", async () => {
      mockSend.mockResolvedValueOnce({ Item: itemDynamo }).mockResolvedValueOnce({});
      await FeriadoRepository.eliminar("2026-01-01");
      const deleteArg = mockSend.mock.calls[1][0].input;
      expect(deleteArg.Key.PK).toBe("FERIADO#2026");
      expect(deleteArg.Key.SK).toBe("FECHA#2026-01-01");
    });
  });
});
