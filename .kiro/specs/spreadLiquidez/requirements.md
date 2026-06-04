# Requirements — Variable Spread de Liquidez

## Endpoints
- `GET /parametros/spread-liquidez`                                    — listar todos
- `PUT /parametros/spread-liquidez/{tipoMercado}/{sentidoOperacion}`   — actualizar PIPs

## Estructura DynamoDB
```
PK: SPREAD_LIQUIDEZ#<tipoMercado>   SK: SENTIDO#<sentidoOperacion>
campos: tipo, tipoMercado, sentidoOperacion, pips, updatedAt, updatedBy
```

## Valores permitidos
```
tipoMercado:      HORARIO_MERCADO_ABIERTO | HORARIO_MERCADO_CERRADO
sentidoOperacion: BANCO_COMPRA_DOLARES    | BANCO_VENDE_DOLARES
pips: puede ser negativo (ej: -15)
```

## Registros fijos — siempre existen los 4
```
SPREAD_LIQUIDEZ#HORARIO_MERCADO_ABIERTO  / SENTIDO#BANCO_COMPRA_DOLARES  pips: 50
SPREAD_LIQUIDEZ#HORARIO_MERCADO_ABIERTO  / SENTIDO#BANCO_VENDE_DOLARES   pips: 25
SPREAD_LIQUIDEZ#HORARIO_MERCADO_CERRADO  / SENTIDO#BANCO_COMPRA_DOLARES  pips: 0
SPREAD_LIQUIDEZ#HORARIO_MERCADO_CERRADO  / SENTIDO#BANCO_VENDE_DOLARES   pips: -15
```
No se crean ni eliminan registros — solo se actualizan los PIPs.

---

## REQ-001: GET /parametros/spread-liquidez

### REQ-001-1: Retorna los 4 registros
**When** GET /parametros/spread-liquidez
**Then** HTTP 200:
```json
{
  "data": [
    { "tipoMercado":"HORARIO_MERCADO_ABIERTO","sentidoOperacion":"BANCO_COMPRA_DOLARES","pips":50,"updatedAt":"...","updatedBy":"ROBERT.GARCIA" },
    { "tipoMercado":"HORARIO_MERCADO_ABIERTO","sentidoOperacion":"BANCO_VENDE_DOLARES","pips":25,"updatedAt":"...","updatedBy":"ROBERT.GARCIA" },
    { "tipoMercado":"HORARIO_MERCADO_CERRADO","sentidoOperacion":"BANCO_COMPRA_DOLARES","pips":0,"updatedAt":"...","updatedBy":"ROBERT.GARCIA" },
    { "tipoMercado":"HORARIO_MERCADO_CERRADO","sentidoOperacion":"BANCO_VENDE_DOLARES","pips":-15,"updatedAt":"...","updatedBy":"ROBERT.GARCIA" }
  ],
  "total": 4
}
```

### REQ-001-2: pips puede ser negativo, cero o positivo
El campo `pips` no tiene restricción de positivo — acepta -15, 0, 50, etc.

### REQ-001-3: No expone campos internos
Response NO debe contener: `pk`, `sk`, `tipo`

### REQ-001-4: Lista ordenada por tipoMercado ASC luego sentidoOperacion ASC
```
HORARIO_MERCADO_ABIERTO / BANCO_COMPRA_DOLARES  (primero)
HORARIO_MERCADO_ABIERTO / BANCO_VENDE_DOLARES
HORARIO_MERCADO_CERRADO / BANCO_COMPRA_DOLARES
HORARIO_MERCADO_CERRADO / BANCO_VENDE_DOLARES   (último)
```

### REQ-001-5: Lista vacía si no hay registros
HTTP 200 `{ "data": [], "total": 0 }`

### REQ-001-6: Error 500 ante falla DynamoDB
HTTP 500 `{ "codigo": "FX-MNT-500" }`

---

## REQ-002: PUT /parametros/spread-liquidez/{tipoMercado}/{sentidoOperacion}

### REQ-002-1: Actualiza PIPs correctamente
**Given** existe HORARIO_MERCADO_ABIERTO / BANCO_COMPRA_DOLARES con pips=50
**When** PUT body `{ "pips": 75 }`
**Then** HTTP 200:
```json
{
  "tipoMercado": "HORARIO_MERCADO_ABIERTO",
  "sentidoOperacion": "BANCO_COMPRA_DOLARES",
  "pips": 75,
  "updatedAt": "<timestamp actual>",
  "updatedBy": "<usuario>"
}
```

### REQ-002-2: Acepta pips negativo
`{ "pips": -20 }` → HTTP 200 actualizado con pips=-20

### REQ-002-3: Acepta pips = 0
`{ "pips": 0 }` → HTTP 200 actualizado con pips=0

### REQ-002-4: updatedAt y updatedBy se actualizan
`updatedAt` = ISO timestamp actual, `updatedBy` = usuario o "SISTEMA"

### REQ-002-5: tipoMercado y sentidoOperacion NO se modifican
Solo cambia `pips`, `updatedAt`, `updatedBy`

### REQ-002-6: 404 si la combinación no existe
PUT /parametros/spread-liquidez/TIPO_INVALIDO/BANCO_COMPRA_DOLARES
→ HTTP 404 `{ "codigo": "FX-MNT-053", "mensaje": "Spread de liquidez no encontrado" }`

### REQ-002-7: 400 tipoMercado inválido en path
`tipoMercado` no es HORARIO_MERCADO_ABIERTO ni HORARIO_MERCADO_CERRADO
→ HTTP 400 `{ "codigo": "FX-MNT-051", "mensaje": "tipoMercado inválido" }`

### REQ-002-8: 400 sentidoOperacion inválido en path
`sentidoOperacion` no es BANCO_COMPRA_DOLARES ni BANCO_VENDE_DOLARES
→ HTTP 400 `{ "codigo": "FX-MNT-051", "mensaje": "sentidoOperacion inválido" }`

### REQ-002-9: 400 tipoMercado ausente en path
HTTP 400 `{ "codigo": "FX-MNT-050" }`

### REQ-002-10: 400 sentidoOperacion ausente en path
HTTP 400 `{ "codigo": "FX-MNT-050" }`

### REQ-002-11: 400 pips ausente en body
`{}` → HTTP 400 `{ "codigo": "FX-MNT-052" }`

### REQ-002-12: 400 pips no es número entero
`{ "pips": 10.5 }` → HTTP 400 `{ "codigo": "FX-MNT-052" }`

### REQ-002-13: 400 pips como string
`{ "pips": "50" }` → HTTP 400 `{ "codigo": "FX-MNT-052" }`

### REQ-002-14: 500 ante falla DynamoDB
HTTP 500 `{ "codigo": "FX-MNT-500" }`

---

## REQ-003: Headers siempre presentes
- `Content-Type: application/json`
- `Access-Control-Allow-Origin: *`

---

## REQ-004: Acceso DynamoDB
- GET usa ScanCommand FilterExpression tipo=SPREAD_LIQUIDEZ
- PUT: GetCommand PK=SPREAD_LIQUIDEZ#${tipoMercado} SK=SENTIDO#${sentidoOperacion}
  luego UpdateCommand SET pips/updatedAt/updatedBy (NO toca tipoMercado ni sentidoOperacion)
