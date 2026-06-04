import { HorarioMercadoRepository } from "../../src/repositories/horarioMercado.repository";
import { dynamo } from "../../src/repositories/dynamodb.client";

jest.mock("../../src/repositories/dynamodb.client", () => ({
  dynamo: { send: jest.fn() },
  TABLE: "tablero-test",
}));

const mockSend = dynamo.send as jest.Mock;

const itemDynamo = {
  pk: "HORARIO#001", sk: "METADATA", tipo: "HORARIO",
  id: "001", nombre: "Horario de mercado abierto",
  horaApertura: "09:00", horaCierre: "15:00",
  pips: 120, updatedAt: "2026-05-25T08:30:00Z", updatedBy: "ROBERT.GARCIA",
};

const responseEsperado = {
  id: "001", nombre: "Horario de mercado abierto",
  horaApertura: "09:00", horaCierre: "15:00",
  pips: 120, updatedAt: "2026-05-25T08:30:00Z", updatedBy: "ROBERT.GARCIA",
};

describe("HorarioMercadoRepository", () => {

  beforeEach(() => jest.clearAllMocks());

  describe("listarTodos()", () => {
    it("retorna lista mapeada sin pk, sk, tipo", async () => {
      mockSend.mockResolvedValueOnce({ Items: [itemDynamo] });
      const result = await HorarioMercadoRepository.listarTodos();
      expect(result[0]).toEqual(responseEsperado);
      expect(result[0]).not.toHaveProperty("pk");
      expect(result[0]).not.toHaveProperty("sk");
      expect(result[0]).not.toHaveProperty("tipo");
    });
    it("retorna array vacío sin items", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      expect(await HorarioMercadoRepository.listarTodos()).toEqual([]);
    });
    it("usa FilterExpression tipo=HORARIO", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      await HorarioMercadoRepository.listarTodos();
      const arg = mockSend.mock.calls[0][0].input;
      expect(arg.ExpressionAttributeValues[":tipo"]).toBe("HORARIO");
    });
  });

  describe("obtenerPorId()", () => {
    it("retorna respuesta mapeada cuando existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: itemDynamo });
      expect(await HorarioMercadoRepository.obtenerPorId("001")).toEqual(responseEsperado);
    });
    it("retorna null cuando no existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      expect(await HorarioMercadoRepository.obtenerPorId("999")).toBeNull();
    });
    it("construye PK correctamente HORARIO#001", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      await HorarioMercadoRepository.obtenerPorId("001");
      const arg = mockSend.mock.calls[0][0].input;
      expect(arg.Key.PK).toBe("HORARIO#001");
      expect(arg.Key.SK).toBe("METADATA");
    });
  });

  describe("actualizar()", () => {
    it("retorna null si no existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      expect(await HorarioMercadoRepository.actualizar("999", 130, "08:00", "14:00", "SISTEMA")).toBeNull();
    });
    it("UpdateExpression contiene pips, horaApertura, horaCierre, updatedAt, updatedBy", async () => {
      mockSend.mockResolvedValueOnce({ Item: itemDynamo }).mockResolvedValueOnce({});
      await HorarioMercadoRepository.actualizar("001", 130, "08:00", "14:00", "ANA.TORRES");
      const updateArg = mockSend.mock.calls[1][0].input;
      expect(updateArg.UpdateExpression).toContain("pips");
      expect(updateArg.UpdateExpression).toContain("horaApertura");
      expect(updateArg.UpdateExpression).toContain("horaCierre");
      expect(updateArg.UpdateExpression).toContain("updatedAt");
      expect(updateArg.UpdateExpression).toContain("updatedBy");
    });
    it("UpdateExpression NO contiene nombre", async () => {
      mockSend.mockResolvedValueOnce({ Item: itemDynamo }).mockResolvedValueOnce({});
      await HorarioMercadoRepository.actualizar("001", 130, "08:00", "14:00", "SISTEMA");
      const updateArg = mockSend.mock.calls[1][0].input;
      expect(updateArg.UpdateExpression).not.toContain("nombre");
    });
    it("retorna objeto con nuevos valores", async () => {
      mockSend.mockResolvedValueOnce({ Item: itemDynamo }).mockResolvedValueOnce({});
      const result = await HorarioMercadoRepository.actualizar("001", 130, "08:00", "14:00", "SISTEMA");
      expect(result?.pips).toBe(130);
      expect(result?.horaApertura).toBe("08:00");
      expect(result?.horaCierre).toBe("14:00");
      expect(result?.nombre).toBe("Horario de mercado abierto");
    });
  });
});
