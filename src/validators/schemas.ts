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

// ── SPREAD LIQUIDEZ ─────────────────────────────────────────
export const SpreadLiquidezUpdateSchema = z.object({
  pips: z
    .number({
      invalid_type_error: "PIPs debe ser un número",
      required_error: "pips es requerido",
    })
    .int("PIPs debe ser un número entero"),
});
export type SpreadLiquidezUpdateInput = z.infer<typeof SpreadLiquidezUpdateSchema>;

// ── SPREAD CLIENTE ─────────────────────────────────────────
export const SpreadClienteCreateSchema = z.object({
  codigoIbs: z
    .string({ required_error: "codigoIbs es requerido" })
    .min(1, "codigoIbs no puede estar vacío"),
  tipoPersoneria: z.string().default(""),
  tipoDocumento: z.string().default(""),
  nroDocumento: z.string().default(""),
  razonSocial: z.string().default(""),
  apellidoPaterno: z.string().default(""),
  apellidoMaterno: z.string().default(""),
  nombres: z.string().default(""),
  codigoBanca: z
    .string({ required_error: "codigoBanca es requerido" })
    .min(1, "codigoBanca no puede estar vacío"),
  descripcionBanca: z.string().default(""),
  spreadPips: z
    .number({ invalid_type_error: "spreadPips debe ser un número" })
    .int("spreadPips debe ser un número entero")
    .min(0, "spreadPips debe ser >= 0"),
  flagMotor: z.enum(["ACTIVO", "INACTIVO"], {
    errorMap: () => ({ message: "flagMotor debe ser ACTIVO o INACTIVO" }),
  }),
});

export const SpreadClienteUpdateSchema = z.object({
  codigoBanca: z
    .string({ required_error: "codigoBanca es requerido" })
    .min(1, "codigoBanca no puede estar vacío"),
  descripcionBanca: z.string().default(""),
  spreadPips: z
    .number({ invalid_type_error: "spreadPips debe ser un número" })
    .int("spreadPips debe ser un número entero")
    .min(0, "spreadPips debe ser >= 0"),
  flagMotor: z.enum(["ACTIVO", "INACTIVO"], {
    errorMap: () => ({ message: "flagMotor debe ser ACTIVO o INACTIVO" }),
  }),
});

export type SpreadClienteCreateInput = z.infer<typeof SpreadClienteCreateSchema>;
export type SpreadClienteUpdateInput = z.infer<typeof SpreadClienteUpdateSchema>;

// ── TC BASE ─────────────────────────────────────────────────
export const TCBaseUpdateSchema = z.object({
  valorCompra: z
    .number({ invalid_type_error: "Valor compra debe ser un número" })
    .positive("Valor compra debe ser > 0"),
  valorVenta: z
    .number({ invalid_type_error: "Valor venta debe ser un número" })
    .positive("Valor venta debe ser > 0"),
  motivoEdicion: z
    .string({ required_error: "motivoEdicion es requerido" })
    .min(1, "motivoEdicion no puede estar vacío"),
}).refine((data) => data.valorVenta >= data.valorCompra, {
  message: "Valor venta debe ser >= valor compra",
  path: ["valorVenta"],
});

// ── TC VENTANILLA ───────────────────────────────────────────
const SEGMENTOS_VENTANILLA = ["EMPLEADO", "PREMIUM", "PREFERENCIAL", "PIZARRA"] as const;

export const TCVentanillaEnviarSchema = z.object({
  segmentos: z
    .array(
      z.object({
        segmento: z.enum(SEGMENTOS_VENTANILLA, {
          errorMap: () => ({ message: "segmento inválido" }),
        }),
        spreadCompraPips: z
          .number({ invalid_type_error: "spreadCompraPips debe ser un número" })
          .int("spreadCompraPips debe ser un número entero"),
        spreadVentaPips: z
          .number({ invalid_type_error: "spreadVentaPips debe ser un número" })
          .int("spreadVentaPips debe ser un número entero"),
      })
    )
    .length(4, "Deben enviarse exactamente 4 segmentos")
    .refine(
      (segs) => {
        const nombres = segs.map((s) => s.segmento);
        return SEGMENTOS_VENTANILLA.every((s) => nombres.includes(s));
      },
      { message: "Deben incluirse todos los segmentos: EMPLEADO, PREMIUM, PREFERENCIAL, PIZARRA" }
    ),
});

export type TCBaseUpdateInput = z.infer<typeof TCBaseUpdateSchema>;
export type TCVentanillaEnviarInput = z.infer<typeof TCVentanillaEnviarSchema>;

// ── PARAMETRO SISTEMA ───────────────────────────────────────
export const ParametroSistemaUpdateSchema = z.object({
  valor: z
    .string({ required_error: "valor es requerido" })
    .min(1, "valor es requerido"),
});
export type ParametroSistemaUpdateInput = z.infer<typeof ParametroSistemaUpdateSchema>;
