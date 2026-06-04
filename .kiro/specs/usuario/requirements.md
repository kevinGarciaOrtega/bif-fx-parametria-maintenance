# Requirements — Usuario: GET / POST / PUT / DELETE

## Endpoints
- `GET    /usuarios`             — listar usuarios con filtros opcionales
- `POST   /usuarios`             — crear nuevo usuario
- `PUT    /usuarios/{usuarioId}` — actualizar datos del usuario
- `DELETE /usuarios/{usuarioId}` — desactivar usuario (soft delete)

## Estructura DynamoDB
```
PK: USUARIO#<usuarioId>   SK: METADATA
campos: tipo, usuarioId, username, nombre, apellido, email,
        perfilId, estado, createdAt, updatedAt, updatedBy
GSI3PK: "PERFIL#<perfilId>"   GSI3SK: "USUARIO#<usuarioId>"
```

## Perfiles válidos: ADMINISTRADOR | OPERATIVO | CONSULTOR
## Estados: ACTIVO | INACTIVO
## usuarioId: generado automáticamente (uuid corto)

---

## REQ-001: GET /usuarios

### REQ-001-1: Retorna todos los usuarios
**When** GET /usuarios
**Then** HTTP 200:
```json
{
  "data": [
    {
      "usuarioId": "USR001",
      "username": "ROBERT.GARCIA",
      "nombre": "Robert",
      "apellido": "Garcia",
      "email": "rgarcia@banbif.com.pe",
      "perfilId": "ADMINISTRADOR",
      "estado": "ACTIVO",
      "createdAt": "...",
      "updatedAt": "...",
      "updatedBy": "SISTEMA"
    }
  ],
  "total": 1
}
```

### REQ-001-2: Filtra por estado
GET /usuarios?estado=ACTIVO → solo usuarios activos

### REQ-001-3: Filtra por perfilId
GET /usuarios?perfilId=OPERATIVO → solo usuarios con ese perfil

### REQ-001-4: Ambos filtros combinados (AND)
GET /usuarios?estado=ACTIVO&perfilId=ADMINISTRADOR

### REQ-001-5: No expone campos internos
Response NO debe contener: `pk`, `sk`, `tipo`, `GSI3PK`, `GSI3SK`

### REQ-001-6: Error 500 ante falla DynamoDB
HTTP 500 `{ "codigo": "FX-MNT-500" }`

---

## REQ-002: POST /usuarios

### REQ-002-1: Crea usuario correctamente
**When** POST body:
```json
{
  "username": "ANA.TORRES",
  "nombre": "Ana",
  "apellido": "Torres",
  "email": "atorres@banbif.com.pe",
  "perfilId": "OPERATIVO"
}
```
**Then** HTTP 201:
```json
{
  "usuarioId": "<uuid-generado>",
  "username": "ANA.TORRES",
  "nombre": "Ana",
  "apellido": "Torres",
  "email": "atorres@banbif.com.pe",
  "perfilId": "OPERATIVO",
  "estado": "ACTIVO",
  "createdAt": "...",
  "updatedAt": "...",
  "updatedBy": "<usuario del token>"
}
```
**And** estado siempre inicia como ACTIVO

### REQ-002-2: username se guarda en MAYÚSCULAS
`"ana.torres"` → guardado como `"ANA.TORRES"`

### REQ-002-3: 409 si username ya existe
HTTP 409 `{ "codigo": "FX-MNT-082", "mensaje": "El usuario ANA.TORRES ya existe" }`

### REQ-002-4: 400 username vacío o ausente
HTTP 400 `{ "codigo": "FX-MNT-081" }`

### REQ-002-5: 400 email inválido
`{ "email": "no-es-email" }` → HTTP 400 `{ "codigo": "FX-MNT-081" }`

### REQ-002-6: 400 perfilId inválido
`{ "perfilId": "SUPERADMIN" }` → HTTP 400 `{ "codigo": "FX-MNT-081" }`

### REQ-002-7: 400 nombre o apellido ausente
HTTP 400 `{ "codigo": "FX-MNT-081" }`

### REQ-002-8: 500 ante falla DynamoDB
HTTP 500 `{ "codigo": "FX-MNT-500" }`

---

## REQ-003: PUT /usuarios/{usuarioId}

### REQ-003-1: Actualiza nombre, apellido, email, perfilId y/o estado
**When** PUT body `{ "nombre": "Ana María", "perfilId": "ADMINISTRADOR", "estado": "INACTIVO" }`
**Then** HTTP 200 con registro actualizado

### REQ-003-2: username NO se puede modificar
El `username` es inmutable después de crear

### REQ-003-3: Todos los campos del body son opcionales
Enviar solo los campos a cambiar — los no enviados se preservan

### REQ-003-4: 404 si usuarioId no existe
HTTP 404 `{ "codigo": "FX-MNT-083", "mensaje": "Usuario USR999 no encontrado" }`

### REQ-003-5: 400 email inválido si se envía
HTTP 400 `{ "codigo": "FX-MNT-081" }`

### REQ-003-6: 400 perfilId inválido si se envía
HTTP 400 `{ "codigo": "FX-MNT-081" }`

### REQ-003-7: 400 estado inválido si se envía
`{ "estado": "SUSPENDIDO" }` → HTTP 400 `{ "codigo": "FX-MNT-081" }`

### REQ-003-8: 400 sin usuarioId en path
HTTP 400 `{ "codigo": "FX-MNT-080" }`

### REQ-003-9: 500 ante falla DynamoDB
HTTP 500 `{ "codigo": "FX-MNT-500" }`

---

## REQ-004: DELETE /usuarios/{usuarioId}

### REQ-004-1: Desactiva usuario (soft delete — NO elimina el registro)
**When** DELETE /usuarios/USR001
**Then** HTTP 200:
```json
{
  "usuarioId": "USR001",
  "username": "ROBERT.GARCIA",
  "estado": "INACTIVO",
  "updatedAt": "...",
  "updatedBy": "..."
}
```
**And** DynamoDB: estado = "INACTIVO" (el registro sigue existiendo)

### REQ-004-2: 404 si usuarioId no existe
HTTP 404 `{ "codigo": "FX-MNT-084", "mensaje": "Usuario USR999 no encontrado" }`

### REQ-004-3: 400 sin usuarioId en path
HTTP 400 `{ "codigo": "FX-MNT-080" }`

### REQ-004-4: 500 ante falla DynamoDB
HTTP 500 `{ "codigo": "FX-MNT-500" }`

---

## REQ-005: Headers siempre presentes
- `Content-Type: application/json`
- `Access-Control-Allow-Origin: *`

---

## REQ-006: Acceso DynamoDB
- GET: ScanCommand FilterExpression tipo=USUARIO → filtros en memoria
- POST: ScanCommand verificar username duplicado → PutCommand con GSI3PK/GSI3SK
- PUT: GetCommand → UpdateCommand solo los campos enviados
- DELETE: GetCommand → UpdateCommand SET estado=INACTIVO (NO DeleteCommand)
