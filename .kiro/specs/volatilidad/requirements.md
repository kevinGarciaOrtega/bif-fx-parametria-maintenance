# Requirements — Variable Volatilidad: GET List + PUT

## Endpoints
- `GET /parametros/volatilidad` — listar todas las variables de volatilidad
- `PUT /parametros/volatilidad/{id}` — actualizar PIPs y estado

## Estructura DynamoDB
```
PK: VOLATILIDAD#<id>  SK: METADATA
campos: tipo, id, nombre, pips, estadoActual, updatedAt, updatedBy
```

---

## REQ-001: GET /parametros/volatilidad

### REQ-001-1: Retorna lista completa
**Given** existen registros en DynamoDB
**When** GET /parametros/volatilidad
**Then** HTTP 200:
```json
{
  "data": [
    { "id":"001","nombre":"Volatilidad Activa","pips":100,"estadoActual":false,"updatedAt":"...","updatedBy":"ROBERT.GARCIA" },
    { "id":"002","nombre":"Volatilidad Inactiva","pips":200,"estadoActual":true,"updatedAt":"...","updatedBy":"ROBERT.GARCIA" }
  ],
  "total": 2
}
```

### REQ-001-2: Lista vacía
**Given** no existen registros
**When** GET /parametros/volatilidad
**Then** HTTP 200 con `{ "data": [], "total": 0 }`

### REQ-001-3: Campos requeridos en cada item
Cada item debe tener: `id`, `nombre`, `pips`, `estadoActual`, `updatedAt`, `updatedBy`
Ninguno puede ser null o undefined.

### REQ-001-4: No expone campos internos
El response NO debe contener: `pk`, `sk`, `tipo`, `PK`, `SK`

### REQ-001-5: Error 500 ante falla DynamoDB
**Then** HTTP 500 `{ "codigo":"FX-MNT-500", "mensaje":"Error interno del servidor", "timestamp":"..." }`

---

## REQ-002: PUT /parametros/volatilidad/{id}

### REQ-002-1: Actualiza correctamente
**Given** existe volatilidad id "001"
**When** PUT body `{ "pips": 150, "estadoActual": true }`
**Then** HTTP 200 con registro actualizado, DynamoDB actualizado

### REQ-002-2: nombre NO se modifica
El campo `nombre` en DynamoDB nunca cambia con el PUT

### REQ-002-3: updatedAt se actualiza
`updatedAt` = timestamp ISO del momento de la llamada

### REQ-002-4: updatedBy desde authorizer
Si hay username en el token → usa ese valor

### REQ-002-5: updatedBy = "SISTEMA" sin authorizer
Si no hay token/authorizer → updatedBy = "SISTEMA"

### REQ-002-6: 404 si id no existe
**Then** HTTP 404 `{ "codigo":"FX-MNT-003", "mensaje":"Volatilidad 999 no encontrada", "timestamp":"..." }`

### REQ-002-7: 400 pips negativo
body `{ "pips": -1, ... }` → HTTP 400 `{ "codigo":"FX-MNT-002", "mensaje":"PIPs debe ser >= 0" }`

### REQ-002-8: 400 pips decimal
body `{ "pips": 10.5, ... }` → HTTP 400

### REQ-002-9: 400 body vacío o sin campos
`{}` o sin body → HTTP 400

### REQ-002-10: 400 falta pips
`{ "estadoActual": true }` → HTTP 400

### REQ-002-11: 400 falta estadoActual
`{ "pips": 100 }` → HTTP 400

### REQ-002-12: 400 estadoActual no boolean
`{ "pips":100, "estadoActual":"activo" }` → HTTP 400

### REQ-002-13: 400 sin id en path
`PUT /parametros/volatilidad/` sin id → HTTP 400 `{ "codigo":"FX-MNT-001" }`

### REQ-002-14: 500 ante falla DynamoDB
HTTP 500 `{ "codigo":"FX-MNT-500" }`

---

## REQ-003: Headers siempre presentes
- `Content-Type: application/json`
- `Access-Control-Allow-Origin: *`

---

## REQ-004: Acceso DynamoDB
- GET usa ScanCommand con FilterExpression `#tipo = :tipo` valor `VOLATILIDAD`
- PUT hace GetCommand primero (verificar existencia) luego UpdateCommand
- UpdateCommand solo modifica: `pips`, `estadoActual`, `updatedAt`, `updatedBy`
- NO toca: `pk`, `sk`, `tipo`, `id`, `nombre`
