import { ParametroSistemaRepository } from "../../src/repositories/parametroSistema.repository";
import { dynamo, TABLE } from "../../src/repositories/dynamodb.client";

jest.mock("../../src/repositories/dynamodb.client", () => ({
  dynamo: { send: jest.fn() },
  TABLE: "tablero-test",
}));

const mockSend = dynamo.send as jest.Mock;

const itemDynamo = {
  pk: "PARAMETRO#GENERAL",
  sk: "PARAM#MONEDA",
  tipo: "PARAMETRO",
  grupo: "GENERAL",
  clave: "MONEDA",
  nombre: "Moneda Base",
  valor: "USD",
  tipoValor: "STRING" as const,
  updatedAt: "2026-05-25T08:30:00Z",
  updatedBy: "SISTEMA",
};

describe("ParametroSistemaRepository", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("listar()", () => {
    it("retorna grupos agrupados por grupo", async () => {
      mockSend.mockResolvedValueOnce({ Items: [itemDynamo] });
      const result = await ParametroSistemaRepository.listar();
      expect(result).toEqual([
        {
          grupo: "GENERAL",
          parametros: [
            {
              clave: "MONEDA",
              nombre: "Moneda Base",
              valor: "USD",
              tipoValor: "STRING",
              updatedAt: "2026-05-25T08:30:00Z",
              updatedBy: "SISTEMA",
            },
          ],
        },
      ]);
    });

    it("filtra por grupo cuando se provee", async () => {
      mockSend.mockResolvedValueOnce({ Items: [itemDynamo] });
      await ParametroSistemaRepository.listar("GENERAL");
      const callArg = mockSend.mock.calls[0][0].input;
      expect(callArg.FilterExpression).toContain("PK = :pk");
      expect(callArg.ExpressionAttributeValues[":pk"]).toBe("PARAMETRO#GENERAL");
    });

    it("utiliza PK cuando grupo viene indefinido", async () => {
      const itemWithoutGroup = { ...itemDynamo, grupo: undefined };
      mockSend.mockResolvedValueOnce({ Items: [itemWithoutGroup] });
      const result = await ParametroSistemaRepository.listar();
      expect(result).toEqual([
        {
          grupo: "GENERAL",
          parametros: [
            {
              clave: "MONEDA",
              nombre: "Moneda Base",
              valor: "USD",
              tipoValor: "STRING",
              updatedAt: "2026-05-25T08:30:00Z",
              updatedBy: "SISTEMA",
            },
          ],
        },
      ]);
    });
  });

  describe("obtenerPorClave()", () => {
    it("retorna el parámetro si existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: itemDynamo });
      const result = await ParametroSistemaRepository.obtenerPorClave("GENERAL", "MONEDA");
      expect(result).toEqual(itemDynamo);
    });

    it("retorna null si no existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      const result = await ParametroSistemaRepository.obtenerPorClave("GENERAL", "NO_EXISTE");
      expect(result).toBeNull();
    });
  });

  describe("actualizar()", () => {
    it("retorna null si el parámetro no existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      const result = await ParametroSistemaRepository.actualizar("GENERAL", "NO_EXISTE", "EUR", "SISTEMA");
      expect(result).toBeNull();
    });

    it("llama UpdateCommand con los valores correctos", async () => {
      mockSend.mockResolvedValueOnce({ Item: itemDynamo });
      mockSend.mockResolvedValueOnce({});

      const result = await ParametroSistemaRepository.actualizar("GENERAL", "MONEDA", "EUR", "ANA");
      expect(result).toEqual({
        grupo: "GENERAL",
        clave: "MONEDA",
        nombre: "Moneda Base",
        valor: "EUR",
        tipoValor: "STRING",
        updatedAt: expect.any(String),
        updatedBy: "ANA",
      });

      const updateArg = mockSend.mock.calls[1][0].input;
      expect(updateArg.UpdateExpression).toContain("#valor = :valor");
      expect(updateArg.ExpressionAttributeValues[":valor"]).toBe("EUR");
      expect(updateArg.ExpressionAttributeValues[":updatedBy"]).toBe("ANA");
      expect(updateArg.Key.PK).toBe("PARAMETRO#GENERAL");
      expect(updateArg.Key.SK).toBe("PARAM#MONEDA");
    });
  });
});
