# Requirements — DynamoDB Local Setup: Tabla `tablero`

## Overview
Crear y poblar la tabla DynamoDB `tablero` en DynamoDB Local para el proyecto
BIF FX Plataforma Tipo de Cambio. La tabla usa Single Table Design con
múltiples entidades y GSIs.

---

## Requirements

### REQ-001: Crear tabla `tablero` con GSIs
**Given** que DynamoDB Local está corriendo en `http://localhost:8000`
**When** se ejecuta el setup
**Then** debe existir la tabla `tablero` con:
- PK (HASH): String
- SK (RANGE): String
- GSI1: `GSI1-estado-fecha` (GSI1PK HASH, GSI1SK RANGE)
- GSI2: `GSI2-cliente` (GSI2PK HASH, GSI2SK RANGE)
- GSI3: `GSI3-perfil-pantalla` (GSI3PK HASH, GSI3SK RANGE)
- BillingMode: PAY_PER_REQUEST

---

### REQ-002: Entidad VOLATILIDAD
**Given** que la tabla existe
**When** se cargan los datos seed
**Then** deben existir exactamente 2 registros de volatilidad:

```
PK: VOLATILIDAD#001 | SK: METADATA
  tipo: VOLATILIDAD
  id: "001"
  nombre: "Volatilidad Activa"
  pips: 100
  estadoActual: false
  updatedAt: "2026-05-25T08:30:00Z"
  updatedBy: "ROBERT.GARCIA"

PK: VOLATILIDAD#002 | SK: METADATA
  tipo: VOLATILIDAD
  id: "002"
  nombre: "Volatilidad Inactiva"
  pips: 200
  estadoActual: true
  updatedAt: "2026-05-25T08:30:00Z"
  updatedBy: "ROBERT.GARCIA"
```

---

### REQ-003: Entidad HORARIO_MERCADO
**Then** deben existir exactamente 2 registros de horario:

```
PK: HORARIO#001 | SK: METADATA
  tipo: HORARIO
  id: "001"
  nombre: "Horario de mercado abierto"
  horaApertura: "09:00"
  horaCierre: "15:00"
  pips: 120

PK: HORARIO#002 | SK: METADATA
  tipo: HORARIO
  id: "002"
  nombre: "Horario de mercado cerrado"
  horaApertura: "15:01"
  horaCierre: "08:59"
  pips: 150
```

---

### REQ-004: Entidad FERIADO
**Then** deben existir feriados del año 2026:

```
PK: FERIADO#2026 | SK: FECHA#2026-01-01
  tipo: FERIADO
  anio: 2026
  fecha: "2026-01-01"
  descripcion: "Año Nuevo"

PK: FERIADO#2026 | SK: FECHA#2026-04-02
  descripcion: "Jueves Santo"

PK: FERIADO#2026 | SK: FECHA#2026-04-03
  descripcion: "Viernes Santo"

PK: FERIADO#2026 | SK: FECHA#2026-05-01
  descripcion: "Día del Trabajo"

PK: FERIADO#2026 | SK: FECHA#2026-06-29
  descripcion: "San Pedro y San Pablo"

PK: FERIADO#2026 | SK: FECHA#2026-07-28
  descripcion: "Fiestas Patrias"

PK: FERIADO#2026 | SK: FECHA#2026-07-29
  descripcion: "Fiestas Patrias"

PK: FERIADO#2026 | SK: FECHA#2026-08-30
  descripcion: "Santa Rosa de Lima"

PK: FERIADO#2026 | SK: FECHA#2026-10-08
  descripcion: "Combate de Angamos"

PK: FERIADO#2026 | SK: FECHA#2026-11-01
  descripcion: "Todos los Santos"

PK: FERIADO#2026 | SK: FECHA#2026-12-08
  descripcion: "Inmaculada Concepción"

PK: FERIADO#2026 | SK: FECHA#2026-12-25
  descripcion: "Navidad"
```

---

### REQ-005: Entidad RANGO_PN (Persona Natural)
**Then** deben existir 6 rangos para Persona Natural ordenados por importe:

