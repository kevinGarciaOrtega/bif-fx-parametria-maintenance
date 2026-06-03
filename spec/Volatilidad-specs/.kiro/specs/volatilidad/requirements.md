# Requirements — Variable Volatilidad: GET List + PUT

## Overview
Implementar los dos endpoints del módulo de Volatilidad dentro del servicio
`bif-fx-parameterization-maintenance-svc`:

- `GET /parametros/volatilidad` — listar todas las variables de volatilidad
- `PUT /parametros/volatilidad/{id}` — actualizar PIPs y estado de una variable

La entidad Volatilidad en DynamoDB tiene esta estructura:
```
PK: VOLATILIDAD#<id>
SK: METADATA
tipo: "VOLATILIDAD"
id: string
nombre: string       ← solo lectura, no se puede cambiar
pips: number         ← editable
estadoActual: boolean ← editable
updatedAt: string    ← ISO 8601, se actualiza en cada PUT
updatedBy: string    ← username del usuario autenticado
```

---

## REQ-001: GET /parametros/volatilidad — Listar todas las volatilidades

### REQ-001-1: Retorna lista completa
**Given** que existen registros de volatilidad en DynamoDB
**When** se llama `GET /parametros/volatilidad`
**Then** retorna HTTP 200 con el body:
```json
{
  "data": [
    {
      "id": "001",
      "nombre": "Volatilidad Activa",
      "pips": 100,
      "estadoActual": false,
      "updatedAt": "2026-05-25T08:30:00Z",
      "updatedBy": "ROBERT.GARCIA"
    },
    {
      "id": "002",
      "nombre": "Volatilidad Inactiva",
      "pips": 200,
      "estadoActual": true,
      "updatedAt": "2026-05-25T08:30:00Z",
      "updatedBy": "ROBERT.GARCIA"
    }
  ],
  "total": 2
}
```

### REQ-001-2: Lista vacía cuando no hay registros
**Given** que NO existen registros de volatilidad en DynamoDB
**When** se llama `GET /parametros/volatilidad`
**Then** retorna HTTP 200 con:
```json
{
  "data": [],
  "total": 0
}
```

### REQ-001-3: El campo `nombre` siempre presente
**Given** que existe un registro de volatilidad
**When** se llama `GET /parametros/volatilidad`
**Then** cada item del array debe tener los campos:
`id`, `nombre`, `pips`, `estadoActual`, `updatedAt`, `updatedBy`
Ningún campo puede ser `null` o `undefined`

### REQ-001-4: No expone campos internos de DynamoDB
**When** se llama `GET /parametros/volatilidad`
**Then** el response NO debe contener los campos:
`pk`, `sk`, `tipo`, `PK`, `SK`

### REQ-001-5: Error 500 ante falla de DynamoDB
**Given** que DynamoDB no está disponible
**When** se llama `GET /parametros/volatilidad`
**Then** retorna HTTP 500 con:
```json
{
  "codigo": "FX-MNT-500",
  "mensaje": "Error interno del servidor",
  "timestamp": "<ISO timestamp>"
}
```

---

## REQ-002: PUT /parametros/volatilidad/{id} — Actualizar volatilidad

### REQ-002-1: Actualiza PIPs y estado correctamente
**Given** que existe la volatilidad con id "001"
**When** se llama `PUT /parametros/volatilidad/001` con:
```json
{
  "pips": 150,
  "estadoActual": true
}
```
**Then** retorna HTTP 200 con el registro actualizado:
```json
{
  "id": "001",
  "nombre": "Volatilidad Activa",
  "pips": 150,
  "estadoActual": true,
  "updatedAt": "<timestamp actual ISO>",
  "updatedBy": "<usuario del token>"
}
```
**And** el registro en DynamoDB queda actualizado con los nuevos valores

### REQ-002-2: El campo `nombre` no se puede modificar
**Given** que existe la volatilidad con id "001" y nombre "Volatilidad Activa"
**When** se llama `PUT /parametros/volatilidad/001` con `nombre: "Otro nombre"`
**Then** el campo `nombre` en DynamoDB NO cambia
**And** el response retorna el nombre original

