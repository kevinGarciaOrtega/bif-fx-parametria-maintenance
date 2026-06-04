# Requirements — Base Spread de Clientes

## Endpoints
- `GET    /parametros/spread-cliente`                    — buscar clientes con spread
- `GET    /parametros/spread-cliente/buscar-ibs/{codigoIbs}` — consultar cliente en IBS Core
- `POST   /parametros/spread-cliente`                    — crear cliente con spread
- `PUT    /parametros/spread-cliente/{codigoIbs}`        — actualizar spread de cliente
- `DELETE /parametros/spread-cliente/{codigoIbs}`        — eliminar cliente

## Estructura DynamoDB
```
PK: SPREAD_CLIENTE#<codigoIbs>   SK: METADATA
campos: tipo, codigoIbs, tipoPersoneria, tipoDocumento, nroDocumento,
        razonSocial, apellidoPaterno, apellidoMaterno, nombres,
        codigoBanca, descripcionBanca, spreadPips, flagMotor,
        updatedAt, updatedBy
GSI2PK: "SPREAD_CLIENTE"   GSI2SK: codigoIbs
```

## Reglas de negocio
- Al crear, el operador ingresa solo: codigoIbs, codigoBanca, spreadPips, flagMotor
- Los datos del cliente (nombre, documento, personería) vienen del IBS Core via buscar-ibs
- flagMotor: "ACTIVO" | "INACTIVO"
- spreadPips >= 0
- Un cliente solo puede tener UN registro de spread (codigoIbs único)

---

## REQ-001: GET /parametros/spread-cliente — Buscar con filtros

### REQ-001-1: Retorna todos sin filtros
**When** GET /parametros/spread-cliente
**Then** HTTP 200:
```json
{
  "data": [
    {
      "codigoIbs": "437",
      "tipoPersoneria": "Persona Juridica",
      "tipoDocumento": "RUC",
      "nroDocumento": "20100055237",
      "razonSocial": "ALICO",
      "apellidoPaterno": "",
      "apellidoMaterno": "",
      "nombres": "",
      "codigoBanca": "0004",
      "descripcionBanca": "BANCA CORPORATIVA",
      "spreadPips": 150,
      "flagMotor": "ACTIVO",
      "updatedAt": "...",
      "updatedBy": "ROBERT.GARCIA"
    }
  ],
  "total": 1
}
```

### REQ-001-2: Filtra por codigoIbs (exacto)
**When** GET /parametros/spread-cliente?codigoIbs=437
**Then** retorna solo el cliente con ese código IBS exacto

### REQ-001-3: Filtra por nroDocumento (exacto)
**When** GET /parametros/spread-cliente?nroDocumento=20100055237

### REQ-001-4: Filtra por tipoDocumento
**When** GET /parametros/spread-cliente?tipoDocumento=RUC

### REQ-001-5: Filtra por tipoPersoneria
**When** GET /parametros/spread-cliente?tipoPersoneria=Persona Juridica

### REQ-001-6: Filtra por flagMotor
**When** GET /parametros/spread-cliente?flagMotor=ACTIVO

### REQ-001-7: Filtra por nombreCliente (contains, case insensitive)
**When** GET /parametros/spread-cliente?nombreCliente=alico
**Then** retorna clientes cuya razonSocial, apellidoPaterno o nombres contienen "alico"

### REQ-001-8: Múltiples filtros se combinan (AND)
GET ?flagMotor=ACTIVO&tipoDocumento=RUC retorna solo los que cumplen ambos

### REQ-001-9: Lista vacía si no hay resultados
HTTP 200 `{ "data": [], "total": 0 }`

### REQ-001-10: No expone campos internos
Response NO debe contener: `pk`, `sk`, `tipo`, `GSI2PK`, `GSI2SK`

### REQ-001-11: Error 500 ante falla DynamoDB
HTTP 500 `{ "codigo": "FX-MNT-500" }`

---

## REQ-002: GET /parametros/spread-cliente/buscar-ibs/{codigoIbs}

### REQ-002-1: Retorna datos del cliente desde DynamoDB si existe
**Given** existe SPREAD_CLIENTE#437
**When** GET /parametros/spread-cliente/buscar-ibs/437
**Then** HTTP 200 con los datos del cliente para pre-cargar el formulario:
```json
{
  "codigoIbs": "437",
  "tipoPersoneria": "Persona Juridica",
  "tipoDocumento": "RUC",
  "nroDocumento": "20100055237",
  "razonSocial": "ALICO",
  "apellidoPaterno": "",
  "apellidoMaterno": "",
  "nombres": "",
  "codigoBanca": "0004",
  "descripcionBanca": "BANCA CORPORATIVA"
}
```

