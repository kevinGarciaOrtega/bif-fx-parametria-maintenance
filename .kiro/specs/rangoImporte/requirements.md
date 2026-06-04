# Requirements — Variable Rango de Importe PN y PJ

## Endpoints
- `GET    /parametros/rango-importe/pn`       — listar rangos Persona Natural
- `POST   /parametros/rango-importe/pn`       — crear nuevo rango PN
- `PUT    /parametros/rango-importe/pn/{id}`  — actualizar rango PN
- `DELETE /parametros/rango-importe/pn/{id}`  — eliminar rango PN
- `GET    /parametros/rango-importe/pj`       — listar rangos Persona Jurídica
- `POST   /parametros/rango-importe/pj`       — crear nuevo rango PJ
- `PUT    /parametros/rango-importe/pj/{id}`  — actualizar rango PJ
- `DELETE /parametros/rango-importe/pj/{id}`  — eliminar rango PJ

## Estructura DynamoDB
```
PK: RANGO_PN#<id>  SK: METADATA   (Persona Natural)
PK: RANGO_PJ#<id>  SK: METADATA   (Persona Jurídica)
campos: tipo, id, tipoPersoneria, importeMinimo, importeMaximo, pips, updatedAt, updatedBy
```

## Regla de negocio clave
El `importeMinimo` de un nuevo rango se calcula automáticamente
como el `importeMaximo` del último rango existente ordenado de mayor a menor.
El usuario SOLO ingresa `importeMaximo` y `pips`.

---

## REQ-001: GET /parametros/rango-importe/pn

### REQ-001-1: Retorna lista ordenada por importeMinimo ascendente
**Given** existen rangos PN en DynamoDB
**When** GET /parametros/rango-importe/pn
**Then** HTTP 200:
```json
{
  "tipoPersoneria": "PN",
  "data": [
    { "id":"001","tipoPersoneria":"PN","importeMinimo":0.00,"importeMaximo":500.00,"pips":100,"updatedAt":"...","updatedBy":"ROBERT.GARCIA" },
    { "id":"002","tipoPersoneria":"PN","importeMinimo":500.00,"importeMaximo":1500.00,"pips":80,"updatedAt":"...","updatedBy":"ROBERT.GARCIA" },
    { "id":"003","tipoPersoneria":"PN","importeMinimo":1500.00,"importeMaximo":10000.00,"pips":50,"updatedAt":"...","updatedBy":"ROBERT.GARCIA" }
  ],
  "total": 3
}
```

### REQ-001-2: Lista vacía cuando no hay rangos
**Then** HTTP 200 `{ "tipoPersoneria": "PN", "data": [], "total": 0 }`

### REQ-001-3: Campos requeridos en cada item
Cada item debe tener: `id`, `tipoPersoneria`, `importeMinimo`, `importeMaximo`, `pips`, `updatedAt`, `updatedBy`

### REQ-001-4: No expone campos internos
Response NO debe contener: `pk`, `sk`, `tipo`

### REQ-001-5: Lista ordenada ascendente por importeMinimo
El primer item siempre tiene el importeMinimo más bajo (generalmente 0)

### REQ-001-6: Error 500 ante falla DynamoDB
HTTP 500 `{ "codigo": "FX-MNT-500" }`

---

## REQ-002: GET /parametros/rango-importe/pj
Idéntico a REQ-001 pero con `tipoPersoneria: "PJ"` y datos PJ.

---

## REQ-003: POST /parametros/rango-importe/pn

### REQ-003-1: Crea rango con importeMinimo automático
**Given** el último rango PN tiene importeMaximo=500.00
**When** POST body `{ "importeMaximo": 1500.00, "pips": 80 }`
**Then** HTTP 201:
```json
{
  "id": "<uuid-generado>",
  "tipoPersoneria": "PN",
  "importeMinimo": 500.00,
  "importeMaximo": 1500.00,
  "pips": 80,
  "updatedAt": "...",
  "updatedBy": "ANA.TORRES"
}
```
**And** DynamoDB tiene el registro con `importeMinimo: 500.00` calculado automáticamente

### REQ-003-2: importeMinimo = 0 cuando no hay rangos previos
**Given** NO existen rangos PN
**When** POST body `{ "importeMaximo": 500.00, "pips": 100 }`
**Then** el nuevo rango tiene `importeMinimo: 0`

