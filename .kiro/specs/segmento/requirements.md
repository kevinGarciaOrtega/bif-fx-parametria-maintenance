# Requirements — Variable Segmento

## Endpoints
- `GET    /parametros/segmento`                — buscar segmentos (con filtro opcional por descripción)
- `POST   /parametros/segmento`                — crear nuevo segmento
- `PUT    /parametros/segmento/{codigoBanca}`  — actualizar PIPs de un segmento
- `DELETE /parametros/segmento/{codigoBanca}`  — eliminar segmento

## Estructura DynamoDB
```
PK: SEGMENTO#<codigoBanca>   SK: METADATA
campos: tipo, codigoBanca, descripcionBanca, pips, origen, updatedAt, updatedBy
GSI2PK: "SEGMENTO"   GSI2SK: descripcionBanca  (para búsqueda por descripción)
```

## Reglas de negocio clave
- `codigoBanca` se genera automáticamente como último código + 1 en formato 4 dígitos (ej: "0009")
- `descripcionBanca` se almacena en MAYÚSCULAS siempre
- `pips` por defecto = 100 si no se especifica
- `origen` = "MANUAL" cuando lo crea el usuario, "SYNC_IBS" cuando viene del job de sincronización
- `codigoBanca` y `descripcionBanca` son de solo lectura después de creado

---

## REQ-001: GET /parametros/segmento

### REQ-001-1: Retorna todos los segmentos sin filtro
**When** GET /parametros/segmento
**Then** HTTP 200:
```json
{
  "data": [
    { "codigoBanca":"0001","descripcionBanca":"DIVISION DE NEGOCIOS","pips":100,"origen":"MANUAL","updatedAt":"...","updatedBy":"ROBERT.GARCIA" },
    { "codigoBanca":"0002","descripcionBanca":"BANCA PREMIUM","pips":150,"origen":"MANUAL","updatedAt":"...","updatedBy":"ROBERT.GARCIA" }
  ],
  "total": 2
}
```

### REQ-001-2: Filtra por descripcion (query param)
**When** GET /parametros/segmento?descripcion=BANCA
**Then** retorna solo los segmentos cuya descripcionBanca contiene "BANCA" (case insensitive)
```json
{ "data": [ { "codigoBanca":"0002","descripcionBanca":"BANCA PREMIUM",... } ], "total": 1 }
```

### REQ-001-3: Lista vacía cuando no hay resultados
**Then** HTTP 200 `{ "data": [], "total": 0 }`

### REQ-001-4: No expone campos internos
Response NO debe contener: `pk`, `sk`, `tipo`, `GSI2PK`, `GSI2SK`

### REQ-001-5: Lista ordenada por codigoBanca ASC
El primer item siempre tiene el código más bajo ("0001")

### REQ-001-6: Error 500 ante falla DynamoDB
HTTP 500 `{ "codigo": "FX-MNT-500" }`

---

## REQ-002: POST /parametros/segmento

### REQ-002-1: Crea segmento con código automático
**Given** el último código existente es "0008"
**When** POST body `{ "descripcionBanca": "nueva banca", "pips": 150 }`
**Then** HTTP 201:
```json
{
  "codigoBanca": "0009",
  "descripcionBanca": "NUEVA BANCA",
  "pips": 150,
  "origen": "MANUAL",
  "updatedAt": "...",
  "updatedBy": "ANA.TORRES"
}
```
**And** descripcionBanca guardada en MAYÚSCULAS

### REQ-002-2: pips por defecto = 100 si no se especifica
**When** POST body `{ "descripcionBanca": "nueva banca" }` (sin pips)
**Then** HTTP 201 con `pips: 100`

### REQ-002-3: Primer segmento obtiene código "0001"
**Given** NO existen segmentos
**When** POST body `{ "descripcionBanca": "primera banca" }`
**Then** HTTP 201 con `codigoBanca: "0001"`

### REQ-002-4: código siguiente es último + 1 en formato 4 dígitos
**Given** existen segmentos con códigos "0001", "0003", "0008"
**When** POST (nuevo segmento)
**Then** `codigoBanca = "0009"` (max + 1, no busca huecos)

### REQ-002-5: 409 si descripcionBanca ya existe (case insensitive)
**Given** existe segmento con descripcionBanca "BANCA PREMIUM"
**When** POST body `{ "descripcionBanca": "banca premium" }`
**Then** HTTP 409 `{ "codigo": "FX-MNT-042", "mensaje": "El segmento BANCA PREMIUM ya existe" }`

### REQ-002-6: 400 descripcionBanca vacía o ausente
`{ "descripcionBanca": "" }` → HTTP 400 `{ "codigo": "FX-MNT-041" }`
`{}` → HTTP 400

### REQ-002-7: 400 pips negativo
`{ "descripcionBanca": "test", "pips": -1 }` → HTTP 400 `{ "codigo": "FX-MNT-041" }`

### REQ-002-8: 400 pips decimal
`{ "descripcionBanca": "test", "pips": 10.5 }` → HTTP 400

### REQ-002-9: 500 ante falla DynamoDB
HTTP 500 `{ "codigo": "FX-MNT-500" }`

---

## REQ-003: PUT /parametros/segmento/{codigoBanca}

### REQ-003-1: Actualiza solo PIPs
**Given** existe segmento "0001"
**When** PUT body `{ "pips": 200 }`
**Then** HTTP 200 con registro actualizado y pips=200

### REQ-003-2: codigoBanca y descripcionBanca NO se modifican
El PUT solo puede cambiar `pips`

### REQ-003-3: updatedAt y updatedBy se actualizan correctamente

### REQ-003-4: 404 si codigoBanca no existe
HTTP 404 `{ "codigo": "FX-MNT-043", "mensaje": "Segmento 0099 no encontrado" }`

### REQ-003-5: 400 pips negativo
HTTP 400 `{ "codigo": "FX-MNT-041" }`

### REQ-003-6: 400 pips decimal
HTTP 400 `{ "codigo": "FX-MNT-041" }`

### REQ-003-7: 400 sin codigoBanca en path
HTTP 400 `{ "codigo": "FX-MNT-040" }`

### REQ-003-8: 500 ante falla DynamoDB
HTTP 500 `{ "codigo": "FX-MNT-500" }`

---

## REQ-004: DELETE /parametros/segmento/{codigoBanca}

### REQ-004-1: Elimina segmento existente
**When** DELETE /parametros/segmento/0001
**Then** HTTP 204 sin body

### REQ-004-2: 404 si no existe
HTTP 404 `{ "codigo": "FX-MNT-044", "mensaje": "Segmento 0099 no encontrado" }`

### REQ-004-3: 400 sin codigoBanca en path
HTTP 400 `{ "codigo": "FX-MNT-040" }`

### REQ-004-4: 500 ante falla DynamoDB
HTTP 500 `{ "codigo": "FX-MNT-500" }`

---

## REQ-005: Headers siempre presentes
- `Content-Type: application/json`
- `Access-Control-Allow-Origin: *`

---

## REQ-006: Acceso DynamoDB
- GET usa ScanCommand con FilterExpression tipo=SEGMENTO, luego filtra en memoria por descripcion
- POST: ScanCommand para obtener todos → calcular siguiente código → verificar duplicado → PutCommand
- PUT: GetCommand primero → UpdateCommand solo pips/updatedAt/updatedBy
- DELETE: GetCommand primero → DeleteCommand
- GSI2PK y GSI2SK se escriben en el PutCommand para mantener el GSI actualizado
