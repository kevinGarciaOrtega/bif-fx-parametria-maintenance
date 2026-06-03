import { VolatilidadUpdateSchema } from "../../src/validators/schemas";

describe("VolatilidadUpdateSchema — validaciones", () => {

  describe("casos válidos", () => {
    it("acepta pips=0 y estadoActual=false", () => {
      const result = VolatilidadUpdateSchema.safeParse({ pips: 0, estadoActual: false });
      expect(result.success).toBe(true);
    });

    it("acepta pips=100 y estadoActual=true", () => {
      const result = VolatilidadUpdateSchema.safeParse({ pips: 100, estadoActual: true });
      expect(result.success).toBe(true);
    });

    it("acepta pips=999 y estadoActual=false", () => {
      const result = VolatilidadUpdateSchema.safeParse({ pips: 999, estadoActual: false });
      expect(result.success).toBe(true);
    });
  });

  describe("validación de pips", () => {
    it("rechaza pips negativo (-1) con mensaje 'PIPs debe ser >= 0'", () => {
      const result = VolatilidadUpdateSchema.safeParse({ pips: -1, estadoActual: true });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.errors.map((e) => e.message);
        expect(messages).toContain("PIPs debe ser >= 0");
      }
    });

    it("rechaza pips decimal (10.5) con mensaje 'PIPs debe ser un número entero'", () => {
      const result = VolatilidadUpdateSchema.safeParse({ pips: 10.5, estadoActual: true });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.errors.map((e) => e.message);
        expect(messages).toContain("PIPs debe ser un número entero");
      }
    });

    it("rechaza pips como string ('100') con mensaje 'PIPs debe ser un número'", () => {
      const result = VolatilidadUpdateSchema.safeParse({ pips: "100", estadoActual: true });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.errors.map((e) => e.message);
        expect(messages).toContain("PIPs debe ser un número");
      }
    });

    it("rechaza pips ausente", () => {
      const result = VolatilidadUpdateSchema.safeParse({ estadoActual: true });
      expect(result.success).toBe(false);
    });
  });

  describe("validación de estadoActual", () => {
    it("rechaza estadoActual como string ('true') con mensaje 'estadoActual debe ser boolean'", () => {
      const result = VolatilidadUpdateSchema.safeParse({ pips: 100, estadoActual: "true" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.errors.map((e) => e.message);
        expect(messages).toContain("estadoActual debe ser boolean");
      }
    });

    it("rechaza estadoActual como número (1) con mensaje 'estadoActual debe ser boolean'", () => {
      const result = VolatilidadUpdateSchema.safeParse({ pips: 100, estadoActual: 1 });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.errors.map((e) => e.message);
        expect(messages).toContain("estadoActual debe ser boolean");
      }
    });

    it("rechaza estadoActual ausente con mensaje 'estadoActual es requerido'", () => {
      const result = VolatilidadUpdateSchema.safeParse({ pips: 100 });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.errors.map((e) => e.message);
        expect(messages).toContain("estadoActual es requerido");
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

    it("campos extra son ignorados (nombre, tipo, etc.)", () => {
      const result = VolatilidadUpdateSchema.safeParse({
        pips: 50,
        estadoActual: false,
        nombre: "extra",
        tipo: "ignorado",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).nombre).toBeUndefined();
        expect((result.data as any).tipo).toBeUndefined();
      }
    });
  });
});
