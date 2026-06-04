# bif-fx-parameterization-maintenance-svc

Microservicio Lambda para la gestión de parámetros del motor FX.

## Stack
- **Runtime**: Node.js 20 / TypeScript
- **Framework**: Serverless Framework v3
- **Base de datos**: DynamoDB (AWS)
- **Validación**: Zod
- **Tests**: Jest + ts-jest

## Estructura

```
src/
  handlers/       ← Entry points Lambda
  repositories/   ← Acceso DynamoDB
  models/         ← Interfaces TypeScript
  validators/     ← Schemas Zod
  utils/          ← Helpers compartidos
tests/
  unit/           ← Tests sin DynamoDB
  integration/    ← Tests con DynamoDB Local
dynamo-local/     ← Setup DynamoDB Local (Docker)
```

## Setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno
cp .env.example .env

# 3. Levantar DynamoDB Local
cd dynamo-local && docker-compose up -d

# 4. Crear tablas y cargar seeds
npm run dynamo:setup

# 5. Ejecutar tests
npm test

# 6. Levantar servidor local
npm run dev
```

## Scripts disponibles

| Comando              | Descripción                          |
|----------------------|--------------------------------------|
| `npm test`           | Ejecuta todos los tests              |
| `npm run test:unit`  | Solo tests unitarios                 |
| `npm run test:int`   | Solo tests de integración            |
| `npm run dynamo:setup` | Crea tablas y carga seeds          |
| `npm run dynamo:reset` | Elimina y recrea las tablas        |
| `npm run dev`        | Levanta serverless-offline           |