```
PK: RANGO_PN#001 | SK: METADATA
  importeMinimo: 0.00    | importeMaximo: 500.00    | pips: 100

PK: RANGO_PN#002 | SK: METADATA
  importeMinimo: 500.00  | importeMaximo: 1500.00   | pips: 80

PK: RANGO_PN#003 | SK: METADATA
  importeMinimo: 1500.00 | importeMaximo: 10000.00  | pips: 50

PK: RANGO_PN#004 | SK: METADATA
  importeMinimo: 10000.00| importeMaximo: 25000.00  | pips: 35

PK: RANGO_PN#005 | SK: METADATA
  importeMinimo: 25000.00| importeMaximo: 40000.00  | pips: 25

PK: RANGO_PN#006 | SK: METADATA
  importeMinimo: 40000.00| importeMaximo: 50000.00  | pips: 15
```

---

### REQ-006: Entidad RANGO_PJ (Persona Jurídica)
**Then** deben existir 4 rangos para Persona Jurídica:

```
PK: RANGO_PJ#001 | SK: METADATA
  importeMinimo: 0.00     | importeMaximo: 1000.00   | pips: 100

PK: RANGO_PJ#002 | SK: METADATA
  importeMinimo: 1000.00  | importeMaximo: 10000.00  | pips: 80

PK: RANGO_PJ#003 | SK: METADATA
  importeMinimo: 10000.00 | importeMaximo: 90000.00  | pips: 60

PK: RANGO_PJ#004 | SK: METADATA
  importeMinimo: 90000.00 | importeMaximo: 100000.00 | pips: 40
```

---

### REQ-007: Entidad SEGMENTO
**Then** deben existir 8 segmentos de banca:

```
PK: SEGMENTO#0001 | SK: METADATA
  codigoBanca: "0001" | descripcionBanca: "DIVISION DE NEGOCIOS"    | pips: 100

PK: SEGMENTO#0002 | SK: METADATA
  codigoBanca: "0002" | descripcionBanca: "BANCA PREMIUM"           | pips: 150

PK: SEGMENTO#0003 | SK: METADATA
  codigoBanca: "0003" | descripcionBanca: "RECURSOS HUMANOS"        | pips: 200

PK: SEGMENTO#0004 | SK: METADATA
  codigoBanca: "0004" | descripcionBanca: "BANCA CORPORATIVA"       | pips: 300

PK: SEGMENTO#0005 | SK: METADATA
  codigoBanca: "0005" | descripcionBanca: "BANCA COMERCIAL ZONA 1"  | pips: 200

PK: SEGMENTO#0006 | SK: METADATA
  codigoBanca: "0006" | descripcionBanca: "BANCA COMERCIAL ZONA 2"  | pips: 131

PK: SEGMENTO#0007 | SK: METADATA
  codigoBanca: "0007" | descripcionBanca: "TESORERIA"               | pips: 150

PK: SEGMENTO#0008 | SK: METADATA
  codigoBanca: "0008" | descripcionBanca: "NORMALIZACION"           | pips: 200
```
Todos deben tener: `origen: "MANUAL"`, `GSI2PK: "SEGMENTO"`, `GSI2SK: descripcionBanca`

---

### REQ-008: Entidad SPREAD_LIQUIDEZ
**Then** deben existir 4 registros de spread de liquidez:

```
PK: SPREAD_LIQUIDEZ#HORARIO_MERCADO_ABIERTO  | SK: SENTIDO#BANCO_COMPRA_DOLARES | pips: 50
PK: SPREAD_LIQUIDEZ#HORARIO_MERCADO_ABIERTO  | SK: SENTIDO#BANCO_VENDE_DOLARES  | pips: 25
PK: SPREAD_LIQUIDEZ#HORARIO_MERCADO_CERRADO  | SK: SENTIDO#BANCO_COMPRA_DOLARES | pips: 0
PK: SPREAD_LIQUIDEZ#HORARIO_MERCADO_CERRADO  | SK: SENTIDO#BANCO_VENDE_DOLARES  | pips: -15
```
Nota: pips puede ser negativo.

---

### REQ-009: Entidad SPREAD_CLIENTE
**Then** deben existir 6 clientes con spread personalizado:

