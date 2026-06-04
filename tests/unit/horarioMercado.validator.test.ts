import { HorarioMercadoUpdateSchema } from "../../src/validators/schemas";

describe("HorarioMercadoUpdateSchema", () => {

  const bodyValido = { pips: 120, horaApertura: "09:00", horaCierre: "15:00" };

  describe("casos válidos", () => {
    it("acepta body completo válido", () => {
      expect(HorarioMercadoUpdateSchema.safeParse(bodyValido).success).toBe(true);
    });
    it("acepta pips=0", () => {
      expect(HorarioMercadoUpdateSchema.safeParse({ ...bodyValido, pips: 0 }).success).toBe(true);
    });
    it("acepta hora 00:00", () => {
      expect(HorarioMercadoUpdateSchema.safeParse({ ...bodyValido, horaApertura: "00:00" }).success).toBe(true);
    });
    it("acepta hora 23:59", () => {
      expect(HorarioMercadoUpdateSchema.safeParse({ ...bodyValido, horaCierre: "23:59" }).success).toBe(true);
    });
  });

  describe("validación de pips", () => {
    it("rechaza pips negativo", () => {
      const r = HorarioMercadoUpdateSchema.safeParse({ ...bodyValido, pips: -1 });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("PIPs debe ser >= 0");
    });
    it("rechaza pips decimal", () => {
      const r = HorarioMercadoUpdateSchema.safeParse({ ...bodyValido, pips: 1.5 });
      expect(r.success).toBe(false);
    });
    it("rechaza pips ausente", () => {
      const { pips: _, ...sinPips } = bodyValido;
      expect(HorarioMercadoUpdateSchema.safeParse(sinPips).success).toBe(false);
    });
  });

  describe("validación de horaApertura", () => {
    it("rechaza formato inválido 25:00", () => {
      const r = HorarioMercadoUpdateSchema.safeParse({ ...bodyValido, horaApertura: "25:00" });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("Formato HH:MM requerido");
    });
    it("rechaza texto libre", () => {
      expect(HorarioMercadoUpdateSchema.safeParse({ ...bodyValido, horaApertura: "abc" }).success).toBe(false);
    });
    it("rechaza horaApertura ausente", () => {
      const { horaApertura: _, ...sinHora } = bodyValido;
      expect(HorarioMercadoUpdateSchema.safeParse(sinHora).success).toBe(false);
    });
  });

  describe("validación de horaCierre", () => {
    it("rechaza formato inválido 9:0", () => {
      const r = HorarioMercadoUpdateSchema.safeParse({ ...bodyValido, horaCierre: "9:0" });
      expect(r.success).toBe(false);
    });
    it("rechaza horaCierre ausente", () => {
      const { horaCierre: _, ...sinHora } = bodyValido;
      expect(HorarioMercadoUpdateSchema.safeParse(sinHora).success).toBe(false);
    });
  });

  describe("body inválido", () => {
    it("rechaza body vacío", () => {
      expect(HorarioMercadoUpdateSchema.safeParse({}).success).toBe(false);
    });
  });
});
