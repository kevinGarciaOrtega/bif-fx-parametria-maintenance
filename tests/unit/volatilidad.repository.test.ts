import { VolatilidadRepository } from "../../src/repositories/volatilidad.repository";
import { dynamo, TABLE } from "../../src/repositories/dynamodb.client";

jest.mock("../../src/repositories/dynamodb.client", () => ({
  dynamo: { send: jest.fn() },
  TABLE: "tablero-test",
}));

// Helper: build a full Volatilidad DynamoDB item
const makeItem = (overrides: Partial<Record<string, unknown>> = {}) => ({
  pk: "VOLATILIDAD#EUR",
  sk: "METADATA",
  tipo: "VOLATILIDAD",
  id: "EUR",
  nombre: "Euro",
  pips: 10,
  estadoActual: true,
  updatedAt: "2024-01-01T00:00:00.000Z",
  updatedBy: "admin",
  ...overrides,
});

// Helper: expected VolatilidadResponse (no internal fields)
const makeResponse = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "EUR",
  nombre: "Euro",
  pips: 10,
  estadoActual: true,
  updatedAt: "2024-01-01T00:00:00.000Z",
  updatedBy: "admin",
  ...overrides,
});

describe("VolatilidadRepository", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  describe("listarTodos()", () => {

    it("retorna lista mapeada sin campos internos (pk, sk, tipo)", async () => {
      const item = makeItem();
      (dynamo.send as jest.Mock).mockResolvedValueOnce({ Items: [item] });

      const result = await VolatilidadRepository.listarTodos();

      expect(result).toHaveLength(1);
      const first = result[0];
      expect(first).toEqual(makeResponse());
      // Internal DynamoDB fields must NOT be present
      expect((first as any).pk).toBeUndefined();
      expect((first as any).sk).toBeUndefined();
      expect((first as any).tipo).toBeUndefined();
    });

    it("retorna array vacío cuando DynamoDB no tiene items", async () => {
      (dynamo.send as jest.Mock).mockResolvedValueOnce({ Items: undefined });

      const result = await VolatilidadRepository.listarTodos();

      expect(result).toEqual([]);
    });

    it("el FilterExpression usa tipo=VOLATILIDAD", async () => {
      (dynamo.send as jest.Mock).mockResolvedValueOnce({ Items: [] });

      await VolatilidadRepository.listarTodos();

      const [commandArg] = (dynamo.send as jest.Mock).mock.calls[0];
      const input = commandArg.input;
      expect(input.FilterExpression).toBe("#tipo = :tipo");
      expect(input.ExpressionAttributeValues[":tipo"]).toBe("VOLATILIDAD");
      expect(input.TableName).toBe(TABLE);
    });
  });

  // ─────────────────────────────────────────────
  describe("obtenerPorId(id)", () => {

    it("retorna VolatilidadResponse cuando el item existe", async () => {
      const item = makeItem();
      (dynamo.send as jest.Mock).mockResolvedValueOnce({ Item: item });

      const result = await VolatilidadRepository.obtenerPorId("EUR");

      expect(result).toEqual(makeResponse());
    });

    it("retorna null cuando el item no existe", async () => {
      (dynamo.send as jest.Mock).mockResolvedValueOnce({ Item: undefined });

      const result = await VolatilidadRepository.obtenerPorId("NOEXISTE");

      expect(result).toBeNull();
    });

    it("construye la PK correctamente: VOLATILIDAD#<id>", async () => {
      (dynamo.send as jest.Mock).mockResolvedValueOnce({ Item: undefined });

      await VolatilidadRepository.obtenerPorId("USD");

      const [commandArg] = (dynamo.send as jest.Mock).mock.calls[0];
      const input = commandArg.input;
      expect(input.Key).toEqual({ PK: "VOLATILIDAD#USD", SK: "METADATA" });
    });
  });

  // ─────────────────────────────────────────────
  describe("actualizar(id, pips, estadoActual, usuario)", () => {

    it("retorna null si la volatilidad no existe", async () => {
      // obtenerPorId returns null
      (dynamo.send as jest.Mock).mockResolvedValueOnce({ Item: undefined });

      const result = await VolatilidadRepository.actualizar("NOEXISTE", 5, true, "user1");

      expect(result).toBeNull();
      // UpdateCommand should NOT have been called
      expect((dynamo.send as jest.Mock).mock.calls).toHaveLength(1);
    });

    it("llama UpdateCommand con los 4 campos correctos", async () => {
      const existing = makeItem();
      (dynamo.send as jest.Mock)
        .mockResolvedValueOnce({ Item: existing })   // obtenerPorId
        .mockResolvedValueOnce({});                   // UpdateCommand

      await VolatilidadRepository.actualizar("EUR", 20, false, "operador");

      const updateCall = (dynamo.send as jest.Mock).mock.calls[1];
      const input = updateCall[0].input;
      expect(input.ExpressionAttributeValues[":pips"]).toBe(20);
      expect(input.ExpressionAttributeValues[":estadoActual"]).toBe(false);
      expect(input.ExpressionAttributeValues[":updatedBy"]).toBe("operador");
      expect(input.ExpressionAttributeValues[":updatedAt"]).toBeDefined();
    });

    it("NO incluye 'nombre' en el UpdateExpression", async () => {
      const existing = makeItem();
      (dynamo.send as jest.Mock)
        .mockResolvedValueOnce({ Item: existing })
        .mockResolvedValueOnce({});

      await VolatilidadRepository.actualizar("EUR", 20, false, "operador");

      const updateCall = (dynamo.send as jest.Mock).mock.calls[1];
      const input = updateCall[0].input;
      expect(input.UpdateExpression).not.toContain("nombre");
    });

    it("NO incluye 'pk', 'sk', 'tipo', 'id' en el UpdateExpression", async () => {
      const existing = makeItem();
      (dynamo.send as jest.Mock)
        .mockResolvedValueOnce({ Item: existing })
        .mockResolvedValueOnce({});

      await VolatilidadRepository.actualizar("EUR", 20, false, "operador");

      const updateCall = (dynamo.send as jest.Mock).mock.calls[1];
      const input = updateCall[0].input;
      const expr: string = input.UpdateExpression;
      expect(expr).not.toMatch(/\bpk\b/i);
      expect(expr).not.toMatch(/\bsk\b/i);
      expect(expr).not.toMatch(/\btipo\b/i);
      // "id" alone (not inside updatedAt / updatedBy)
      expect(expr).not.toMatch(/\bid\b/);
    });

    it("updatedAt es un ISO string del momento actual", async () => {
      const existing = makeItem();
      (dynamo.send as jest.Mock)
        .mockResolvedValueOnce({ Item: existing })
        .mockResolvedValueOnce({});

      const before = new Date().toISOString();
      const result = await VolatilidadRepository.actualizar("EUR", 20, false, "operador");
      const after = new Date().toISOString();

      expect(result).not.toBeNull();
      const updatedAt = result!.updatedAt;
      // Must be a valid ISO string
      expect(() => new Date(updatedAt)).not.toThrow();
      expect(new Date(updatedAt).toISOString()).toBe(updatedAt);
      // Must be within the test window
      expect(updatedAt >= before).toBe(true);
      expect(updatedAt <= after).toBe(true);
    });

    it("updatedBy toma el usuario recibido como parámetro", async () => {
      const existing = makeItem();
      (dynamo.send as jest.Mock)
        .mockResolvedValueOnce({ Item: existing })
        .mockResolvedValueOnce({});

      const result = await VolatilidadRepository.actualizar("EUR", 20, false, "mi-usuario");

      expect(result).not.toBeNull();
      expect(result!.updatedBy).toBe("mi-usuario");
    });

    it("retorna el objeto actualizado con los nuevos valores", async () => {
      const existing = makeItem();
      (dynamo.send as jest.Mock)
        .mockResolvedValueOnce({ Item: existing })
        .mockResolvedValueOnce({});

      const result = await VolatilidadRepository.actualizar("EUR", 99, false, "tester");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("EUR");
      expect(result!.nombre).toBe("Euro");
      expect(result!.pips).toBe(99);
      expect(result!.estadoActual).toBe(false);
      expect(result!.updatedBy).toBe("tester");
      // Internal fields must not be present
      expect((result as any).pk).toBeUndefined();
      expect((result as any).sk).toBeUndefined();
      expect((result as any).tipo).toBeUndefined();
    });
  });
});
