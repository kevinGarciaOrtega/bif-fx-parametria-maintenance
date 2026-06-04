import { FeriadoCreateSchema } from "../../src/validators/schemas";

describe("FeriadoCreateSchema", () => {

  describe("casos válidos", () => {
    it("acepta fecha y descripcion", () => {
      expect(FeriadoCreateSchema.safeParse({ fecha: "2026-07-28", descripcion: "Fiestas Patrias" }).success).toBe(true);
    });
    it("acepta solo fecha sin descripcion", () => {
      expect(FeriadoCreateSchema.safeParse({ fecha: "2026-07-28" }).success).toBe(true);
    });
    it("descripcion vacía se convierte en string vacío", () => {
      const r = FeriadoCreateSchema.safeParse({ fecha: "2026-07-28" });
      if (r.success) expect(r.data.descripcion).toBe("");
    });
  });

  describe("validación de fecha", () => {
    it("rechaza formato DD-MM-YYYY", () => {
      const r = FeriadoCreateSchema.safeParse({ fecha: "28-07-2026" });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toContain("YYYY-MM-DD");
    });
    it("rechaza mes inválido 13", () => {
      expect(FeriadoCreateSchema.safeParse({ fecha: "2026-13-01" }).success).toBe(false);
    });
    it("rechaza texto libre", () => {
      expect(FeriadoCreateSchema.safeParse({ fecha: "hoy" }).success).toBe(false);
    });
    it("rechaza fecha ausente", () => {
      expect(FeriadoCreateSchema.safeParse({}).success).toBe(false);
    });
    it("rechaza fecha null", () => {
      expect(FeriadoCreateSchema.safeParse({ fecha: null }).success).toBe(false);
    });
  });
});
