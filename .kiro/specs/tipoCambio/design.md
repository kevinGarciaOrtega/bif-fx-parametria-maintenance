# Design — Tipo de Cambio: TC Base + TC Ventanilla

## Archivos involucrados
```
src/
├── handlers/tipoCambio.handler.ts
├── repositories/tipoCambio.repository.ts
├── models/tipoCambio.model.ts
└── validators/schemas.ts  ← agregar TCBaseUpdateSchema + TCVentanillaEnviarSchema

tests/unit/
├── tipoCambio.validator.test.ts
├── tipoCambio.repository.test.ts
└── tipoCambio.handler.test.ts
```

---

## Flujo GET /tipo-cambio/base
```
obtenerBase() handler
    └── TipoCambioRepository.listarBase()
            └── ScanCommand tipo=TC_BASE
            └── filter Items donde SK === "ACTIVO"
            └── map(mapTCBaseToResponse)
    └── ok({ data, total })
```

## Flujo PUT /tipo-cambio/base/{parMoneda}
```
editarBase() handler
    ├── validar parMoneda enum
    ├── TCBaseUpdateSchema.safeParse(body)
    └── TipoCambioRepository.actualizarBase(parMoneda, valorCompra, valorVenta, motivo, usuario)
            ├── GetCommand PK=TC_BASE#${par} SK=ACTIVO
            │   └── !item → return null
            ├── now = new Date().toISOString()
            ├── UpdateCommand SK=ACTIVO:
            │   SET valorCompra, valorVenta, esEdicionManual=true,
            │       ultimaActualizacion=now, updatedAt=now, updatedBy
            └── PutCommand SK=AUDITORIA#${now}:
                {tipo: TC_BASE_AUDITORIA, valorCompraAnterior, valorCompraNuevo,
                 valorVentaAnterior, valorVentaNuevo, esEdicionManual: true,
                 motivoEdicion, updatedAt: now, updatedBy}
    ├── null → notFound FX-TC-003
    └── ok(result)
```

## Flujo GET /tipo-cambio/base/{parMoneda}/auditoria
```
auditoriaBase() handler
    ├── validar parMoneda enum
    └── TipoCambioRepository.obtenerAuditoria(parMoneda)
            └── QueryCommand
                PK=TC_BASE#${par}
                begins_with(SK, "AUDITORIA#")
            └── sort DESC por SK (timestamp)
            └── map(mapAuditoriaToResponse)
    └── ok({ parMoneda, data, total })
```

## Flujo GET /tipo-cambio/ventanilla/{parMoneda}
```
obtenerVentanilla() handler
    ├── validar parMoneda enum
    └── TipoCambioRepository.listarVentanilla(parMoneda)
            └── QueryCommand
                PK=TC_VENTANILLA#${par}
                begins_with(SK, "SEGMENTO#")
            └── map(mapVentanillaToResponse)
    └── ok({ parMoneda, data, total })
```

## Flujo POST /tipo-cambio/ventanilla/{parMoneda}
```
enviarVentanilla() handler
    ├── validar parMoneda enum
    ├── TCVentanillaEnviarSchema.safeParse(body)
    └── TipoCambioRepository.enviarVentanilla(parMoneda, segmentos, usuario)
            ├── GetCommand TC_BASE#${par} SK=ACTIVO
            │   └── !item → return { error: "TC_BASE_NO_ENCONTRADO" }
            ├── now = new Date().toISOString()
            ├── Para cada segmento:
            │   valorCompra = tcBase.valorCompra + (seg.spreadCompraPips / 10000)
            │   valorVenta  = tcBase.valorVenta  + (seg.spreadVentaPips  / 10000)
            └── BatchWriteItem 4 PutRequests:
                PK=TC_VENTANILLA#${par} SK=SEGMENTO#${segmento}
    ├── TC_BASE_NO_ENCONTRADO → notFound FX-TC-003
    └── created({ parMoneda, data, total })
```

---

## Cálculo de valores ventanilla

