# Implementation Plan

## Overview

Set up DynamoDB Local for the BIF FX project by creating a Docker Compose file, table schema, seed data files for all 16 entities, and TypeScript scripts for setup, verification, and reset. All files go under `dynamo-local/` at the project root.

## Tasks

- [x] 1. Create docker-compose.yml for DynamoDB Local
  - Create `dynamo-local/docker-compose.yml` with service `dynamodb-local` using `amazon/dynamodb-local:latest`
  - Port mapping `8000:8000`, container name `bif-fx-dynamodb-local`
  - Flags `-inMemory` and `-sharedDb`
  - Include commented block explaining how to switch to disk persistence
  - References: design.md Docker Compose section

- [x] 2. Create schema/create-table.json
  - Create `dynamo-local/schema/create-table.json` with full table definition
  - TableName: `tablero-dev`, BillingMode: `PAY_PER_REQUEST`
  - AttributeDefinitions: PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK (all String type)
  - KeySchema: PK (HASH), SK (RANGE)
  - Three GSIs: `GSI1-estado-fecha`, `GSI2-cliente`, `GSI3-perfil-pantalla` all with ALL projection
  - References: REQ-001, design.md Schema section

- [x] 3. Create seed files for all entities
  - Create all 16 seed JSON files under `dynamo-local/seeds/` in batch-write format
  - Each file must use DynamoDB native types: `{"S": "value"}`, `{"N": "123"}`, `{"BOOL": true}`
  - TableName key must be `tablero-dev` in every file
  - References: REQ-002 through REQ-017, steering.md DynamoDB rules

  - [x] 3.1. Create seeds/01-volatilidad.json
    - 2 items: VOLATILIDAD#001 and VOLATILIDAD#002 with SK METADATA
    - Fields: tipo, id, nombre, pips (N), estadoActual (BOOL), updatedAt, updatedBy
    - References: REQ-002

  - [x] 3.2. Create seeds/02-horario-mercado.json
    - 2 items: HORARIO#001 and HORARIO#002 with SK METADATA
    - Fields: tipo, id, nombre, horaApertura, horaCierre, pips (N)
    - References: REQ-003

  - [x] 3.3. Create seeds/03-feriados.json
    - 12 feriados 2026 with PK FERIADO#2026 and SK FECHA#<date>
    - Fields: tipo, anio (N), fecha, descripcion
    - References: REQ-004

  - [x] 3.4. Create seeds/04-rango-pn.json
    - 6 items RANGO_PN#001 through RANGO_PN#006 with SK METADATA
    - Fields: tipo, id, importeMinimo (N), importeMaximo (N), pips (N)
    - References: REQ-005

  - [x] 3.5. Create seeds/05-rango-pj.json
    - 4 items RANGO_PJ#001 through RANGO_PJ#004 with SK METADATA
    - Fields: tipo, id, importeMinimo (N), importeMaximo (N), pips (N)
    - References: REQ-006

  - [x] 3.6. Create seeds/06-segmentos.json
    - 8 items SEGMENTO#0001 through SEGMENTO#0008 with SK METADATA
    - Fields: tipo, codigoBanca, descripcionBanca, pips (N), origen, GSI2PK, GSI2SK
    - References: REQ-007

  - [x] 3.7. Create seeds/07-spread-liquidez.json
    - 4 items with PK SPREAD_LIQUIDEZ#<tipoMercado> and SK SENTIDO#<sentido>
    - Fields: tipo, pips (N) — note pips can be 0 or negative
    - References: REQ-008

  - [x] 3.8. Create seeds/08-spread-clientes.json
    - 6 items SPREAD_CLIENTE#<codigoIbs> with SK METADATA
    - Fields: tipo, codigoIbs, razonSocial or apellidos/nombres, tipoPersoneria, tipoDocumento, nroDocumento, codigoBanca, descripcionBanca, spreadPips (N), flagMotor, GSI2PK, GSI2SK
    - References: REQ-009

  - [x] 3.9. Create seeds/09-tc-base.json
    - 3 items: TC_BASE#USD_PEN ACTIVO, TC_BASE#USD_PEN AUDITORIA#<ts>, TC_BASE#EUR_PEN ACTIVO
    - Fields: tipo, parMoneda, monedaOrigen, monedaDestino, fuente, valorCompra (N), valorVenta (N), estadoVentana, esEdicionManual (BOOL), ultimaActualizacion
    - References: REQ-010

  - [x] 3.10. Create seeds/10-tc-ventanilla.json
    - 4 items TC_VENTANILLA#USD_PEN with SK SEGMENTO#<segmento>
    - Fields: tipo, segmento, tcBaseCompraRef (N), tcBaseVentaRef (N), spreadCompraPips (N), spreadVentaPips (N), valorCompra (N), valorVenta (N)
    - References: REQ-011

  - [x] 3.11. Create seeds/11-cotizaciones.json
    - 2 items COTIZACION#uuid-001 and COTIZACION#uuid-002 with SK METADATA
    - Fields: tipo, estado, clienteId, parMoneda, sentido, monto (N), tcAplicado (N), montoCalculado (N), fechaCotizacion, fechaExpiracion, GSI1PK, GSI1SK, GSI2PK, GSI2SK
    - References: REQ-012

  - [x] 3.12. Create seeds/12-parametros-sistema.json
    - 9 items across 4 groups: PARAMETRO#CONTINGENCIA_DATATEC (3), PARAMETRO#PLATAFORMA_FX_PJ (2), PARAMETRO#PLATAFORMA_FX_PN (2), PARAMETRO#PLATAFORMA_FX (2)
    - Fields: tipo, grupo, nombre, valor, tipoValor
    - References: REQ-013

  - [x] 3.13. Create seeds/13-perfiles.json
    - 3 items: PERFIL#ADMINISTRADOR, PERFIL#OPERATIVO, PERFIL#CONSULTOR with SK METADATA
    - Fields: tipo, nombre, descripcion, estado
    - References: REQ-014

  - [x] 3.14. Create seeds/14-pantallas.json
    - 11 items: 9 WEB pantallas + 2 APP pantallas with SK METADATA
    - Fields: tipo, pantallaId, nombre, ruta, plataforma (WEB or APP)
    - References: REQ-015

  - [x] 3.15. Create seeds/15-perfil-accesos.json
    - 19 items total: ADMINISTRADOR (11 all pantallas CRUD=true), OPERATIVO (5 partial), CONSULTOR (3 read-only)
    - PK: PERFIL#<perfil>, SK: PANTALLA#<pantalla>
    - Fields: tipo, puedeVer (BOOL), puedeCrear (BOOL), puedeEditar (BOOL), puedeEliminar (BOOL), GSI3PK, GSI3SK
    - References: REQ-016

  - [x] 3.16. Create seeds/16-usuarios.json
    - 3 items: USUARIO#USR001, USUARIO#USR002, USUARIO#USR003 with SK METADATA
    - Fields: tipo, usuarioId, username, nombre, apellido, email, perfilId, estado, GSI3PK, GSI3SK
    - References: REQ-017

