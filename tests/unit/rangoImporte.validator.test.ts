import {
  RangoImporteCreateSchema,
  RangoImporteUpdateSchema,
} from "../../src/validators/schemas";

describe("RangoImporteCreateSchema", () => {
  describe("casos válidos", () => {
    it("acepta importeMaximo positivo y pips=0", () => {
      expect(RangoImporteCreateSchema.safeParse({ importeMaximo: 500, pips: 0 }).success).toBe(true);
    });

    it("acepta importeMaximo decimal", () => {
      expect(RangoImporteCreateSchema.safeParse({ importeMaximo: 500.5, pips: 100 }).success).toBe(true);
    });
  });

  describe("validación importeMaximo", () => {
    it("rechaza importeMaximo negativo", () => {
      const r = RangoImporteCreateSchema.safeParse({ importeMaximo: -1, pips: 100 });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("Importe máximo debe ser > 0");
    });

    it("rechaza importeMaximo = 0", () => {
      expect(RangoImporteCreateSchema.safeParse({ importeMaximo: 0, pips: 100 }).success).toBe(false);
    });

    it("rechaza importeMaximo como string", () => {
      const r = RangoImporteCreateSchema.safeParse({ importeMaximo: "500", pips: 100 });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("Importe máximo debe ser un número");
    });

    it("rechaza importeMaximo ausente", () => {
      expect(RangoImporteCreateSchema.safeParse({ pips: 100 }).success).toBe(false);
    });
  });

  describe("validación pips", () => {
    it("rechaza pips negativo", () => {
      const r = RangoImporteCreateSchema.safeParse({ importeMaximo: 500, pips: -1 });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("PIPs debe ser >= 0");
    });

    it("rechaza pips decimal", () => {
      expect(RangoImporteCreateSchema.safeParse({ importeMaximo: 500, pips: 10.5 }).success).toBe(false);
    });

    it("rechaza pips ausente", () => {
      expect(RangoImporteCreateSchema.safeParse({ importeMaximo: 500 }).success).toBe(false);
    });
  });

  describe("body inválido", () => {
    it("rechaza body vacío", () => {
      expect(RangoImporteCreateSchema.safeParse({}).success).toBe(false);
    });
  });
});

describe("RangoImporteUpdateSchema", () => {
  it("acepta importeMaximo y pips válidos", () => {
    expect(RangoImporteUpdateSchema.safeParse({ importeMaximo: 2000, pips: 75 }).success).toBe(true);
  });

  it("rechaza importeMaximo negativo", () => {
    expect(RangoImporteUpdateSchema.safeParse({ importeMaximo: -1, pips: 75 }).success).toBe(false);
  });

  it("rechaza pips decimal", () => {
    expect(RangoImporteUpdateSchema.safeParse({ importeMaximo: 2000, pips: 1.5 }).success).toBe(false);
  });
});