```
PK: SPREAD_CLIENTE#437     | codigoIbs: "437"     | razonSocial: "ALICO"
  tipoPersoneria: "Persona Juridica" | tipoDocumento: "RUC"
  nroDocumento: "20100055237" | codigoBanca: "0004"
  descripcionBanca: "BANCA CORPORATIVA GRUPO 1" | spreadPips: 150
  flagMotor: "ACTIVO"
  GSI2PK: "SPREAD_CLIENTE" | GSI2SK: "437"

PK: SPREAD_CLIENTE#52291   | codigoIbs: "52291"   | razonSocial: "GRUPO"
  nroDocumento: "20379806768" | spreadPips: 20 | flagMotor: "INACTIVO"

PK: SPREAD_CLIENTE#958362  | codigoIbs: "958362"  | razonSocial: "ESTUD"
  nroDocumento: "20278437354" | codigoBanca: "0006"
  descripcionBanca: "BANCA COMERCIAL ZONA 6" | spreadPips: 10 | flagMotor: "ACTIVO"

PK: SPREAD_CLIENTE#2461987 | codigoIbs: "2461987"
  tipoPersoneria: "Persona Natural" | tipoDocumento: "DNI"
  nroDocumento: "07813699" | apellidoPaterno: "PUG CAS"
  codigoBanca: "0002" | spreadPips: 150 | flagMotor: "INACTIVO"

PK: SPREAD_CLIENTE#2457245 | codigoIbs: "2457245"
  tipoPersoneria: "Persona Natural" | nroDocumento: "10005188"
  apellidoPaterno: "ALCALDE" | apellidoMaterno: "UREÑA" | nombres: "MIKA"
  codigoBanca: "0002" | spreadPips: 150 | flagMotor: "ACTIVO"

PK: SPREAD_CLIENTE#2432592 | codigoIbs: "2432592"
  nroDocumento: "07585436"
  apellidoPaterno: "ALC VEL" | apellidoMaterno: "OSC" | nombres: "MAN"
  codigoBanca: "0002" | spreadPips: 150 | flagMotor: "ACTIVO"
```

---

### REQ-010: Entidad TC_BASE
**Then** deben existir 2 registros de TC Base activo (USD/PEN y EUR/PEN)
y sus respectivos registros de auditoría:

```
PK: TC_BASE#USD_PEN | SK: ACTIVO
  parMoneda: "USD/PEN" | monedaOrigen: "USD" | monedaDestino: "PEN"
  fuente: "DATATEC"
  fuenteCompra: "TIPO CAMBIO DATATEC COMPRA" | valorCompra: 3.368000
  fuenteVenta: "TIPO CAMBIO DATATEC VENTA"   | valorVenta: 3.370000
  ultimaActualizacion: "2026-02-05T08:00:00Z"
  estadoVentana: "CERRADO" | esEdicionManual: false

PK: TC_BASE#USD_PEN | SK: AUDITORIA#2026-02-05T08:00:00Z
  tipo: "TC_BASE_AUDITORIA"
  valorCompraAnterior: 3.360000 | valorCompraNuevo: 3.368000
  valorVentaAnterior: 3.362000  | valorVentaNuevo: 3.370000
  esEdicionManual: false | updatedBy: "SISTEMA"

PK: TC_BASE#EUR_PEN | SK: ACTIVO
  parMoneda: "EUR/PEN" | fuente: "BLOOMBERG"
  valorCompra: 3.600000 | valorVenta: 3.650000
  estadoVentana: "CERRADO" | esEdicionManual: false
```

---

### REQ-011: Entidad TC_VENTANILLA
**Then** deben existir 4 registros de TC Ventanilla para USD/PEN
(uno por segmento):

```
PK: TC_VENTANILLA#USD_PEN | SK: SEGMENTO#EMPLEADO
  segmento: "EMPLEADO"
  tcBaseCompraRef: 3.368000 | tcBaseVentaRef: 3.370000
  spreadCompraPips: -5 | spreadVentaPips: 5
  valorCompra: 3.363000 | valorVenta: 3.375000

PK: TC_VENTANILLA#USD_PEN | SK: SEGMENTO#PREMIUM
  spreadCompraPips: -55 | spreadVentaPips: 55
  valorCompra: 3.313000 | valorVenta: 3.425000

PK: TC_VENTANILLA#USD_PEN | SK: SEGMENTO#PREFERENCIAL
  spreadCompraPips: -180 | spreadVentaPips: 180
  valorCompra: 3.188000 | valorVenta: 3.550000

PK: TC_VENTANILLA#USD_PEN | SK: SEGMENTO#PIZARRA
  spreadCompraPips: -220 | spreadVentaPips: 220
  valorCompra: 3.148000 | valorVenta: 3.590000
```

