import { VolatilidadUpdateSchema } from "../../src/validators/schemas";

describe("VolatilidadUpdateSchema", () => {

  describe("casos válidos", () => {
    it("acepta pips=0 y estadoActual=false", () => {
      const result = VolatilidadUpdateSchema.safeParse({ pips: 0, estadoActual: false });
      expect(result.success).toBe(true);
    });

    it("acepta pips=100 y estadoActual=true", () => {
      const result = VolatilidadUpdateSchema.safeParse({ pips: 100, estadoActual: true });
      expect(result.success).toBe(true);
    });

    it("ignora campos extra como nombre o tipo", () => {
      const result = VolatilidadUpdateSchema.safeParse({
        pips: 100,
        estadoActual: false,
        nombre: "no debería importar",
        tipo: "hack",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("validación de pips", () => {
    it("rechaza pips negativo con mensaje correcto", () => {
      const result = VolatilidadUpdateSchema.safeParse({ pips: -1, estadoActual: false });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("PIPs debe ser >= 0");
      }
    });

    it("rechaza pips decimal con mensaje correcto", () => {
      const result = VolatilidadUpdateSchema.safeParse({ pips: 10.5, estadoActual: false });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("PIPs debe ser un número entero");
      }
    });

    it("rechaza pips como string", () => {
      const result = VolatilidadUpdateSchema.safeParse({ pips: "100", estadoActual: false });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("PIPs debe ser un número");
      }
    });

    it("rechaza pips ausente", () => {
      const result = VolatilidadUpdateSchema.safeParse({ estadoActual: false });
      expect(result.success).toBe(false);
    });
  });

  describe("validación de estadoActual", () => {
    it("rechaza estadoActual como string 'true'", () => {
      const result = VolatilidadUpdateSchema.safeParse({ pips: 100, estadoActual: "true" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("estadoActual debe ser boolean");
      }
    });

    it("rechaza estadoActual como número 1", () => {
      const result = VolatilidadUpdateSchema.safeParse({ pips: 100, estadoActual: 1 });
      expect(result.success).toBe(false);
    });

    it("rechaza estadoActual ausente", () => {
      const result = VolatilidadUpdateSchema.safeParse({ pips: 100 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("estadoActual es requerido");
      }
    });
  });

  describe("body inválido", () => {
    it("rechaza body vacío {}", () => {
      const result = VolatilidadUpdateSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rechaza body null", () => {
      const result = VolatilidadUpdateSchema.safeParse(null);
      expect(result.success).toBe(false);
    });
  });
});
