# Design — Variable Segmento

## Archivos involucrados
```
src/
├── handlers/segmento.handler.ts
├── repositories/segmento.repository.ts
├── models/segmento.model.ts
└── validators/schemas.ts  ← agregar SegmentoCreateSchema + SegmentoUpdateSchema

tests/unit/
├── segmento.validator.test.ts
├── segmento.repository.test.ts
└── segmento.handler.test.ts
```

---

## Flujo GET /parametros/segmento
```
buscar() handler
    ├── descripcion = event.queryStringParameters?.descripcion (opcional)
    └── SegmentoRepository.buscar(descripcion?)
            ├── ScanCommand tipo=SEGMENTO → obtiene todos
            ├── Si descripcion: filter en memoria (case insensitive contains)
            ├── sort por codigoBanca ASC
            └── map(mapToResponse) sin pk/sk/tipo/GSI2PK/GSI2SK
    └── ok({ data, total })
```

## Flujo POST /parametros/segmento
```
crear() handler
    ├── SegmentoCreateSchema.safeParse(body)
    └── SegmentoRepository.crear(descripcionBanca, pips, usuario)
            ├── ScanCommand tipo=SEGMENTO → obtener todos
            ├── descripcionBanca.toUpperCase()
            ├── verificar duplicado (case insensitive)
            │   └── existe → return { error: "DUPLICADO", descripcion }
            ├── calcular siguiente código:
            │   todos.length === 0 → "0001"
            │   max(parseInt(codigoBanca)) + 1 → padStart(4, "0")
            └── PutCommand con GSI2PK="SEGMENTO" GSI2SK=descripcionBanca
    ├── result.error === "DUPLICADO" → conflict FX-MNT-042
    └── created(result.data!)
```

## Flujo PUT /parametros/segmento/{codigoBanca}
```
actualizar() handler
    ├── codigoBanca = event.pathParameters?.codigoBanca
    ├── SegmentoUpdateSchema.safeParse(body)
    └── SegmentoRepository.actualizar(codigoBanca, pips, usuario)
            ├── GetCommand PK=SEGMENTO#${codigoBanca} SK=METADATA
            │   └── null → return null
            └── UpdateCommand SET pips, updatedAt, updatedBy
                (NO toca codigoBanca, descripcionBanca, origen, GSI2*)
    ├── null → notFound FX-MNT-043
    └── ok(result)
```

## Flujo DELETE /parametros/segmento/{codigoBanca}
```
eliminar() handler
    ├── codigoBanca = event.pathParameters?.codigoBanca
    └── SegmentoRepository.eliminar(codigoBanca)
            ├── GetCommand → !item → return false
            └── DeleteCommand → return true
    ├── false → notFound FX-MNT-044
    └── noContent()
```

---

## Interfaces TypeScript

### src/models/segmento.model.ts
```typescript
export type OrigenSegmento = "MANUAL" | "SYNC_IBS";

export interface Segmento {
  pk: string;              // SEGMENTO#<codigoBanca>
  sk: string;              // METADATA
  tipo: "SEGMENTO";
  codigoBanca: string;     // "0001" - solo lectura
  descripcionBanca: string; // MAYÚSCULAS - solo lectura
  pips: number;            // editable
  origen: OrigenSegmento;
  updatedAt: string;
  updatedBy: string;
  gsi2pk: string;          // "SEGMENTO"
  gsi2sk: string;          // descripcionBanca
}

export interface SegmentoCreateRequest {
  descripcionBanca: string;
  pips?: number;
}

export interface SegmentoUpdateRequest {
  pips: number;
}

export interface SegmentoResponse {
  codigoBanca: string;
  descripcionBanca: string;
  pips: number;
  origen: OrigenSegmento;
  updatedAt: string;
  updatedBy: string;
}

export interface SegmentoCreateResult {
  data?: SegmentoResponse;
  error?: "DUPLICADO";
  descripcionExistente?: string;
}
```

---

## Schemas Zod — agregar a src/validators/schemas.ts

```typescript
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
```

---

## Cálculo del siguiente código

```typescript
const calcularSiguienteCodigo = (segmentos: Segmento[]): string => {
  if (segmentos.length === 0) return "0001";
  const maxCodigo = Math.max(...segmentos.map((s) => parseInt(s.codigoBanca, 10)));
  return String(maxCodigo + 1).padStart(4, "0");
};
// Ejemplos:
// [] → "0001"
// ["0001","0003","0008"] → "0009"  (max=8, +1=9)
// ["0001","0099"] → "0100"
```

---

## Códigos de error de este módulo

| Código | HTTP | Cuándo |
|--------|------|--------|
| FX-MNT-040 | 400 | codigoBanca no viene en path |
| FX-MNT-041 | 400 | Validación falla (descripcion vacía, pips inválido) |
| FX-MNT-042 | 409 | descripcionBanca ya existe |
| FX-MNT-043 | 404 | codigoBanca no existe en PUT |
| FX-MNT-044 | 404 | codigoBanca no existe en DELETE |
| FX-MNT-500 | 500 | Error inesperado |