---

### REQ-012: Entidad COTIZACION
**Then** deben existir 2 cotizaciones de ejemplo con estados distintos:

```
PK: COTIZACION#uuid-001 | SK: METADATA
  estado: "TRANSFERIDA"
  clienteId: "2969845" | parMoneda: "USD/PEN" | sentido: "VENTA"
  monto: 5.62 | tcAplicado: 3.5600 | montoCalculado: 20.01
  fechaCotizacion: "2026-05-25T10:00:00Z"
  fechaExpiracion: "2026-05-25T10:05:00Z"
  GSI1PK: "TRANSFERIDA" | GSI1SK: "2026-05-25T10:05:00Z"
  GSI2PK: "CLIENTE#2969845" | GSI2SK: "2026-05-25T10:00:00Z"

PK: COTIZACION#uuid-002 | SK: METADATA
  estado: "COTIZADA"
  clienteId: "2507873" | parMoneda: "USD/PEN" | sentido: "VENTA"
  monto: 2.81 | tcAplicado: 3.5650 | montoCalculado: 10.02
  fechaCotizacion: "2026-05-25T10:10:00Z"
  fechaExpiracion: "2026-05-25T10:15:00Z"
  GSI1PK: "COTIZADA" | GSI1SK: "2026-05-25T10:15:00Z"
  GSI2PK: "CLIENTE#2507873" | GSI2SK: "2026-05-25T10:10:00Z"
```

---

### REQ-013: Entidad PARAMETRO_SISTEMA
**Then** deben existir 9 parámetros del sistema en 4 grupos:

```
PK: PARAMETRO#CONTINGENCIA_DATATEC | SK: PARAM#ACTIVAR_CONTINGENCIA
  grupo: "Contingencia Datatec"
  nombre: "Activar contingencia (1:activo, 0:inactivo)"
  valor: "0" | tipoValor: "INTEGER"

PK: PARAMETRO#CONTINGENCIA_DATATEC | SK: PARAM#TC_BANCO_COMPRA
  nombre: "Tipo cambio Banco Compra" | valor: "3.72" | tipoValor: "DECIMAL"

PK: PARAMETRO#CONTINGENCIA_DATATEC | SK: PARAM#TC_BANCO_VENTA
  nombre: "Tipo cambio Banco Venta"  | valor: "3.73" | tipoValor: "DECIMAL"

PK: PARAMETRO#PLATAFORMA_FX_PJ | SK: PARAM#IMPORTE_MAXIMO_USD
  nombre: "Importe maximo permitido en dolares (USD)"
  valor: "500000.00" | tipoValor: "DECIMAL"

PK: PARAMETRO#PLATAFORMA_FX_PJ | SK: PARAM#TIEMPO_MAXIMO_CONTADOR
  nombre: "Tiempo maximo contador (MM:SS)" | valor: "05:00" | tipoValor: "TIME"

PK: PARAMETRO#PLATAFORMA_FX_PN | SK: PARAM#IMPORTE_MAXIMO_USD
  valor: "25000.00" | tipoValor: "DECIMAL"

PK: PARAMETRO#PLATAFORMA_FX_PN | SK: PARAM#TIEMPO_MAXIMO_CONTADOR
  valor: "05:00" | tipoValor: "TIME"

PK: PARAMETRO#PLATAFORMA_FX | SK: PARAM#BUZON_CORREOS
  nombre: "Buzon de correos (separado por punto y coma)"
  valor: "dcorro@banbif.com.pe;erlosa@banbif.com.pe" | tipoValor: "STRING"

PK: PARAMETRO#PLATAFORMA_FX | SK: PARAM#TIEMPO_LIMITE_BANNER
  nombre: "Tiempo limite de contador para mostrar banner (MM:SS)"
  valor: "00:30" | tipoValor: "TIME"
```

---

### REQ-014: Entidad PERFIL
**Then** deben existir 3 perfiles:

```
PK: PERFIL#ADMINISTRADOR | SK: METADATA
  nombre: "Administrador"
  descripcion: "Acceso total al sistema"
  estado: "ACTIVO"

PK: PERFIL#OPERATIVO | SK: METADATA
  nombre: "Operativo"
  descripcion: "Puede cotizar, transferir y gestionar clientes"
  estado: "ACTIVO"

PK: PERFIL#CONSULTOR | SK: METADATA
  nombre: "Consultor"
  descripcion: "Solo lectura: puede consultar cotizaciones y reportes"
  estado: "ACTIVO"
```

