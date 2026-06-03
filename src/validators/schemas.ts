import { z } from "zod";

const horaRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

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

// ── HORARIO MERCADO ─────────────────────────────────────────
export const HorarioMercadoUpdateSchema = z.object({
  pips: z.number().int().min(0, "PIPs debe ser >= 0"),
  horaApertura: z.string().regex(horaRegex, "Formato HH:MM requerido"),
  horaCierre: z.string().regex(horaRegex, "Formato HH:MM requerido"),
});

// ── FERIADO ─────────────────────────────────────────────────
export const FeriadoCreateSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD requerido"),
  descripcion: z.string().optional(),
});

// ── RANGO IMPORTE ───────────────────────────────────────────
export const RangoImporteCreateSchema = z.object({
  importeMaximo: z.number().positive("Importe máximo debe ser > 0"),
  pips: z.number().int().min(0, "PIPs debe ser >= 0"),
});

export const RangoImporteUpdateSchema = z.object({
  importeMaximo: z.number().positive("Importe máximo debe ser > 0"),
  pips: z.number().int().min(0, "PIPs debe ser >= 0"),
});

// ── SEGMENTO ────────────────────────────────────────────────
export const SegmentoCreateSchema = z.object({
  descripcionBanca: z.string().min(1, "Descripción requerida").toUpperCase(),
  pips: z.number().int().min(0).default(100),
});

export const SegmentoUpdateSchema = z.object({
  pips: z.number().int().min(0, "PIPs debe ser >= 0"),
});

// ── SPREAD LIQUIDEZ ─────────────────────────────────────────
export const SpreadLiquidezUpdateSchema = z.object({
  pips: z.number().int(),
});

// ── SPREAD CLIENTE ──────────────────────────────────────────
export const SpreadClienteCreateSchema = z.object({
  codigoIbs: z.string().min(1, "Código IBS requerido"),
  codigoBanca: z.string().min(4).max(4, "Código banca debe ser 4 dígitos"),
  spreadPips: z.number().int().min(0, "Spread PIPs debe ser >= 0"),
  flagMotor: z.enum(["ACTIVO", "INACTIVO"]),
});

export const SpreadClienteUpdateSchema = z.object({
  codigoBanca: z.string().min(4).max(4),
  spreadPips: z.number().int().min(0),
  flagMotor: z.enum(["ACTIVO", "INACTIVO"]),
});

// ── TC BASE ─────────────────────────────────────────────────
export const TCBaseUpdateSchema = z.object({
  valorCompra: z.number().positive("Valor compra debe ser > 0"),
  valorVenta: z.number().positive("Valor venta debe ser > 0"),
  motivoEdicion: z.string().min(1, "Motivo de edición requerido"),
}).refine(
  (data) => data.valorVenta >= data.valorCompra,
  { message: "Valor venta debe ser >= valor compra", path: ["valorVenta"] }
);

// ── TC VENTANILLA ───────────────────────────────────────────
const segmentosValidos = ["EMPLEADO", "PREMIUM", "PREFERENCIAL", "PIZARRA"] as const;

export const TCVentanillaEnviarSchema = z.object({
  segmentos: z
    .array(
      z.object({
        segmento: z.enum(segmentosValidos),
        spreadCompraPips: z.number().int(),
        spreadVentaPips: z.number().int(),
      })
    )
    .length(4, "Deben enviarse exactamente 4 segmentos")
    .refine(
      (segs) => {
        const nombres = segs.map((s) => s.segmento);
        return segmentosValidos.every((s) => nombres.includes(s));
      },
      { message: "Deben incluirse todos los segmentos: EMPLEADO, PREMIUM, PREFERENCIAL, PIZARRA" }
    ),
});

// ── PARAMETRO SISTEMA ───────────────────────────────────────
export const ParametroSistemaUpdateSchema = z.object({
  valor: z.string().min(1, "Valor requerido"),
});

// ── USUARIO ─────────────────────────────────────────────────
export const UsuarioCreateSchema = z.object({
  username: z.string().min(1).toUpperCase(),
  nombre: z.string().min(1),
  apellido: z.string().min(1),
  email: z.string().email("Email inválido"),
  perfilId: z.enum(["ADMINISTRADOR", "OPERATIVO", "CONSULTOR"]),
});

export const UsuarioUpdateSchema = z.object({
  nombre: z.string().min(1).optional(),
  apellido: z.string().min(1).optional(),
  email: z.string().email().optional(),
  perfilId: z.enum(["ADMINISTRADOR", "OPERATIVO", "CONSULTOR"]).optional(),
  estado: z.enum(["ACTIVO", "INACTIVO"]).optional(),
});
