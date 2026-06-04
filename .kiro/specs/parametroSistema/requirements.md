# Requirements — Parámetro Sistema: GET List + PUT

## Endpoints
- `GET /parametros/sistema`              — listar todos los parámetros agrupados
- `PUT /parametros/sistema/{grupo}/{clave}` — actualizar valor de un parámetro

## Estructura DynamoDB
```
PK: PARAMETRO#<grupo>   SK: PARAM#<clave>
campos: tipo, grupo, clave, nombre, valor, tipoValor, updatedAt, updatedBy
```

## Grupos existentes y sus claves
```
CONTINGENCIA_DATATEC:
  ACTIVAR_CONTINGENCIA  → tipo: INTEGER  (0 o 1)
  TC_BANCO_COMPRA       → tipo: DECIMAL
  TC_BANCO_VENTA        → tipo: DECIMAL

PLATAFORMA_FX_PJ:
  IMPORTE_MAXIMO_USD    → tipo: DECIMAL
  TIEMPO_MAXIMO_CONTADOR → tipo: TIME (MM:SS)

PLATAFORMA_FX_PN:
  IMPORTE_MAXIMO_USD    → tipo: DECIMAL
  TIEMPO_MAXIMO_CONTADOR → tipo: TIME (MM:SS)

PLATAFORMA_FX:
  BUZON_CORREOS         → tipo: STRING
  TIEMPO_LIMITE_BANNER  → tipo: TIME (MM:SS)
```

## tipoValor: INTEGER | DECIMAL | STRING | TIME

---

## REQ-001: GET /parametros/sistema

### REQ-001-1: Retorna todos los parámetros agrupados
**When** GET /parametros/sistema
**Then** HTTP 200:
```json
{
  "data": [
    {
      "grupo": "CONTINGENCIA_DATATEC",
      "parametros": [
        { "clave": "ACTIVAR_CONTINGENCIA", "nombre": "Activar contingencia", "valor": "0", "tipoValor": "INTEGER", "updatedAt": "...", "updatedBy": "SISTEMA" },
        { "clave": "TC_BANCO_COMPRA",      "nombre": "Tipo cambio Banco Compra", "valor": "3.72", "tipoValor": "DECIMAL", "updatedAt": "...", "updatedBy": "SISTEMA" },
        { "clave": "TC_BANCO_VENTA",       "nombre": "Tipo cambio Banco Venta",  "valor": "3.73", "tipoValor": "DECIMAL", "updatedAt": "...", "updatedBy": "SISTEMA" }
      ]
    },
    {
      "grupo": "PLATAFORMA_FX",
      "parametros": [...]
    }
  ],
  "totalGrupos": 4,
  "totalParametros": 9
}
```

### REQ-001-2: Filtra por grupo (query param opcional)
**When** GET /parametros/sistema?grupo=CONTINGENCIA_DATATEC
**Then** retorna solo los parámetros de ese grupo, mismo formato agrupado

### REQ-001-3: Lista vacía si no hay parámetros
HTTP 200 `{ "data": [], "totalGrupos": 0, "totalParametros": 0 }`

### REQ-001-4: No expone campos internos
Response NO debe contener: `pk`, `sk`, `tipo`

### REQ-001-5: Grupos ordenados alfabéticamente
Los grupos se ordenan por nombre ASC

### REQ-001-6: Error 500 ante falla DynamoDB
HTTP 500 `{ "codigo": "FX-MNT-500" }`

---

## REQ-002: PUT /parametros/sistema/{grupo}/{clave}

### REQ-002-1: Actualiza el valor de un parámetro
**Given** existe PARAMETRO#CONTINGENCIA_DATATEC / PARAM#ACTIVAR_CONTINGENCIA
**When** PUT /parametros/sistema/CONTINGENCIA_DATATEC/ACTIVAR_CONTINGENCIA
        body `{ "valor": "1" }`
**Then** HTTP 200:
```json
{
  "grupo": "CONTINGENCIA_DATATEC",
  "clave": "ACTIVAR_CONTINGENCIA",
  "nombre": "Activar contingencia",
  "valor": "1",
  "tipoValor": "INTEGER",
  "updatedAt": "<timestamp actual>",
  "updatedBy": "<usuario>"
}
```
**And** DynamoDB actualizado con nuevo valor

### REQ-002-2: Solo se puede cambiar `valor`
`nombre` y `tipoValor` son de solo lectura — no cambian con el PUT

### REQ-002-3: updatedAt y updatedBy se actualizan correctamente

### REQ-002-4: valor se guarda siempre como string
El body `{ "valor": "0" }` → DynamoDB guarda "0" como string

### REQ-002-5: 404 si la combinación grupo/clave no existe
HTTP 404 `{ "codigo": "FX-MNT-073", "mensaje": "Parámetro GRUPO/CLAVE no encontrado" }`

### REQ-002-6: 400 valor vacío o ausente
`{}` o `{ "valor": "" }` → HTTP 400 `{ "codigo": "FX-MNT-072", "mensaje": "valor es requerido" }`

### REQ-002-7: 400 sin grupo en path
HTTP 400 `{ "codigo": "FX-MNT-070" }`

### REQ-002-8: 400 sin clave en path
HTTP 400 `{ "codigo": "FX-MNT-070" }`

### REQ-002-9: 500 ante falla DynamoDB
HTTP 500 `{ "codigo": "FX-MNT-500" }`

---

## REQ-003: Headers siempre presentes
- `Content-Type: application/json`
- `Access-Control-Allow-Origin: *`

---

## REQ-004: Acceso DynamoDB
- GET: ScanCommand FilterExpression tipo=PARAMETRO (+ opcionalmente PK=PARAMETRO#${grupo})
  Luego agrupa en memoria por grupo
- PUT: GetCommand PK=PARAMETRO#${grupo} SK=PARAM#${clave}
  luego UpdateCommand SET valor, updatedAt, updatedBy
  (NO toca nombre ni tipoValor)
