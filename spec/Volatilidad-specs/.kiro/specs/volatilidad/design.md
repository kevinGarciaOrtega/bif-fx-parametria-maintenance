# Design — Variable Volatilidad: GET List + PUT

## Ubicación en el proyecto
```
bif-fx-parameterization-maintenance-svc/
└── src/
    ├── handlers/
    │   └── volatilidad.handler.ts     ← entry points Lambda (YA EXISTE)
    ├── repositories/
    │   └── volatilidad.repository.ts  ← acceso DynamoDB (YA EXISTE)
    ├── models/
    │   └── volatilidad.model.ts       ← interfaces TypeScript (YA EXISTE)
    ├── validators/
    │   └── schemas.ts                 ← VolatilidadUpdateSchema Zod (YA EXISTE)
    └── utils/
        ├── response.util.ts           ← helpers HTTP (YA EXISTE)
        └── audit.util.ts              ← getUsuario() (YA EXISTE)
```
**Todos los archivos base ya existen.** Este spec completa la implementación
y agrega los tests.

---

## Flujo GET /parametros/volatilidad

```
APIGatewayEvent
      │
      ▼
volatilidad.handler.ts → listar()
      │
      ▼
VolatilidadRepository.listarTodos()
      │
      ├── ScanCommand
      │   TableName: process.env.DYNAMO_TABLE
      │   FilterExpression: "#tipo = :tipo"
      │   ExpressionAttributeNames: { "#tipo": "tipo" }
      │   ExpressionAttributeValues: { ":tipo": "VOLATILIDAD" }
      │
      ▼
Items[] → map(mapToResponse) → filtra campos internos
      │
      ▼
ok({ data: VolatilidadResponse[], total: number })
      │
      ▼
HTTP 200
```

---

## Flujo PUT /parametros/volatilidad/{id}

```
APIGatewayEvent (pathParameters.id, body)
      │
      ▼
volatilidad.handler.ts → actualizar()
      │
      ├── Extraer id de pathParameters
      │   └── Si no hay id → badRequest FX-MNT-001
      │
      ├── JSON.parse(event.body)
      │
      ├── VolatilidadUpdateSchema.safeParse(body)
      │   └── Si falla → badRequest FX-MNT-002 con primer error Zod
      │
      ├── getUsuario(event) → username o "SISTEMA"
      │
      ▼
VolatilidadRepository.actualizar(id, pips, estadoActual, usuario)
      │
      ├── GetCommand { PK: `VOLATILIDAD#${id}`, SK: "METADATA" }
      │   └── Si no existe → return null
      │
      ├── UpdateCommand
      │   UpdateExpression: "SET pips = :pips,
      │                          estadoActual = :estadoActual,
      │                          updatedAt = :updatedAt,
      │                          updatedBy = :updatedBy"
      │   (NO modifica: pk, sk, tipo, id, nombre)
      │
      ▼
VolatilidadResponse | null
      │
      ├── Si null → notFound FX-MNT-003
      └── Si ok   → ok(result) HTTP 200
```

---

## Interfaces TypeScript

```typescript
// src/models/volatilidad.model.ts (ya existe, verificar que tenga todo)

// Item en DynamoDB (internal)
interface Volatilidad {
  pk: string;            // "VOLATILIDAD#001"
  sk: string;            // "METADATA"
  tipo: "VOLATILIDAD";
  id: string;            // "001"
  nombre: string;        // "Volatilidad Activa" — solo lectura
  pips: number;          // editable
  estadoActual: boolean; // editable
  updatedAt: string;     // ISO 8601
  updatedBy: string;     // username
}

// Request body del PUT
interface VolatilidadUpdateRequest {
  pips: number;
  estadoActual: boolean;
}

// Response al cliente (sin campos internos)
interface VolatilidadResponse {
  id: string;
  nombre: string;
  pips: number;
  estadoActual: boolean;
  updatedAt: string;
  updatedBy: string;
}
```

---

## Schema Zod (ya existe en validators/schemas.ts)

```typescript
export const VolatilidadUpdateSchema = z.object({
  pips: z.number().int("PIPs debe ser un número entero").min(0, "PIPs debe ser >= 0"),
  estadoActual: z.boolean(),
});
```

---

## Mapper interno

```typescript
// Dentro de volatilidad.repository.ts
const mapToResponse = (item: Volatilidad): VolatilidadResponse => ({
  id: item.id,
  nombre: item.nombre,
  pips: item.pips,
  estadoActual: item.estadoActual,
  updatedAt: item.updatedAt,
  updatedBy: item.updatedBy,
  // NO incluir: pk, sk, tipo
});
```

---

## Variables de entorno requeridas

```
DYNAMO_TABLE=tablero-dev     ← nombre de la tabla
STAGE=dev                    ← para configurar endpoint local
```

---

## Códigos de error de este módulo

| Código | HTTP | Cuándo |
|--------|------|--------|
| FX-MNT-001 | 400 | ID no viene en el path |
| FX-MNT-002 | 400 | Validación Zod falla (pips negativo, tipo incorrecto, etc.) |
| FX-MNT-003 | 404 | ID no existe en DynamoDB |
| FX-MNT-500 | 500 | Error inesperado (DynamoDB caído, etc.) |