### REQ-002-2: 404 si no existe en DynamoDB
HTTP 404 `{ "codigo": "FX-MNT-062", "mensaje": "Cliente 999 no encontrado" }`

### REQ-002-3: 400 sin codigoIbs en path
HTTP 400 `{ "codigo": "FX-MNT-060" }`

### REQ-002-4: 500 ante falla DynamoDB
HTTP 500 `{ "codigo": "FX-MNT-500" }`

---

## REQ-003: POST /parametros/spread-cliente

### REQ-003-1: Crea cliente con spread
**When** POST body:
```json
{
  "codigoIbs": "999",
  "tipoPersoneria": "Persona Natural",
  "tipoDocumento": "DNI",
  "nroDocumento": "12345678",
  "apellidoPaterno": "GARCIA",
  "apellidoMaterno": "LOPEZ",
  "nombres": "JUAN",
  "razonSocial": "",
  "codigoBanca": "0002",
  "descripcionBanca": "BANCA PREMIUM",
  "spreadPips": 150,
  "flagMotor": "ACTIVO"
}
```
**Then** HTTP 201 con el registro creado

### REQ-003-2: 409 si codigoIbs ya existe
HTTP 409 `{ "codigo": "FX-MNT-063", "mensaje": "El cliente 437 ya tiene spread configurado" }`

### REQ-003-3: 400 codigoIbs ausente
HTTP 400 `{ "codigo": "FX-MNT-061" }`

### REQ-003-4: 400 spreadPips negativo
HTTP 400 `{ "codigo": "FX-MNT-061" }`

### REQ-003-5: 400 flagMotor inválido
`{ "flagMotor": "OTRO" }` → HTTP 400

### REQ-003-6: 400 codigoBanca ausente
HTTP 400 `{ "codigo": "FX-MNT-061" }`

### REQ-003-7: 500 ante falla DynamoDB
HTTP 500 `{ "codigo": "FX-MNT-500" }`

---

## REQ-004: PUT /parametros/spread-cliente/{codigoIbs}

### REQ-004-1: Actualiza codigoBanca, spreadPips y flagMotor
**When** PUT body `{ "codigoBanca": "0003", "spreadPips": 200, "flagMotor": "INACTIVO" }`
**Then** HTTP 200 con registro actualizado

### REQ-004-2: Datos del cliente (nombre, documento) NO se modifican
Solo cambia: codigoBanca, descripcionBanca, spreadPips, flagMotor, updatedAt, updatedBy

### REQ-004-3: 404 si codigoIbs no existe
HTTP 404 `{ "codigo": "FX-MNT-063", "mensaje": "Cliente 999 no encontrado" }`

### REQ-004-4: 400 spreadPips negativo
HTTP 400 `{ "codigo": "FX-MNT-061" }`

### REQ-004-5: 400 flagMotor inválido
HTTP 400 `{ "codigo": "FX-MNT-061" }`

### REQ-004-6: 400 sin codigoIbs en path
HTTP 400 `{ "codigo": "FX-MNT-060" }`

### REQ-004-7: 500 ante falla DynamoDB
HTTP 500 `{ "codigo": "FX-MNT-500" }`

---

## REQ-005: DELETE /parametros/spread-cliente/{codigoIbs}

### REQ-005-1: Elimina cliente existente
**When** DELETE /parametros/spread-cliente/437
**Then** HTTP 204 sin body

### REQ-005-2: 404 si no existe
HTTP 404 `{ "codigo": "FX-MNT-064", "mensaje": "Cliente 999 no encontrado" }`

### REQ-005-3: 400 sin codigoIbs en path
HTTP 400 `{ "codigo": "FX-MNT-060" }`

### REQ-005-4: 500 ante falla DynamoDB
HTTP 500 `{ "codigo": "FX-MNT-500" }`

---

## REQ-006: Headers siempre presentes
- `Content-Type: application/json`
- `Access-Control-Allow-Origin: *`

---

## REQ-007: Acceso DynamoDB
- GET buscar: ScanCommand tipo=SPREAD_CLIENTE → filtros en memoria
- GET buscar-ibs: GetCommand PK=SPREAD_CLIENTE#${codigoIbs} SK=METADATA
- POST: GetCommand verificar duplicado → PutCommand con GSI2PK/GSI2SK
- PUT: GetCommand verificar existencia → UpdateCommand
- DELETE: GetCommand verificar existencia → DeleteCommand
