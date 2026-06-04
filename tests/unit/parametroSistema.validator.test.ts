import { ParametroSistemaUpdateSchema } from "../../src/validators/schemas";

describe("ParametroSistemaUpdateSchema", () => {
  it("valida un body válido", () => {
    const result = ParametroSistemaUpdateSchema.safeParse({ valor: "100" });
    expect(result.success).toBe(true);
  });

  it("rechaza cuando falta valor", () => {
    const result = ParametroSistemaUpdateSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("valor es requerido");
    }
  });

  it("rechaza valores vacíos", () => {
    const result = ParametroSistemaUpdateSchema.safeParse({ valor: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("valor es requerido");
    }
  });
});
