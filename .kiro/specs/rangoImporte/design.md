# Design — Variable Rango de Importe PN y PJ

## Archivos involucrados
```
src/
├── handlers/
│   └── rangoImporte.handler.ts   ← listarPN/PJ, crearPN/PJ, actualizarPN/PJ, eliminarPN/PJ
├── repositories/
│   └── rangoImporte.repository.ts
├── models/
│   └── rangoImporte.model.ts
└── validators/
    └── schemas.ts                ← agregar RangoImporteCreateSchema + RangoImporteUpdateSchema

tests/unit/
├── rangoImporte.validator.test.ts
├── rangoImporte.repository.test.ts
└── rangoImporte.handler.test.ts
```

---

## Flujo GET /parametros/rango-importe/pn
```
listarPN() handler
    └── RangoImporteRepository.listar("PN")
            └── ScanCommand FilterExpression #tipo = RANGO_PN
            └── sort por importeMinimo ASC
            └── map(mapToResponse) sin pk/sk/tipo
    └── ok({ tipoPersoneria: "PN", data, total })
```

## Flujo POST /parametros/rango-importe/pn
```
crearPN() handler
    ├── RangoImporteCreateSchema.safeParse(body)
    └── RangoImporteRepository.crear("PN", importeMaximo, pips, usuario)
            ├── ScanCommand tipo=RANGO_PN → obtener todos
            ├── sort por importeMaximo DESC → tomar el primero
            ├── importeMinimo = ultimo.importeMaximo ?? 0
            ├── validar importeMaximo > importeMinimo
            │   └── si no → return { error: "IMPORTE_INVALIDO", importeMinimo }
            ├── id = uuid() corto (8 chars)
            └── PutCommand con todos los campos
    ├── result.error === "IMPORTE_INVALIDO" → badRequest FX-MNT-032
    └── ok(result) HTTP 201
```

## Flujo PUT /parametros/rango-importe/pn/{id}
```
actualizarPN() handler
    ├── validar id path
    ├── RangoImporteUpdateSchema.safeParse(body)
    └── RangoImporteRepository.actualizar("PN", id, importeMaximo, pips, usuario)
            ├── GetCommand PK=RANGO_PN#${id} SK=METADATA
            │   └── null → return null
            └── UpdateCommand
                SET importeMaximo, pips, updatedAt, updatedBy
                (NO toca importeMinimo, pk, sk, tipo, id, tipoPersoneria)
    ├── null → notFound FX-MNT-033
    └── ok(result) HTTP 200
```

## Flujo DELETE /parametros/rango-importe/pn/{id}
```
eliminarPN() handler
    ├── validar id path
    └── RangoImporteRepository.eliminar("PN", id)
            ├── GetCommand PK=RANGO_PN#${id} SK=METADATA
            │   └── !item → return false
            └── DeleteCommand
                return true
    ├── false → notFound FX-MNT-034
    └── noContent() HTTP 204
```

---

## Interfaces TypeScript

### src/models/rangoImporte.model.ts
```typescript
export type TipoPersoneria = "PN" | "PJ";

export interface RangoImporte {
  pk: string;              // RANGO_PN#<id> | RANGO_PJ#<id>
  sk: string;              // METADATA
  tipo: "RANGO_PN" | "RANGO_PJ";
  id: string;
  tipoPersoneria: TipoPersoneria;
  importeMinimo: number;   // solo lectura, calculado al crear
  importeMaximo: number;   // editable
  pips: number;            // editable
  updatedAt: string;
  updatedBy: string;
}

export interface RangoImporteCreateRequest {
  importeMaximo: number;
  pips: number;
}

export interface RangoImporteUpdateRequest {
  importeMaximo: number;
  pips: number;
}

export interface RangoImporteResponse {
  id: string;
  tipoPersoneria: TipoPersoneria;
  importeMinimo: number;
  importeMaximo: number;
  pips: number;
  updatedAt: string;
  updatedBy: string;
}

// Resultado especial del crear con error de validación de negocio
export interface RangoImporteCreateResult {
  data?: RangoImporteResponse;
  error?: "IMPORTE_INVALIDO";
  importeMinimoActual?: number;
}
```

---

## Schemas Zod — agregar a src/validators/schemas.ts

```typescript
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
```

---

## Construcción de PK por tipoPersoneria

```typescript
const tipoKey = (tp: TipoPersoneria): "RANGO_PN" | "RANGO_PJ" =>
  tp === "PN" ? "RANGO_PN" : "RANGO_PJ";

// PK examples:
// PN → "RANGO_PN#abc12345"
// PJ → "RANGO_PJ#xyz98765"
```

---

## Códigos de error de este módulo

| Código | HTTP | Cuándo |
|--------|------|--------|
| FX-MNT-031 | 400 | ID no viene en path |
| FX-MNT-032 | 400 | Validación falla (importeMaximo, pips, importe inválido) |
| FX-MNT-033 | 404 | ID rango no existe en PUT |
| FX-MNT-034 | 404 | ID rango no existe en DELETE |
| FX-MNT-500 | 500 | Error inesperado |