```typescript
// pips → porcentaje: 1 pip = 0.0001 (1/10000)
const calcularValor = (tcBase: number, spreadPips: number): number =>
  Math.round((tcBase + spreadPips / 10000) * 1000000) / 1000000;
  // round a 6 decimales para evitar floating point errors

// Ejemplo:
// tcBase=3.368, spreadPips=-5
// 3.368 + (-5/10000) = 3.368 - 0.0005 = 3.3675
```

---

## Interfaces TypeScript

### src/models/tipoCambio.model.ts
```typescript
export type ParMoneda = "USD_PEN" | "EUR_PEN";
export type SegmentoVentanilla = "EMPLEADO" | "PREMIUM" | "PREFERENCIAL" | "PIZARRA";
export type EstadoVentana = "ACTIVO" | "CERRADO";
export type FuenteTC = "DATATEC" | "BLOOMBERG";

export interface TCBase {
  pk: string;                  // TC_BASE#<parMoneda>
  sk: string;                  // ACTIVO
  tipo: "TC_BASE";
  parMoneda: ParMoneda;
  monedaOrigen: string;
  monedaDestino: string;
  fuente: FuenteTC;
  fuenteCompra: string;
  valorCompra: number;
  fuenteVenta: string;
  valorVenta: number;
  ultimaActualizacion: string;
  estadoVentana: EstadoVentana;
  esEdicionManual: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface TCBaseAuditoria {
  pk: string;                  // TC_BASE#<parMoneda>
  sk: string;                  // AUDITORIA#<timestamp>
  tipo: "TC_BASE_AUDITORIA";
  parMoneda: ParMoneda;
  valorCompraAnterior: number;
  valorCompraNuevo: number;
  valorVentaAnterior: number;
  valorVentaNuevo: number;
  esEdicionManual: boolean;
  motivoEdicion: string;
  updatedAt: string;
  updatedBy: string;
}

export interface TCVentanilla {
  pk: string;                  // TC_VENTANILLA#<parMoneda>
  sk: string;                  // SEGMENTO#<segmento>
  tipo: "TC_VENTANILLA";
  parMoneda: ParMoneda;
  segmento: SegmentoVentanilla;
  tcBaseCompraRef: number;
  tcBaseVentaRef: number;
  spreadCompraPips: number;
  spreadVentaPips: number;
  valorCompra: number;
  valorVenta: number;
  enviadoAt: string;
  enviadoBy: string;
}

// Responses
export interface TCBaseResponse {
  parMoneda: string;
  monedaOrigen: string;
  monedaDestino: string;
  fuente: string;
  fuenteCompra: string;
  valorCompra: number;
  fuenteVenta: string;
  valorVenta: number;
  ultimaActualizacion: string;
  estadoVentana: string;
  esEdicionManual: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface TCBaseAuditoriaResponse {
  timestamp: string;
  valorCompraAnterior: number;
  valorCompraNuevo: number;
  valorVentaAnterior: number;
  valorVentaNuevo: number;
  esEdicionManual: boolean;
  motivoEdicion: string;
  updatedBy: string;
}

export interface TCVentanillaResponse {
  segmento: string;
  tcBaseCompraRef: number;
  tcBaseVentaRef: number;
  spreadCompraPips: number;
  spreadVentaPips: number;
  valorCompra: number;
  valorVenta: number;
  enviadoAt: string;
  enviadoBy: string;
}

export interface TCVentanillaSegmentoRequest {
  segmento: SegmentoVentanilla;
  spreadCompraPips: number;
  spreadVentaPips: number;
}

export interface TCBaseUpdateResult {
  data?: TCBaseResponse;
  error?: "NO_ENCONTRADO";
}

export interface TCVentanillaEnviarResult {
  data?: TCVentanillaResponse[];
  error?: "TC_BASE_NO_ENCONTRADO";
}
```

---

## Schemas Zod — agregar a src/validators/schemas.ts

```typescript
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
```

---

## Códigos de error de este módulo

| Código | HTTP | Cuándo |
|--------|------|--------|
| FX-TC-001 | 400 | parMoneda inválido en path |
| FX-TC-002 | 400 | Validación TC Base falla |
| FX-TC-003 | 404 | TC Base no encontrado |
| FX-TC-004 | 400 | Validación ventanilla falla |
| FX-TC-500 | 500 | Error inesperado |
