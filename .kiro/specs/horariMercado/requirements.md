# Requirements — Variable Horario de Mercado + Feriados

## Endpoints
- `GET  /parametros/horario-mercado`         — listar horarios de mercado
- `PUT  /parametros/horario-mercado/{id}`    — actualizar horario
- `GET  /parametros/feriados?anio=2026`      — listar feriados por año
- `POST /parametros/feriados`                — agregar feriado
- `DELETE /parametros/feriados/{fecha}`      — eliminar feriado

## Estructura DynamoDB — Horario
```
PK: HORARIO#<id>   SK: METADATA
campos: tipo, id, nombre, horaApertura, horaCierre, pips, updatedAt, updatedBy
```

## Estructura DynamoDB — Feriado
```
PK: FERIADO#<anio>   SK: FECHA#<fecha>
campos: tipo, anio, fecha, descripcion, createdAt, createdBy
```

---

## REQ-001: GET /parametros/horario-mercado

### REQ-001-1: Retorna lista completa
**Given** existen horarios en DynamoDB
**When** GET /parametros/horario-mercado
**Then** HTTP 200:
```json
{
  "data": [
    {
      "id": "001",
      "nombre": "Horario de mercado abierto",
      "horaApertura": "09:00",
      "horaCierre": "15:00",
      "pips": 120,
      "updatedAt": "2026-05-25T08:30:00Z",
      "updatedBy": "ROBERT.GARCIA"
    },
    {
      "id": "002",
      "nombre": "Horario de mercado cerrado",
      "horaApertura": "15:01",
      "horaCierre": "08:59",
      "pips": 150,
      "updatedAt": "2026-05-25T08:30:00Z",
      "updatedBy": "ROBERT.GARCIA"
    }
  ],
  "total": 2
}
```

### REQ-001-2: Lista vacía cuando no hay registros
**Then** HTTP 200 `{ "data": [], "total": 0 }`

### REQ-001-3: Campos requeridos en cada item
Cada item debe tener: `id`, `nombre`, `horaApertura`, `horaCierre`, `pips`, `updatedAt`, `updatedBy`

### REQ-001-4: No expone campos internos
Response NO debe contener: `pk`, `sk`, `tipo`

### REQ-001-5: Error 500 ante falla DynamoDB
HTTP 500 `{ "codigo": "FX-MNT-500", "mensaje": "Error interno del servidor" }`

---

## REQ-002: PUT /parametros/horario-mercado/{id}

### REQ-002-1: Actualiza pips, horaApertura y horaCierre
**Given** existe horario id "001"
**When** PUT body:
```json
{ "pips": 130, "horaApertura": "08:00", "horaCierre": "14:00" }
```
**Then** HTTP 200 con registro actualizado, DynamoDB actualizado

### REQ-002-2: nombre NO se puede modificar
El `nombre` nunca cambia con el PUT

### REQ-002-3: updatedAt y updatedBy se actualizan correctamente
`updatedAt` = timestamp actual ISO, `updatedBy` = usuario del token o "SISTEMA"

### REQ-002-4: 404 si id no existe
HTTP 404 `{ "codigo": "FX-MNT-013", "mensaje": "Horario 999 no encontrado" }`

### REQ-002-5: 400 pips negativo
`{ "pips": -1, ... }` → HTTP 400 `{ "codigo": "FX-MNT-012", "mensaje": "PIPs debe ser >= 0" }`

### REQ-002-6: 400 pips decimal
`{ "pips": 10.5, ... }` → HTTP 400

### REQ-002-7: 400 formato horaApertura inválido
`{ "horaApertura": "25:00", ... }` → HTTP 400 `{ "codigo": "FX-MNT-012", "mensaje": "Formato HH:MM requerido" }`

### REQ-002-8: 400 formato horaCierre inválido
`{ "horaCierre": "abc", ... }` → HTTP 400

### REQ-002-9: 400 body vacío o campos faltantes
`{}` o falta cualquiera de los 3 campos → HTTP 400

### REQ-002-10: 400 sin id en path
HTTP 400 `{ "codigo": "FX-MNT-011" }`

### REQ-002-11: 500 ante falla DynamoDB
HTTP 500 `{ "codigo": "FX-MNT-500" }`

---

## REQ-003: GET /parametros/feriados?anio=2026

