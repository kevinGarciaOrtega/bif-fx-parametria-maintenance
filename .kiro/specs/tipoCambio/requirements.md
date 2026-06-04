# Requirements — Tipo de Cambio: TC Base + TC Ventanilla

## Endpoints
- `GET  /tipo-cambio/base`                           — obtener TC Base de todos los pares
- `PUT  /tipo-cambio/base/{parMoneda}`               — edición manual del TC Base
- `GET  /tipo-cambio/base/{parMoneda}/auditoria`     — historial de cambios del TC Base
- `GET  /tipo-cambio/ventanilla/{parMoneda}`         — obtener TC Ventanilla por par
- `POST /tipo-cambio/ventanilla/{parMoneda}`         — enviar TC Ventanilla con spreads

## Estructura DynamoDB

### TC Base (activo)
```
PK: TC_BASE#<parMoneda>   SK: ACTIVO
campos: tipo, parMoneda, monedaOrigen, monedaDestino, fuente,
        fuenteCompra, valorCompra, fuenteVenta, valorVenta,
        ultimaActualizacion, estadoVentana, esEdicionManual,
        updatedAt, updatedBy
```

### TC Base (auditoría)
```
PK: TC_BASE#<parMoneda>   SK: AUDITORIA#<timestamp>
campos: tipo, parMoneda, valorCompraAnterior, valorCompraNuevo,
        valorVentaAnterior, valorVentaNuevo, esEdicionManual,
        motivoEdicion, updatedAt, updatedBy
```

### TC Ventanilla
```
PK: TC_VENTANILLA#<parMoneda>   SK: SEGMENTO#<segmento>
campos: tipo, parMoneda, segmento, tcBaseCompraRef, tcBaseVentaRef,
        spreadCompraPips, spreadVentaPips, valorCompra, valorVenta,
        enviadoAt, enviadoBy
```

## Pares de moneda válidos: USD_PEN | EUR_PEN
## Segmentos ventanilla: EMPLEADO | PREMIUM | PREFERENCIAL | PIZARRA

---

## REQ-001: GET /tipo-cambio/base

### REQ-001-1: Retorna todos los pares activos
**When** GET /tipo-cambio/base
**Then** HTTP 200:
```json
{
  "data": [
    {
      "parMoneda": "USD_PEN",
      "monedaOrigen": "USD",
      "monedaDestino": "PEN",
      "fuente": "DATATEC",
      "fuenteCompra": "TIPO CAMBIO DATATEC COMPRA",
      "valorCompra": 3.368,
      "fuenteVenta": "TIPO CAMBIO DATATEC VENTA",
      "valorVenta": 3.370,
      "ultimaActualizacion": "2026-02-05T08:00:00Z",
      "estadoVentana": "CERRADO",
      "esEdicionManual": false,
      "updatedAt": "...",
      "updatedBy": "SISTEMA"
    }
  ],
  "total": 1
}
```

### REQ-001-2: No expone campos internos
Response NO debe contener: `pk`, `sk`, `tipo`

### REQ-001-3: Error 500 ante falla DynamoDB
HTTP 500 `{ "codigo": "FX-TC-500" }`

---

## REQ-002: PUT /tipo-cambio/base/{parMoneda}

### REQ-002-1: Actualiza valorCompra y valorVenta
**When** PUT /tipo-cambio/base/USD_PEN body:
```json
{ "valorCompra": 3.370, "valorVenta": 3.375, "motivoEdicion": "Contingencia Datatec" }
```
**Then** HTTP 200 con registro actualizado y `esEdicionManual: true`

### REQ-002-2: Crea registro de auditoría automáticamente
**After** PUT exitoso, debe existir en DynamoDB:
```
PK: TC_BASE#USD_PEN   SK: AUDITORIA#<timestamp>
  valorCompraAnterior: 3.368, valorCompraNuevo: 3.370
  valorVentaAnterior: 3.370,  valorVentaNuevo: 3.375
  esEdicionManual: true
  motivoEdicion: "Contingencia Datatec"
```

### REQ-002-3: 400 valorVenta < valorCompra
`{ valorCompra: 3.375, valorVenta: 3.370 }` →
HTTP 400 `{ "codigo": "FX-TC-002", "mensaje": "Valor venta debe ser >= valor compra" }`

### REQ-002-4: 400 valorCompra negativo o cero
HTTP 400 `{ "codigo": "FX-TC-002" }`

### REQ-002-5: 400 motivoEdicion vacío o ausente
HTTP 400 `{ "codigo": "FX-TC-002" }`

### REQ-002-6: 404 parMoneda no existe
HTTP 404 `{ "codigo": "FX-TC-003", "mensaje": "TC Base USD_PEN no encontrado" }`

### REQ-002-7: 400 parMoneda inválido en path
`parMoneda` no es USD_PEN ni EUR_PEN →
HTTP 400 `{ "codigo": "FX-TC-001", "mensaje": "parMoneda inválido" }`

### REQ-002-8: 500 ante falla DynamoDB
HTTP 500 `{ "codigo": "FX-TC-500" }`

---

## REQ-003: GET /tipo-cambio/base/{parMoneda}/auditoria