- [x] 4. Create scripts/setup.ts
  - Create `dynamo-local/scripts/setup.ts` in TypeScript
  - Import `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb`
  - Configure DynamoDB client with endpoint `http://localhost:8000`, region `us-east-1`, dummy credentials
  - Implement `checkConnection()` using `ListTablesCommand` with clear error if DynamoDB Local is not running
  - Implement `createTable()` reading `schema/create-table.json` and executing `CreateTableCommand`, polling until ACTIVE
  - Implement `loadSeed(filename)` reading seed JSON and executing `BatchWriteItemCommand`, retrying `UnprocessedItems`
  - Implement `main()` calling checkConnection → createTable → loadSeed for files 01–16 in order → verify
  - Log progress with emoji format as specified in tasks description
  - References: REQ-001 through REQ-017, design.md Scripts section

- [x] 5. Create scripts/verify.ts
  - Create `dynamo-local/scripts/verify.ts` in TypeScript
  - For each entity type run `ScanCommand` with FilterExpression on `tipo` attribute (special handling for PERFIL_ACCESO and FERIADO)
  - Compare obtained count vs expected count per entity
  - Print formatted table with ✅/❌ per row using box-drawing characters
  - Verify all 3 GSIs are ACTIVE using `DescribeTableCommand`
  - Exit with non-zero code if any count mismatches
  - References: REQ-018, design.md verify.ts section

- [x] 6. Create scripts/reset.ts
  - Create `dynamo-local/scripts/reset.ts` in TypeScript
  - Show warning message and wait for ENTER using `readline`
  - Execute `DeleteTableCommand` if table exists, poll until table no longer exists
  - Call `main()` from setup.ts to recreate everything
  - Print `✅ Reset completado` on success
  - References: REQ-019

- [x] 7. Create dynamo-local/package.json
  - Create `dynamo-local/package.json` with name `bif-fx-dynamo-local`
  - Scripts: setup, verify, reset (ts-node), up/down (docker-compose)
  - Dependencies: `@aws-sdk/client-dynamodb@^3.540.0`, `@aws-sdk/lib-dynamodb@^3.540.0`
  - DevDependencies: `ts-node@^10.9.2`, `typescript@^5.4.2`, `@types/node@^20.11.30`

- [x] 8. Create dynamo-local/README.md
  - Create `dynamo-local/README.md` with setup instructions
  - Sections: prerequisites, initial setup steps, verify, reset, stop, Lambda connection env vars
  - References: design.md

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["1", "2", "3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8", "3.9", "3.10", "3.11", "3.12", "3.13", "3.14", "3.15", "3.16"]
    },
    {
      "wave": 2,
      "tasks": ["4"],
      "dependsOn": ["1", "2", "3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8", "3.9", "3.10", "3.11", "3.12", "3.13", "3.14", "3.15", "3.16"]
    },
    {
      "wave": 3,
      "tasks": ["5", "6"],
      "dependsOn": ["4"]
    },
    {
      "wave": 4,
      "tasks": ["7"],
      "dependsOn": ["5", "6"]
    },
    {
      "wave": 5,
      "tasks": ["8"],
      "dependsOn": ["7"]
    }
  ]
}
```

## Notes

- All files are created under `dynamo-local/` relative to the project root (`bif-fx-maintenance/`)
- TableName in all seeds and scripts must be `tablero-dev`
- DynamoDB numbers must use type `N`, booleans must use type `BOOL` — never store as strings
- The `tipo` field must be present on every item to support FilterExpression scans
- Seeds 3.1–3.16 are independent of each other and can be created in parallel
- Tasks 1 and 2 are independent and can be created in parallel