### REQ-003-1: Retorna feriados del año solicitado
**Given** existen feriados para 2026
**When** GET /parametros/feriados?anio=2026
**Then** HTTP 200:
```json
{
  "anio": 2026,
  "data": [
    { "fecha": "2026-01-01", "descripcion": "Año Nuevo", "createdAt": "...", "createdBy": "ROBERT.GARCIA" },
    { "fecha": "2026-04-02", "descripcion": "Jueves Santo", "createdAt": "...", "createdBy": "ROBERT.GARCIA" }
  ],
  "total": 2
}
```

### REQ-003-2: 400 si falta el parámetro anio
GET /parametros/feriados (sin ?anio) → HTTP 400 `{ "codigo": "FX-MNT-020", "mensaje": "El parámetro anio es requerido" }`

### REQ-003-3: 400 si anio no es número válido
GET /parametros/feriados?anio=abc → HTTP 400 `{ "codigo": "FX-MNT-020", "mensaje": "El parámetro anio debe ser un número válido" }`

### REQ-003-4: Lista vacía cuando no hay feriados para ese año
HTTP 200 `{ "anio": 2025, "data": [], "total": 0 }`

### REQ-003-5: No expone campos internos
Response NO debe contener: `pk`, `sk`, `tipo`

### REQ-003-6: 500 ante falla DynamoDB
HTTP 500 `{ "codigo": "FX-MNT-500" }`

---

## REQ-004: POST /parametros/feriados

### REQ-004-1: Crea un feriado correctamente
**When** POST body `{ "fecha": "2026-07-28", "descripcion": "Fiestas Patrias" }`
**Then** HTTP 201:
```json
{ "fecha": "2026-07-28", "descripcion": "Fiestas Patrias", "createdAt": "...", "createdBy": "ROBERT.GARCIA" }
```
**And** DynamoDB tiene el registro con `PK: FERIADO#2026`, `SK: FECHA#2026-07-28`

### REQ-004-2: El año se deriva automáticamente de la fecha
No se envía el año en el body — se extrae del campo `fecha`

### REQ-004-3: descripcion es opcional
**When** POST body `{ "fecha": "2026-09-08" }` (sin descripcion)
**Then** HTTP 201 con `descripcion: ""` o `descripcion: null`

### REQ-004-4: 409 si la fecha ya existe
**Given** ya existe el feriado 2026-01-01
**When** POST body `{ "fecha": "2026-01-01" }`
**Then** HTTP 409 `{ "codigo": "FX-MNT-022", "mensaje": "El feriado 2026-01-01 ya existe" }`

### REQ-004-5: 400 formato fecha inválido
`{ "fecha": "28-07-2026" }` → HTTP 400 `{ "codigo": "FX-MNT-021", "mensaje": "Formato de fecha inválido, usar YYYY-MM-DD" }`

### REQ-004-6: 400 fecha ausente
`{}` → HTTP 400

### REQ-004-7: 400 fecha con valores imposibles
`{ "fecha": "2026-13-01" }` → HTTP 400

### REQ-004-8: 500 ante falla DynamoDB
HTTP 500 `{ "codigo": "FX-MNT-500" }`

---

## REQ-005: DELETE /parametros/feriados/{fecha}

### REQ-005-1: Elimina feriado existente
**Given** existe el feriado "2026-01-01"
**When** DELETE /parametros/feriados/2026-01-01
**Then** HTTP 204 sin body
**And** el registro ya no existe en DynamoDB

### REQ-005-2: 404 si la fecha no existe
**When** DELETE /parametros/feriados/2026-06-15
**Then** HTTP 404 `{ "codigo": "FX-MNT-024", "mensaje": "Feriado 2026-06-15 no encontrado" }`

### REQ-005-3: 400 formato fecha inválido en path
DELETE /parametros/feriados/abc → HTTP 400 `{ "codigo": "FX-MNT-023", "mensaje": "Formato de fecha inválido, usar YYYY-MM-DD" }`

### REQ-005-4: 500 ante falla DynamoDB
HTTP 500 `{ "codigo": "FX-MNT-500" }`

---

## REQ-006: Headers siempre presentes
- `Content-Type: application/json`
- `Access-Control-Allow-Origin: *`

---

## REQ-007: Acceso DynamoDB

### REQ-007-1: Horario usa ScanCommand con FilterExpression tipo=HORARIO
### REQ-007-2: Feriado GET usa QueryCommand con PK=FERIADO#<anio> begins_with(SK, FECHA#)
### REQ-007-3: Feriado POST verifica existencia con GetCommand antes de PutCommand
### REQ-007-4: Feriado DELETE verifica existencia con GetCommand antes de DeleteCommand
### REQ-007-5: Horario PUT hace GetCommand primero, luego UpdateCommand solo con pips/horaApertura/horaCierre/updatedAt/updatedBy
