# Implementation Plan: Variable Volatilidad GET + PUT

## Overview
Implementar los endpoints GET /parametros/volatilidad y PUT /parametros/volatilidad/{id} con DynamoDB, validaciones Zod y tests unitarios completos.

## Task Dependency Graph
```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2"] },
    { "wave": 3, "tasks": ["3", "4", "5"] },
    { "wave": 4, "tasks": ["6"] },
    { "wave": 5, "tasks": ["7"] },
    { "wave": 6, "tasks": ["8", "9"] },
    { "wave": 7, "tasks": ["10"] },
    { "wave": 8, "tasks": ["11"] }
  ]
}
```

## Tasks

- [x] 1. Crear src/models/volatilidad.model.ts con interfaces Volatilidad, VolatilidadUpdateRequest y VolatilidadResponse
- [x] 2. Crear src/validators/schemas.ts con VolatilidadUpdateSchema (pips: int >= 0, estadoActual: boolean)
- [x] 3. Crear src/utils/response.util.ts con helpers ok, created, noContent, badRequest, notFound, conflict, serverError usando codigos FX-MNT-*
- [x] 4. Crear src/utils/audit.util.ts con funciones auditoria y getUsuario que extrae username del authorizer o retorna SISTEMA
- [x] 5. Crear src/repositories/dynamodb.client.ts con DynamoDBDocumentClient configurado para local y producción, exportando dynamo y TABLE
- [x] 6. Crear src/repositories/volatilidad.repository.ts con VolatilidadRepository que implementa listarTodos (ScanCommand con FilterExpression tipo=VOLATILIDAD), obtenerPorId (GetCommand PK=VOLATILIDAD#{id} SK=METADATA) y actualizar (GetCommand + UpdateCommand solo pips/estadoActual/updatedAt/updatedBy)
- [x] 7. Crear src/handlers/volatilidad.handler.ts con exports listar y actualizar, validando id en path (FX-MNT-001), schema Zod (FX-MNT-002), 404 (FX-MNT-003) y 500 (FX-MNT-500)
- [x] 8. Crear tests/unit/volatilidad.validator.test.ts con tests para VolatilidadUpdateSchema: casos válidos, pips negativo/decimal/string/ausente, estadoActual string/número/ausente, body vacío y null
- [x] 9. Crear tests/unit/volatilidad.repository.test.ts mockeando dynamodb.client, probando listarTodos (lista, vacío, undefined, FilterExpression), obtenerPorId (existe, null, PK format) y actualizar (null si no existe, UpdateExpression correcta, updatedBy, retorna nuevos valores, updatedAt ISO)
- [x] 10. Crear tests/unit/volatilidad.handler.test.ts mockeando el repositorio, probando listar (200 con data/total, 200 vacío, 500, headers CORS) y actualizar (200, 400 FX-MNT-001/002/003, 404 FX-MNT-003, 500 FX-MNT-500, updatedBy SISTEMA y desde authorizer)
- [x] 11. Actualizar serverless.yml agregando funciones listarVolatilidad (GET /parametros/volatilidad) y actualizarVolatilidad (PUT /parametros/volatilidad/{id}) con cors: true, y ejecutar npx tsc --noEmit y npx jest tests/unit/volatilidad para verificar que todo pasa

## Notes
- La tabla DynamoDB usa PK/SK en mayúsculas: PK=VOLATILIDAD#{id}, SK=METADATA
- El campo tipo="VOLATILIDAD" se usa en el ScanCommand FilterExpression
- nombre, pk, sk, tipo e id nunca deben aparecer en el response ni modificarse con el PUT
- updatedBy viene del authorizer.username o es "SISTEMA" si no hay authorizer
- Variables de entorno: DYNAMO_TABLE=tablero-dev, STAGE=dev, DYNAMO_ENDPOINT=http://localhost:8000
