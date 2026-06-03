# Steering — BIF FX Plataforma Tipo de Cambio

## Contexto del proyecto
Sistema de tipo de cambio FX para BanBif.
Single Table Design en DynamoDB. Node.js 20 + TypeScript. AWS Lambda + Fargate.

## Convenciones de código
- TypeScript strict mode siempre
- Nombres en camelCase para variables y funciones
- Nombres en PascalCase para interfaces y tipos
- Prefijo `bif-fx-` para todos los servicios
- Errores con formato `{ codigo: "FX-XXX-000", mensaje: "...", timestamp: ISO }`

## DynamoDB — reglas importantes
- Tabla única: `tablero-dev` (dev), `tablero-qa` (qa), `tablero-prod` (prod)
- PK siempre en formato `ENTIDAD#<id>` en MAYÚSCULAS
- SK siempre `METADATA` para registros principales
- Campo `tipo` siempre presente para facilitar Scan con FilterExpression
- Auditoría siempre con `updatedAt` (ISO string) y `updatedBy` (username)
- Números almacenados como Number en DynamoDB (tipo N), nunca como String
- Booleanos como Boolean (tipo BOOL), nunca como "true"/"false" String

## Patrón de keys por entidad
Ver design.md para la tabla completa de PK/SK por entidad.

## Seeds
- Archivos numerados del 01 al 16 en orden de dependencia
- Formato batch-write compatible con AWS CLI y SDK
- TableName: `tablero-dev` en todos los seeds
