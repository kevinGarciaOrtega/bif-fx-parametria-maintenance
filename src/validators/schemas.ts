import { z } from "zod";

// ── VOLATILIDAD ─────────────────────────────────────────────
export const VolatilidadUpdateSchema = z.object({
  pips: z
    .number({ invalid_type_error: "PIPs debe ser un número" })
    .int("PIPs debe ser un número entero")
    .min(0, "PIPs debe ser >= 0"),
  estadoActual: z.boolean({
    invalid_type_error: "estadoActual debe ser boolean",
    required_error: "estadoActual es requerido",
  }),
});

export type VolatilidadUpdateInput = z.infer<typeof VolatilidadUpdateSchema>;

// ── TIPO CAMBIO ──────────────────────────────────────────────
export const createTipoCambioSchema = z.object({
  moneda: z.string().min(1),
  fecha: z.string().min(1),
  hora: z.string().min(1),
  compra: z.number().min(0),
  venta: z.number().min(0),
  fuente: z.string().min(1),
  creadoPor: z.string().min(1),
});

export type CreateTipoCambioInput = z.infer<typeof createTipoCambioSchema>;

// ── HORARIO MERCADO ─────────────────────────────────────────
const horaRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

export const HorarioMercadoUpdateSchema = z.object({
  pips: z
    .number({ invalid_type_error: "PIPs debe ser un número" })
    .int("PIPs debe ser un número entero")
    .min(0, "PIPs debe ser >= 0"),
  horaApertura: z
    .string({ required_error: "horaApertura es requerida" })
    .regex(horaRegex, "Formato HH:MM requerido"),
  horaCierre: z
    .string({ required_error: "horaCierre es requerida" })
    .regex(horaRegex, "Formato HH:MM requerido"),
});

export type HorarioMercadoUpdateInput = z.infer<typeof HorarioMercadoUpdateSchema>;

// ── FERIADO ─────────────────────────────────────────────────
const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;

export const FeriadoCreateSchema = z.object({
  fecha: z
    .string({ required_error: "fecha es requerida" })
    .regex(fechaRegex, "Formato de fecha inválido, usar YYYY-MM-DD")
    .refine(
      (f) => !isNaN(new Date(f + "T00:00:00").getTime()),
      "Fecha inválida"
    ),
  descripcion: z.string().optional().default(""),
});

export type FeriadoCreateInput = z.infer<typeof FeriadoCreateSchema>;

// ── RANGO IMPORTE ───────────────────────────────────────────
export const RangoImporteCreateSchema = z.object({
  importeMaximo: z
    .number({ invalid_type_error: "Importe máximo debe ser un número" })
    .positive("Importe máximo debe ser > 0"),
  pips: z
    .number({ invalid_type_error: "PIPs debe ser un número" })
    .int("PIPs debe ser un número entero")
    .min(0, "PIPs debe ser >= 0"),
});

export const RangoImporteUpdateSchema = z.object({
  importeMaximo: z
    .number({ invalid_type_error: "Importe máximo debe ser un número" })
    .positive("Importe máximo debe ser > 0"),
  pips: z
    .number({ invalid_type_error: "PIPs debe ser un número" })
    .int("PIPs debe ser un número entero")
    .min(0, "PIPs debe ser >= 0"),
});

export type RangoImporteCreateInput = z.infer<typeof RangoImporteCreateSchema>;
export type RangoImporteUpdateInput = z.infer<typeof RangoImporteUpdateSchema>;

// ── SEGMENTO ─────────────────────────────────────────────────
export const SegmentoCreateSchema = z.object({
  descripcionBanca: z
    .string({ required_error: "descripcionBanca es requerida" })
    .min(1, "descripcionBanca no puede estar vacía"),
  pips: z
    .number({ invalid_type_error: "PIPs debe ser un número" })
    .int("PIPs debe ser un número entero")
    .min(0, "PIPs debe ser >= 0")
    .default(100),
});

export const SegmentoUpdateSchema = z.object({
  pips: z
    .number({ invalid_type_error: "PIPs debe ser un número" })
    .int("PIPs debe ser un número entero")
    .min(0, "PIPs debe ser >= 0"),
});

export type SegmentoCreateInput = z.infer<typeof SegmentoCreateSchema>;
export type SegmentoUpdateInput = z.infer<typeof SegmentoUpdateSchema>;