### REQ-003-3: 400 importeMaximo negativo o cero
`{ "importeMaximo": -1, "pips": 100 }` → HTTP 400 `{ "codigo": "FX-MNT-032", "mensaje": "Importe máximo debe ser > 0" }`

### REQ-003-4: 400 importeMaximo menor o igual al importeMinimo calculado
**Given** último rango tiene importeMaximo=500.00 (por tanto importeMinimo calculado=500.00)
**When** POST body `{ "importeMaximo": 400.00, "pips": 100 }`
**Then** HTTP 400 `{ "codigo": "FX-MNT-032", "mensaje": "Importe máximo debe ser mayor al importe mínimo (500.00)" }`

### REQ-003-5: 400 pips negativo
`{ "importeMaximo": 1500.00, "pips": -1 }` → HTTP 400 `{ "codigo": "FX-MNT-032", "mensaje": "PIPs debe ser >= 0" }`

### REQ-003-6: 400 pips decimal
`{ "pips": 10.5, ... }` → HTTP 400

### REQ-003-7: 400 body vacío o campos faltantes
`{}` → HTTP 400

### REQ-003-8: 500 ante falla DynamoDB
HTTP 500 `{ "codigo": "FX-MNT-500" }`

---

## REQ-004: POST /parametros/rango-importe/pj
Idéntico a REQ-003 pero para PJ. Los rangos PN y PJ son independientes.

---

## REQ-005: PUT /parametros/rango-importe/pn/{id}

### REQ-005-1: Actualiza importeMaximo y pips
**Given** existe rango PN id "002" con importeMinimo=500, importeMaximo=1500
**When** PUT body `{ "importeMaximo": 2000.00, "pips": 75 }`
**Then** HTTP 200 con registro actualizado

### REQ-005-2: importeMinimo NO se puede modificar
El `importeMinimo` nunca cambia con el PUT

### REQ-005-3: updatedAt y updatedBy se actualizan
`updatedAt` = timestamp actual, `updatedBy` = usuario del token o "SISTEMA"

### REQ-005-4: 404 si id no existe
HTTP 404 `{ "codigo": "FX-MNT-033", "mensaje": "Rango PN 999 no encontrado" }`

### REQ-005-5: 400 importeMaximo negativo o cero
HTTP 400 `{ "codigo": "FX-MNT-032" }`

### REQ-005-6: 400 pips negativo
HTTP 400 `{ "codigo": "FX-MNT-032" }`

### REQ-005-7: 400 sin id en path
HTTP 400 `{ "codigo": "FX-MNT-031" }`

### REQ-005-8: 500 ante falla DynamoDB
HTTP 500 `{ "codigo": "FX-MNT-500" }`

---

## REQ-006: PUT /parametros/rango-importe/pj/{id}
Idéntico a REQ-005 pero para PJ con códigos FX-MNT-03x.

---

## REQ-007: DELETE /parametros/rango-importe/pn/{id}

### REQ-007-1: Elimina rango existente
**Given** existe rango PN id "003"
**When** DELETE /parametros/rango-importe/pn/003
**Then** HTTP 204 sin body
**And** el registro ya no existe en DynamoDB

### REQ-007-2: 404 si id no existe
HTTP 404 `{ "codigo": "FX-MNT-034", "mensaje": "Rango PN 999 no encontrado" }`

### REQ-007-3: 400 sin id en path
HTTP 400 `{ "codigo": "FX-MNT-031" }`

### REQ-007-4: 500 ante falla DynamoDB
HTTP 500 `{ "codigo": "FX-MNT-500" }`

---

## REQ-008: DELETE /parametros/rango-importe/pj/{id}
Idéntico a REQ-007 pero para PJ.

---

## REQ-009: Headers siempre presentes
- `Content-Type: application/json`
- `Access-Control-Allow-Origin: *`

---

## REQ-010: Acceso DynamoDB
- GET usa ScanCommand con FilterExpression `#tipo = :tipo` (RANGO_PN o RANGO_PJ)
- GET ordena por importeMinimo ascendente en memoria
- POST: ScanCommand para obtener último rango → calcular importeMinimo → PutCommand
- PUT: GetCommand primero (verificar existencia) → UpdateCommand solo importeMaximo/pips/updatedAt/updatedBy
- DELETE: GetCommand primero (verificar existencia) → DeleteCommand
- PUT y DELETE NO modifican importeMinimo
