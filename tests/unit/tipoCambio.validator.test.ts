import { TCBaseUpdateSchema } from "../../src/validators/schemas";

describe("TCBaseUpdateSchema", () => {

  it("debe aceptar valores válidos", () => {
    const result = TCBaseUpdateSchema.safeParse({
      valorCompra: 3.368,
      valorVenta: 3.370,
      motivoEdicion: "Contingencia Datatec",
    });
    expect(result.success).toBe(true);
  });

  it("debe rechazar cuando venta < compra", () => {
    const result = TCBaseUpdateSchema.safeParse({
      valorCompra: 3.370,
      valorVenta: 3.368,
      motivoEdicion: "test",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe(
        "Valor venta debe ser >= valor compra"
      );
    }
  });

  it("debe rechazar valores negativos", () => {
    const result = TCBaseUpdateSchema.safeParse({
      valorCompra: -1,
      valorVenta: 3.370,
      motivoEdicion: "test",
    });
    expect(result.success).toBe(false);
  });

  it("debe rechazar motivo vacío", () => {
    const result = TCBaseUpdateSchema.safeParse({
      valorCompra: 3.368,
      valorVenta: 3.370,
      motivoEdicion: "",
    });
    expect(result.success).toBe(false);
  });
});