### REQ-002-3: `updatedAt` se actualiza con timestamp actual
**Given** que existe volatilidad con id "001"
**When** se llama `PUT /parametros/volatilidad/001`
**Then** el `updatedAt` en DynamoDB es el timestamp del momento de la llamada
en formato ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`)

### REQ-002-4: `updatedBy` toma el username del contexto
**Given** que el request viene con el username "ANA.TORRES" en el authorizer
**When** se llama `PUT /parametros/volatilidad/001`
**Then** el `updatedBy` en DynamoDB queda como "ANA.TORRES"

### REQ-002-5: `updatedBy` es "SISTEMA" si no hay authorizer
**Given** que el request NO tiene authorizer (llamada directa sin token)
**When** se llama `PUT /parametros/volatilidad/001`
**Then** el `updatedBy` queda como "SISTEMA"

### REQ-002-6: Error 404 si el id no existe
**Given** que NO existe volatilidad con id "999"
**When** se llama `PUT /parametros/volatilidad/999`
**Then** retorna HTTP 404 con:
```json
{
  "codigo": "FX-MNT-003",
  "mensaje": "Volatilidad 999 no encontrada",
  "timestamp": "<ISO timestamp>"
}
```
**And** DynamoDB NO es modificado

### REQ-002-7: Error 400 si PIPs es negativo
**Given** que existe volatilidad con id "001"
**When** se llama con body `{ "pips": -1, "estadoActual": false }`
**Then** retorna HTTP 400 con:
```json
{
  "codigo": "FX-MNT-002",
  "mensaje": "PIPs debe ser >= 0",
  "timestamp": "<ISO timestamp>"
}
```
**And** DynamoDB NO es modificado

### REQ-002-8: Error 400 si PIPs es decimal
**When** se llama con body `{ "pips": 10.5, "estadoActual": false }`
**Then** retorna HTTP 400
**And** el mensaje indica que PIPs debe ser un número entero

### REQ-002-9: Error 400 si body está vacío
**When** se llama con body `{}` o sin body
**Then** retorna HTTP 400

### REQ-002-10: Error 400 si falta el campo `pips`
**When** se llama con body `{ "estadoActual": true }`
**Then** retorna HTTP 400

### REQ-002-11: Error 400 si falta el campo `estadoActual`
**When** se llama con body `{ "pips": 100 }`
**Then** retorna HTTP 400

### REQ-002-12: Error 400 si `estadoActual` no es boolean
**When** se llama con body `{ "pips": 100, "estadoActual": "activo" }`
**Then** retorna HTTP 400

### REQ-002-13: Error 400 si `id` no viene en el path
**When** se llama `PUT /parametros/volatilidad/` sin id
**Then** retorna HTTP 400 con:
```json
{
  "codigo": "FX-MNT-001",
  "mensaje": "ID requerido",
  "timestamp": "<ISO timestamp>"
}
```

### REQ-002-14: Error 500 ante falla de DynamoDB
**Given** que DynamoDB no está disponible
**When** se llama `PUT /parametros/volatilidad/001`
**Then** retorna HTTP 500 con código "FX-MNT-500"

---

## REQ-003: Headers de respuesta

### REQ-003-1: Content-Type siempre application/json
**When** se llama cualquiera de los endpoints
**Then** el header `Content-Type: application/json` siempre está presente

### REQ-003-2: CORS habilitado
**When** se llama cualquiera de los endpoints
**Then** el header `Access-Control-Allow-Origin: *` siempre está presente

---

## REQ-004: Acceso a DynamoDB

### REQ-004-1: Scan con FilterExpression por tipo
**When** se ejecuta el GET list
**Then** el query a DynamoDB usa:
```
ScanCommand con FilterExpression: "#tipo = :tipo"
ExpressionAttributeValues: { ":tipo": "VOLATILIDAD" }
```
No hace un Scan sin filtro sobre toda la tabla.

### REQ-004-2: GetItem antes del UpdateItem en PUT
**When** se ejecuta el PUT
**Then** primero hace `GetCommand` para verificar existencia
**And** solo si existe ejecuta `UpdateCommand`
**And** el `UpdateCommand` usa `UpdateExpression` (no `PutCommand`)
para no sobreescribir campos que no se modifican (como `nombre`)

### REQ-004-3: UpdateExpression solo modifica campos editables
**When** se ejecuta el PUT
**Then** el `UpdateExpression` solo actualiza:
`pips`, `estadoActual`, `updatedAt`, `updatedBy`
**And** NO toca: `pk`, `sk`, `tipo`, `id`, `nombre`