---

### REQ-015: Entidad PANTALLA
**Then** deben existir 11 pantallas (9 WEB + 2 APP):

```
WEB:
PANTALLA#GESTION_PARAMETROS       | ruta: /GestionParametros/Index
PANTALLA#VARIABLE_VOLATILIDAD     | ruta: /VariableVolatilidad/Index
PANTALLA#VARIABLE_HORARIO_MERCADO | ruta: /VariableHorarioMercado/Index
PANTALLA#VARIABLE_RANGO_IMPORTE   | ruta: /VariableRangoImporte/Index
PANTALLA#VARIABLE_SEGMENTO        | ruta: /VariableSegmento/Index
PANTALLA#VARIABLE_SPREAD_LIQUIDEZ | ruta: /VariableSpreadLiquidez/Index
PANTALLA#BASE_SPREAD_CLIENTES     | ruta: /GestionClientes/Index
PANTALLA#GESTION_TC               | ruta: /GestionTipoCambio/Index
PANTALLA#REPORTE_OPERACIONES      | ruta: /Reporte/Index

APP:
PANTALLA#APP_COTIZACION    | ruta: /cotizacion
PANTALLA#APP_TRANSFERENCIA | ruta: /transferencia
```

---

### REQ-016: Entidad PERFIL_ACCESO
**Then** deben existir registros de acceso por perfil usando
`PK: PERFIL#<perfil> | SK: PANTALLA#<pantalla>` con los campos:
`puedeVer`, `puedeCrear`, `puedeEditar`, `puedeEliminar`

Matriz de accesos:
```
ADMINISTRADOR → todas las pantallas: CRUD completo (todos true)

OPERATIVO:
  BASE_SPREAD_CLIENTES  → ver:true  crear:true  editar:true  eliminar:false
  GESTION_TC            → ver:true  crear:false editar:true  eliminar:false
  REPORTE_OPERACIONES   → ver:true  crear:false editar:false eliminar:false
  APP_COTIZACION        → ver:true  crear:true  editar:false eliminar:false
  APP_TRANSFERENCIA     → ver:true  crear:true  editar:false eliminar:false

CONSULTOR:
  GESTION_TC            → ver:true  crear:false editar:false eliminar:false
  REPORTE_OPERACIONES   → ver:true  crear:false editar:false eliminar:false
  APP_COTIZACION        → ver:true  crear:false editar:false eliminar:false
```
Todos los registros deben tener `GSI3PK: "PERFIL#<perfilId>"`, `GSI3SK: "PANTALLA#<pantallaId>"`

---

### REQ-017: Entidad USUARIO
**Then** deben existir 3 usuarios de ejemplo:

```
PK: USUARIO#USR001 | SK: METADATA
  usuarioId: "USR001" | username: "ROBERT.GARCIA"
  nombre: "Robert" | apellido: "Garcia"
  email: "rgarcia@banbif.com.pe"
  perfilId: "ADMINISTRADOR" | estado: "ACTIVO"
  GSI3PK: "PERFIL#ADMINISTRADOR" | GSI3SK: "USUARIO#USR001"

PK: USUARIO#USR002 | SK: METADATA
  username: "ANA.TORRES" | perfilId: "OPERATIVO"
  email: "atorres@banbif.com.pe" | estado: "ACTIVO"

PK: USUARIO#USR003 | SK: METADATA
  username: "LUIS.MENDOZA" | perfilId: "CONSULTOR"
  email: "lmendoza@banbif.com.pe" | estado: "ACTIVO"
```

---

### REQ-018: Script de verificación
**When** se ejecuta la verificación
**Then** debe confirmar:
- Tabla `tablero` existe
- Cantidad de items por tipo (VOLATILIDAD:2, HORARIO:2, RANGO_PN:6, etc.)
- Los 3 GSIs están activos
- Imprimir resumen por consola

---

### REQ-019: Script de reset
**When** se ejecuta el reset
**Then** debe:
- Eliminar la tabla `tablero`
- Recrearla desde cero
- Cargar todos los seeds
- Útil para desarrollo y testing
