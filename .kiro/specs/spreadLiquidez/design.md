# Design — Variable Spread de Liquidez

## Archivos involucrados
```
src/
├── handlers/spreadLiquidez.handler.ts
├── repositories/spreadLiquidez.repository.ts
├── models/spreadLiquidez.model.ts
└── validators/schemas.ts  ← agregar SpreadLiquidezUpdateSchema

tests/unit/
├── spreadLiquidez.validator.test.ts
├── spreadLiquidez.repository.test.ts
└── spreadLiquidez.handler.test.ts
```

---

## Flujo GET /parametros/spread-liquidez
```
listar() handler
    └── SpreadLiquidezRepository.listar()
            └── ScanCommand FilterExpression tipo=SPREAD_LIQUIDEZ
            └── sort: tipoMercado ASC → sentidoOperacion ASC
            └── map(mapToResponse) sin pk/sk/tipo
    └── ok({ data, total })
```

## Flujo PUT /parametros/spread-liquidez/{tipoMercado}/{sentidoOperacion}
```
actualizar() handler
    ├── tipoMercado = event.pathParameters?.tipoMercado
    ├── sentidoOperacion = event.pathParameters?.sentidoOperacion
    ├── !tipoMercado || !sentidoOperacion → badRequest FX-MNT-050
    ├── validar tipoMercado enum → badRequest FX-MNT-051
    ├── validar sentidoOperacion enum → badRequest FX-MNT-051
    ├── SpreadLiquidezUpdateSchema.safeParse(body) → badRequest FX-MNT-052
    └── SpreadLiquidezRepository.actualizar(tipoMercado, sentidoOperacion, pips, usuario)
            ├── GetCommand PK=SPREAD_LIQUIDEZ#${tipoMercado} SK=SENTIDO#${sentidoOperacion}
            │   └── !item → return null
            └── UpdateCommand SET pips, updatedAt, updatedBy
    ├── null → notFound FX-MNT-053
    └── ok(result)
```

---

## Tipos permitidos — validación en handler

```typescript
const TIPOS_MERCADO = ["HORARIO_MERCADO_ABIERTO", "HORARIO_MERCADO_CERRADO"] as const;
const SENTIDOS = ["BANCO_COMPRA_DOLARES", "BANCO_VENDE_DOLARES"] as const;

type TipoMercado = typeof TIPOS_MERCADO[number];
type SentidoOperacion = typeof SENTIDOS[number];
```

---

## Interfaces TypeScript

### src/models/spreadLiquidez.model.ts
```typescript
export type TipoMercado = "HORARIO_MERCADO_ABIERTO" | "HORARIO_MERCADO_CERRADO";
export type SentidoOperacion = "BANCO_COMPRA_DOLARES" | "BANCO_VENDE_DOLARES";

export interface SpreadLiquidez {
  pk: string;                    // SPREAD_LIQUIDEZ#<tipoMercado>
  sk: string;                    // SENTIDO#<sentidoOperacion>
  tipo: "SPREAD_LIQUIDEZ";
  tipoMercado: TipoMercado;
  sentidoOperacion: SentidoOperacion;
  pips: number;                  // puede ser negativo
  updatedAt: string;
  updatedBy: string;
}

export interface SpreadLiquidezUpdateRequest {
  pips: number;
}

export interface SpreadLiquidezResponse {
  tipoMercado: TipoMercado;
  sentidoOperacion: SentidoOperacion;
  pips: number;
  updatedAt: string;
  updatedBy: string;
}
```

---

## Schema Zod — agregar a src/validators/schemas.ts

```typescript
// ── SPREAD LIQUIDEZ ─────────────────────────────────────────
export const SpreadLiquidezUpdateSchema = z.object({
  pips: z
    .number({ invalid_type_error: "PIPs debe ser un número", required_error: "pips es requerido" })
    .int("PIPs debe ser un número entero"),
    // NO .min() porque acepta negativos
});
export type SpreadLiquidezUpdateInput = z.infer<typeof SpreadLiquidezUpdateSchema>;
```

---

## Ordenamiento de la lista

```typescript
// Ordenar por tipoMercado ASC, luego sentidoOperacion ASC
items.sort((a, b) => {
  const tipoComp = a.tipoMercado.localeCompare(b.tipoMercado);
  if (tipoComp !== 0) return tipoComp;
  return a.sentidoOperacion.localeCompare(b.sentidoOperacion);
});
// Resultado esperado:
// HORARIO_MERCADO_ABIERTO  / BANCO_COMPRA_DOLARES
// HORARIO_MERCADO_ABIERTO  / BANCO_VENDE_DOLARES
// HORARIO_MERCADO_CERRADO  / BANCO_COMPRA_DOLARES
// HORARIO_MERCADO_CERRADO  / BANCO_VENDE_DOLARES
```

---

## Códigos de error de este módulo

| Código | HTTP | Cuándo |
|--------|------|--------|
| FX-MNT-050 | 400 | tipoMercado o sentidoOperacion no viene en path |
| FX-MNT-051 | 400 | valor de tipoMercado o sentidoOperacion no es enum válido |
| FX-MNT-052 | 400 | Validación pips falla |
| FX-MNT-053 | 404 | Combinación no existe en DynamoDB |
| FX-MNT-500 | 500 | Error inesperado |
