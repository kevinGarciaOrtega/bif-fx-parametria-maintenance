# Implementation Plan: Horario de Mercado + Feriados

## Overview
Implementar los endpoints de Horario de Mercado (GET list + PUT update) y Feriados (GET list por año + POST crear + DELETE eliminar) usando Single Table Design con la tabla tablero-dev.

## Task Dependency Graph
```json
{
  "waves": [
    { "wave": 1, "tasks": ["1", "2"] },
    { "wave": 2, "tasks": ["3", "4", "5"] },
    { "wave": 3, "tasks": ["6", "7"] },
    { "wave": 4, "tasks": ["8", "9", "10", "11"] },
    { "wave": 5, "tasks": ["12", "13", "14"] }
  ]
}
```

## Tasks

- [x] 1. Crear src/models/horarioMercado.model.ts con interfaces HorarioMercado, HorarioMercadoUpdateRequest y HorarioMercadoResponse
- [x] 2. Crear src/models/feriado.model.ts con interfaces Feriado, FeriadoCreateRequest y FeriadoResponse
- [x] 3. Agregar a src/validators/schemas.ts los schemas HorarioMercadoUpdateSchema (pips int >= 0, horaApertura HH:MM, horaCierre HH:MM) y FeriadoCreateSchema (fecha YYYY-MM-DD, descripcion opcional)
- [x] 4. Crear src/repositories/horarioMercado.repository.ts con HorarioMercadoRepository que implementa listarTodos (ScanCommand tipo=HORARIO), obtenerPorId (GetCommand PK=HORARIO#{id} SK=METADATA) y actualizar (GetCommand + UpdateCommand solo pips/horaApertura/horaCierre/updatedAt/updatedBy)
- [x] 5. Crear src/repositories/feriado.repository.ts con FeriadoRepository que implementa listarPorAnio (QueryCommand PK=FERIADO#{anio}), existeFeriado (GetCommand), crear (verifica existencia + PutCommand) y eliminar (verifica existencia + DeleteCommand)
- [x] 6. Crear src/handlers/horarioMercado.handler.ts con exports listar y actualizar usando codigos FX-MNT-011/012/013
- [x] 7. Crear src/handlers/feriado.handler.ts con exports listar (query param anio), crear (POST) y eliminar (DELETE /{fecha}) usando codigos FX-MNT-020/021/022/023/024
- [x] 8. Crear tests/unit/horarioMercado.validator.test.ts con tests para HorarioMercadoUpdateSchema: casos válidos, pips negativo/decimal/ausente, horaApertura inválida/ausente, horaCierre inválida/ausente, body vacío
- [x] 9. Crear tests/unit/feriado.validator.test.ts con tests para FeriadoCreateSchema: casos válidos, fecha formato incorrecto, mes inválido, texto libre, ausente, null
- [x] 10. Crear tests/unit/horarioMercado.repository.test.ts mockeando dynamodb.client, probando listarTodos, obtenerPorId y actualizar
- [x] 11. Crear tests/unit/feriado.repository.test.ts mockeando dynamodb.client, probando listarPorAnio, existeFeriado, crear y eliminar
- [x] 12. Crear tests/unit/horarioMercado.handler.test.ts mockeando el repositorio, probando listar (200, 500) y actualizar (200, 400, 404, 500)
- [x] 13. Crear tests/unit/feriado.handler.test.ts mockeando el repositorio, probando listar (200 con anio, 400 sin anio), crear (201, 400, 409) y eliminar (204, 400, 404)
- [x] 14. Verificar serverless.yml: agregar funciones listarHorario (GET /parametros/horario-mercado), actualizarHorario (PUT /parametros/horario-mercado/{id}), listarFeriados (GET /parametros/feriados), crearFeriado (POST /parametros/feriados), eliminarFeriado (DELETE /parametros/feriados/{fecha}) con cors true; crear src/handlers/horarioMercado.ts y src/handlers/feriado.ts como entry points; ejecutar npx tsc --noEmit y npx jest tests/unit

## Notes
- Single Table Design: tabla tablero-dev, PK/SK en MAYÚSCULAS
- Horario: PK=HORARIO#{id}, SK=METADATA, tipo=HORARIO
- Feriado: PK=FERIADO#{anio}, SK=FECHA#{fecha}, tipo=FERIADO
- TABLE viene de DYNAMO_TABLE env var (ya configurado en dynamodb.client.ts)
- Entry points para serverless-offline: src/handlers/horarioMercado.ts y src/handlers/feriado.ts (igual que volatilidad.ts)
- STAGE=dev activa el endpoint local http://localhost:8000
