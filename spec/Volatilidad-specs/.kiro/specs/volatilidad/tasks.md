# Implementation Plan

## Overview

Completar la implementación del módulo Volatilidad (GET list + PUT) y agregar tests unitarios e integración. Los archivos base ya existen; este plan verifica/completa el modelo, validator, repository, handler y crea los tests.

## Tasks

- [x] 1. Completar modelo y validator de Volatilidad
  - Verificar que `src/models/volatilidad.model.ts` tenga las interfaces `Volatilidad`, `VolatilidadUpdateRequest` y `VolatilidadResponse` exactamente como se especifica
  - Actualizar `src/validators/schemas.ts`: el `VolatilidadUpdateSchema` debe incluir mensajes de error explícitos en `pips` (`invalid_type_error: "PIPs debe ser un número"`, `int: "PIPs debe ser un número entero"`, `min: "PIPs debe ser >= 0"`) y en `estadoActual` (`invalid_type_error: "estadoActual debe ser boolean"`, `required_error: "estadoActual es requerido"`)
  - **Acceptance**: `npx tsc --noEmit` sin errores en estos archivos

- [x] 2. Completar VolatilidadRepository
  - Verificar/completar `src/repositories/volatilidad.repository.ts` con los tres métodos: `listarTodos()`, `obtenerPorId(id)`, `actualizar(id, pips, estadoActual, usuario)`
  - `listarTodos()` usa `ScanCommand` con `FilterExpression: "#tipo = :tipo"` y valor `"VOLATILIDAD"`, retorna array vacío si no hay items
  - `obtenerPorId(id)` usa `GetCommand` con Key `{ PK: "VOLATILIDAD#<id>", SK: "METADATA" }`, retorna `null` si no existe
  - `actualizar()` llama primero `obtenerPorId`, si null retorna null; luego `UpdateCommand` con `SET pips, estadoActual, updatedAt, updatedBy` sin tocar `nombre`, `pk`, `sk`, `tipo`, `id`
  - **Acceptance**: `npx tsc --noEmit` sin errores

- [x] 3. Verificar handler de Volatilidad
  - Verificar que `src/handlers/volatilidad.handler.ts` tenga `listar` y `actualizar` exactamente como se especifica en el diseño
  - `listar` retorna `ok({ data, total: data.length })` o `serverError`
  - `actualizar` valida id (FX-MNT-001), valida body Zod (FX-MNT-002), llama repository, retorna 404 (FX-MNT-003) si null o 200 con resultado
  - **Acceptance**: `npx tsc --noEmit` sin errores

- [x] 4. Tests unitarios — Validators
  - Reemplazar `tests/unit/volatilidad.validator.test.ts` con suite completa
  - Casos válidos: pips=0/estadoActual=false, pips=100/true, pips=999/false
  - Validación pips: rechaza negativo (-1) con mensaje "PIPs debe ser >= 0", rechaza decimal (10.5) con mensaje entero, rechaza string ("100") con mensaje tipo, rechaza ausente
  - Validación estadoActual: rechaza string ("true"), rechaza número (1), rechaza ausente
  - Body inválido: rechaza `{}`, rechaza null, campos extra son ignorados
  - **Acceptance**: `npx jest tests/unit/volatilidad.validator` pasa todos los casos

- [x] 5. Tests unitarios — Repository
  - Crear `tests/unit/volatilidad.repository.test.ts`
  - Mock de `../../src/repositories/dynamodb.client` con `{ dynamo: { send: jest.fn() }, TABLE: "tablero-test" }`
  - `listarTodos()`: retorna lista mapeada sin pk/sk/tipo, retorna array vacío cuando no hay items, FilterExpression usa tipo=VOLATILIDAD
  - `obtenerPorId(id)`: retorna VolatilidadResponse cuando existe, retorna null cuando no existe, construye PK como `VOLATILIDAD#<id>`
  - `actualizar()`: retorna null si no existe, llama UpdateCommand con los 4 campos correctos, NO incluye nombre/pk/sk/tipo/id en UpdateExpression, updatedAt es ISO string, updatedBy toma el usuario recibido, retorna objeto actualizado con nuevos valores
  - **Acceptance**: `npx jest tests/unit/volatilidad.repository` pasa todos los casos

- [x] 6. Tests unitarios — Handler
  - Crear `tests/unit/volatilidad.handler.test.ts`
  - Mock de `../../src/repositories/volatilidad.repository`
  - `listar()`: 200 con data y total, 200 con data=[] y total=0, 500 ante error, headers Content-Type y Access-Control-Allow-Origin presentes
  - `actualizar()`: 200 exitoso, 400 FX-MNT-001 sin id, 400 FX-MNT-002 pips negativo/decimal/estadoActual no boolean/body vacío/falta pips/falta estadoActual, 404 FX-MNT-003 id inexistente, 500 FX-MNT-500 ante error, updatedBy="SISTEMA" sin authorizer, updatedBy=username con authorizer
  - **Acceptance**: `npx jest tests/unit/volatilidad.handler` pasa todos los casos

- [x] 7. Tests de integración
  - Crear `tests/integration/volatilidad.integration.test.ts`
  - `describe("@integration Volatilidad endpoints", ...)` — skip automático si DynamoDB Local no está en `http://localhost:8000`
  - `beforeAll`: verificar disponibilidad de DynamoDB Local
  - `beforeEach`: limpiar y reinsertar seed de volatilidad
  - GET `listarTodos()`: retorna 2 registros del seed, items tienen todos los campos requeridos, items NO tienen pk/sk/tipo
  - PUT `actualizar()`: actualiza pips y estadoActual en DynamoDB, nombre no cambia, updatedAt cambia, retorna 404 para id inexistente
  - **Acceptance**: `npx jest tests/integration/volatilidad.integration` pasa (o se skipea si DynamoDB Local no está disponible)

- [x] 8. Verificar serverless.yml
  - Confirmar que `serverless.yml` tiene `listarVolatilidad` (GET `/parametros/volatilidad`) y `actualizarVolatilidad` (PUT `/parametros/volatilidad/{id}`) con `cors: true`
  - Si ya existen con exactamente esos valores, no modificar
  - **Acceptance**: `npx tsc --noEmit` sin errores; las funciones están presentes en el yml

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2"] },
    { "wave": 3, "tasks": ["3"] },
    { "wave": 4, "tasks": ["4", "5", "8"] },
    { "wave": 5, "tasks": ["6"] },
    { "wave": 6, "tasks": ["7"] }
  ]
}
```

## Notes

- Todos los archivos fuente base ya existen; las tasks 1-3 verifican y completan donde sea necesario.
- El `VolatilidadUpdateSchema` actual en `schemas.ts` carece de los mensajes de error explícitos requeridos — task 1 debe actualizarlo.
- El repository actual tiene un bug: `listarTodos()` no maneja el caso de `result.Items` undefined (puede ser `undefined` cuando no hay items). Task 2 debe corregirlo con `(result.Items ?? [])`.
- Los tests de integración requieren DynamoDB Local corriendo en puerto 8000; deben auto-skipear si no está disponible.
- Seed de volatilidad: `dynamo-local/seeds/01-volatilidad.json`.