### REQ-003-1: Retorna historial ordenado desc (más reciente primero)
**When** GET /tipo-cambio/base/USD_PEN/auditoria
**Then** HTTP 200:
```json
{
  "parMoneda": "USD_PEN",
  "data": [
    {
      "timestamp": "2026-06-03T10:00:00Z",
      "valorCompraAnterior": 3.368,
      "valorCompraNuevo": 3.370,
      "valorVentaAnterior": 3.370,
      "valorVentaNuevo": 3.375,
      "esEdicionManual": true,
      "motivoEdicion": "Contingencia Datatec",
      "updatedBy": "ANA.TORRES"
    }
  ],
  "total": 1
}
```

### REQ-003-2: Lista vacía si no hay auditorías
HTTP 200 `{ "parMoneda": "USD_PEN", "data": [], "total": 0 }`

### REQ-003-3: 400 parMoneda inválido
HTTP 400 `{ "codigo": "FX-TC-001" }`

### REQ-003-4: 500 ante falla DynamoDB
HTTP 500 `{ "codigo": "FX-TC-500" }`

---

## REQ-004: GET /tipo-cambio/ventanilla/{parMoneda}

### REQ-004-1: Retorna los 4 segmentos del par
**When** GET /tipo-cambio/ventanilla/USD_PEN
**Then** HTTP 200:
```json
{
  "parMoneda": "USD_PEN",
  "data": [
    {
      "segmento": "EMPLEADO",
      "tcBaseCompraRef": 3.368,
      "tcBaseVentaRef": 3.370,
      "spreadCompraPips": -5,
      "spreadVentaPips": 5,
      "valorCompra": 3.363,
      "valorVenta": 3.375,
      "enviadoAt": "...",
      "enviadoBy": "ANA.TORRES"
    }
  ],
  "total": 4
}
```

### REQ-004-2: 400 parMoneda inválido
HTTP 400 `{ "codigo": "FX-TC-001" }`

### REQ-004-3: Lista vacía si no hay ventanilla
HTTP 200 `{ "parMoneda": "USD_PEN", "data": [], "total": 0 }`

### REQ-004-4: 500 ante falla DynamoDB
HTTP 500 `{ "codigo": "FX-TC-500" }`

---

## REQ-005: POST /tipo-cambio/ventanilla/{parMoneda}

### REQ-005-1: Envía TC Ventanilla para los 4 segmentos
**When** POST /tipo-cambio/ventanilla/USD_PEN body:
```json
{
  "segmentos": [
    { "segmento": "EMPLEADO",    "spreadCompraPips": -5,   "spreadVentaPips": 5   },
    { "segmento": "PREMIUM",     "spreadCompraPips": -55,  "spreadVentaPips": 55  },
    { "segmento": "PREFERENCIAL","spreadCompraPips": -180, "spreadVentaPips": 180 },
    { "segmento": "PIZARRA",     "spreadCompraPips": -220, "spreadVentaPips": 220 }
  ]
}
```
**Then** HTTP 201 con los 4 registros guardados

### REQ-005-2: valorCompra y valorVenta se calculan automáticamente
```
valorCompra = tcBaseCompra + (spreadCompraPips / 10000)
valorVenta  = tcBaseVenta  + (spreadVentaPips  / 10000)
```
Ejemplo: tcBase=3.368, spreadCompra=-5 → valorCompra = 3.368 + (-5/10000) = 3.3675

### REQ-005-3: tcBaseCompraRef y tcBaseVentaRef vienen del TC Base activo
Al guardar se registran los valores del TC Base en ese momento

### REQ-005-4: 400 si no se envían exactamente 4 segmentos
HTTP 400 `{ "codigo": "FX-TC-004", "mensaje": "Deben enviarse exactamente 4 segmentos" }`

### REQ-005-5: 400 si falta algún segmento (EMPLEADO, PREMIUM, PREFERENCIAL, PIZARRA)
HTTP 400 `{ "codigo": "FX-TC-004" }`

### REQ-005-6: 400 parMoneda inválido
HTTP 400 `{ "codigo": "FX-TC-001" }`

### REQ-005-7: 404 si no existe TC Base activo para el par
HTTP 404 `{ "codigo": "FX-TC-003", "mensaje": "TC Base USD_PEN no encontrado" }`

### REQ-005-8: 400 spreadCompraPips no es entero
HTTP 400 `{ "codigo": "FX-TC-004" }`

### REQ-005-9: 500 ante falla DynamoDB
HTTP 500 `{ "codigo": "FX-TC-500" }`

---

## REQ-006: Headers siempre presentes
- `Content-Type: application/json`
- `Access-Control-Allow-Origin: *`

---

## REQ-007: Acceso DynamoDB
- GET base: ScanCommand FilterExpression tipo=TC_BASE + SK=ACTIVO → filter en memoria
- PUT base: GetCommand SK=ACTIVO → UpdateCommand SK=ACTIVO + PutCommand SK=AUDITORIA#timestamp
- GET auditoria: QueryCommand PK=TC_BASE#par begins_with(SK, AUDITORIA#) → sort DESC
- GET ventanilla: QueryCommand PK=TC_VENTANILLA#par begins_with(SK, SEGMENTO#)
- POST ventanilla: GetCommand TC_BASE activo → BatchWriteCommand 4 items ventanilla
