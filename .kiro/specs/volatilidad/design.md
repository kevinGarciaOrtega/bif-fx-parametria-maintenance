# Design — Variable Volatilidad: GET List + PUT

## Archivos involucrados
```
src/
├── handlers/volatilidad.handler.ts
├── repositories/volatilidad.repository.ts
├── models/volatilidad.model.ts
├── validators/schemas.ts
└── utils/response.util.ts / audit.util.ts

tests/
├── unit/volatilidad.validator.test.ts
├── unit/volatilidad.repository.test.ts
└── unit/volatilidad.handler.test.ts
```

---

## Flujo GET /parametros/volatilidad
```
APIGatewayEvent
      │
      ▼
listar() en volatilidad.handler.ts
      │
      ▼
VolatilidadRepository.listarTodos()
      │  ScanCommand
      │  FilterExpression: "#tipo = :tipo" → "VOLATILIDAD"
      ▼
Items[] → map(mapToResponse) → sin pk/sk/tipo
      │
      ▼
ok({ data[], total })  →  HTTP 200
```

## Flujo PUT /parametros/volatilidad/{id}
```
APIGatewayEvent (pathParameters.id + body)
      │
      ▼
actualizar() en volatilidad.handler.ts
      │
      ├── id = event.pathParameters?.id
      │   └── !id → badRequest FX-MNT-001
      │
      ├── JSON.parse(event.body)
      │
      ├── VolatilidadUpdateSchema.safeParse(body)
      │   └── !success → badRequest FX-MNT-002
      │
      ├── getUsuario(event)
      │
      ▼
VolatilidadRepository.actualizar(id, pips, estadoActual, usuario)
      │
      ├── GetCommand { PK: VOLATILIDAD#${id}, SK: METADATA }
      │   └── !item → return null
      │
      ├── UpdateCommand
      │   SET pips, estadoActual, updatedAt, updatedBy
      │   (NO toca nombre, pk, sk, tipo, id)
      │
      ▼
result | null
      ├── null  → notFound FX-MNT-003
      └── ok    → HTTP 200
```

---

## Interfaces TypeScript

### src/models/volatilidad.model.ts
```typescript
// Item interno DynamoDB
export interface Volatilidad {
  pk: string;
  sk: string;
  tipo: "VOLATILIDAD";
  id: string;
  nombre: string;
  pips: number;
  estadoActual: boolean;
  updatedAt: string;
  updatedBy: string;
}

// Request body PUT
export interface VolatilidadUpdateRequest {
  pips: number;
  estadoActual: boolean;
}

// Response al cliente
export interface VolatilidadResponse {
  id: string;
  nombre: string;
  pips: number;
  estadoActual: boolean;
  updatedAt: string;
  updatedBy: string;
}
```

---

## Schema Zod — src/validators/schemas.ts
```typescript
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
```

---

## Mapper interno — volatilidad.repository.ts
```typescript
const mapToResponse = (item: Volatilidad): VolatilidadResponse => ({
  id: item.id,
  nombre: item.nombre,
  pips: item.pips,
  estadoActual: item.estadoActual,
  updatedAt: item.updatedAt,
  updatedBy: item.updatedBy,
  // NO incluir pk, sk, tipo
});
```

---

## Códigos de error
| Código | HTTP | Cuándo |
|--------|------|--------|
| FX-MNT-001 | 400 | ID no viene en path |
| FX-MNT-002 | 400 | Validación Zod falla |
| FX-MNT-003 | 404 | ID no existe en DynamoDB |
| FX-MNT-500 | 500 | Error inesperado |

## Variables de entorno
```
DYNAMO_TABLE=tablero-dev
STAGE=dev
```
