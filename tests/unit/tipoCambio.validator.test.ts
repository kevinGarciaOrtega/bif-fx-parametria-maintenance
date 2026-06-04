import { TCBaseUpdateSchema, TCVentanillaEnviarSchema } from "../../src/validators/schemas";

describe("TCBaseUpdateSchema", () => {
  const bodyValido = { valorCompra: 3.368, valorVenta: 3.370, motivoEdicion: "Contingencia Datatec" };

  describe("casos válidos", () => {
    it("acepta valores correctos", () => {
      expect(TCBaseUpdateSchema.safeParse(bodyValido).success).toBe(true);
    });
    it("acepta valorVenta = valorCompra", () => {
      expect(TCBaseUpdateSchema.safeParse({ ...bodyValido, valorVenta: 3.368 }).success).toBe(true);
    });
  });

  describe("validación valorCompra", () => {
    it("rechaza negativo", () => {
      const r = TCBaseUpdateSchema.safeParse({ ...bodyValido, valorCompra: -1 });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("Valor compra debe ser > 0");
    });
    it("rechaza cero", () => {
      expect(TCBaseUpdateSchema.safeParse({ ...bodyValido, valorCompra: 0 }).success).toBe(false);
    });
    it("rechaza string", () => {
      const r = TCBaseUpdateSchema.safeParse({ ...bodyValido, valorCompra: "3.368" });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("Valor compra debe ser un número");
    });
  });

  describe("validación valorVenta >= valorCompra", () => {
    it("rechaza valorVenta < valorCompra", () => {
      const r = TCBaseUpdateSchema.safeParse({ ...bodyValido, valorCompra: 3.370, valorVenta: 3.368 });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("Valor venta debe ser >= valor compra");
    });
  });

  describe("validación motivoEdicion", () => {
    it("rechaza vacío", () => {
      const r = TCBaseUpdateSchema.safeParse({ ...bodyValido, motivoEdicion: "" });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("motivoEdicion no puede estar vacío");
    });
    it("rechaza ausente", () => {
      const { motivoEdicion: _, ...sin } = bodyValido;
      const r = TCBaseUpdateSchema.safeParse(sin);
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("motivoEdicion es requerido");
    });
  });
});

describe("TCVentanillaEnviarSchema", () => {
  const seg4 = [
    { segmento: "EMPLEADO",    spreadCompraPips: -5,   spreadVentaPips: 5   },
    { segmento: "PREMIUM",     spreadCompraPips: -55,  spreadVentaPips: 55  },
    { segmento: "PREFERENCIAL",spreadCompraPips: -180, spreadVentaPips: 180 },
    { segmento: "PIZARRA",     spreadCompraPips: -220, spreadVentaPips: 220 },
  ];

  describe("casos válidos", () => {
    it("acepta 4 segmentos correctos con spreads negativos", () => {
      expect(TCVentanillaEnviarSchema.safeParse({ segmentos: seg4 }).success).toBe(true);
    });
    it("acepta spreads positivos y cero", () => {
      const seg4pos = seg4.map((s) => ({ ...s, spreadCompraPips: 0, spreadVentaPips: 100 }));
      expect(TCVentanillaEnviarSchema.safeParse({ segmentos: seg4pos }).success).toBe(true);
    });
  });

  describe("validación cantidad de segmentos", () => {
    it("rechaza menos de 4 segmentos", () => {
      const r = TCVentanillaEnviarSchema.safeParse({ segmentos: seg4.slice(0, 3) });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("Deben enviarse exactamente 4 segmentos");
    });
    it("rechaza más de 4 segmentos", () => {
      const r = TCVentanillaEnviarSchema.safeParse({ segmentos: [...seg4, { segmento: "EMPLEADO", spreadCompraPips: 0, spreadVentaPips: 0 }] });
      expect(r.success).toBe(false);
    });
    it("rechaza array vacío", () => {
      expect(TCVentanillaEnviarSchema.safeParse({ segmentos: [] }).success).toBe(false);
    });
  });

  describe("validación segmentos completos", () => {
    it("rechaza si falta un segmento obligatorio", () => {
      const sinPizarra = seg4.map((s) =>
        s.segmento === "PIZARRA" ? { ...s, segmento: "EMPLEADO" } : s
      );
      const r = TCVentanillaEnviarSchema.safeParse({ segmentos: sinPizarra });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toContain("todos los segmentos");
    });
  });

  describe("validación spreads", () => {
    it("rechaza spreadCompraPips decimal", () => {
      const segInvalido = seg4.map((s, i) => i === 0 ? { ...s, spreadCompraPips: 10.5 } : s);
      const r = TCVentanillaEnviarSchema.safeParse({ segmentos: segInvalido });
      expect(r.success).toBe(false);
    });
    it("rechaza spreadVentaPips como string", () => {
      const segInvalido = seg4.map((s, i) => i === 0 ? { ...s, spreadVentaPips: "5" } : s);
      expect(TCVentanillaEnviarSchema.safeParse({ segmentos: segInvalido }).success).toBe(false);
    });
  });
});
