# bif-fx-parameterization-maintenance-svc

Lambda Node.js + TypeScript — Servicio de mantenimiento de parametría BIF FX.

## Stack
- **Runtime:** Node.js 20.x
- **Lenguaje:** TypeScript 5.x
- **Framework:** Serverless Framework v3
- **DB:** DynamoDB (AWS SDK v3)
- **Validación:** Zod
- **Testing:** Jest + ts-jest
- **Build:** esbuild

## Estructura
```
src/
├── handlers/       ← entry points Lambda (1 por entidad)
├── services/       ← lógica de negocio
├── repositories/   ← acceso DynamoDB
├── models/         ← interfaces TypeScript
├── validators/     ← schemas Zod
└── utils/          ← response, audit helpers
```

## Instalación
```bash
npm install
```

## Desarrollo local (DynamoDB Local)
```bash
# 1. Levantar DynamoDB local
docker run -p 8000:8000 amazon/dynamodb-local

# 2. Crear tabla
aws dynamodb create-table \
  --cli-input-json file://../../dynamo/crear_tabla_tablero.json \
  --endpoint-url http://localhost:8000

# 3. Cargar seed
aws dynamodb batch-write-item \
  --request-items file://../../dynamo/datos_seed.json \
  --endpoint-url http://localhost:8000

# 4. Levantar servidor local
npm run dev
```

## Testing
```bash
npm test                  # todos los tests
npm run test:unit         # solo unitarios
npm run test:integration  # solo integración
```

## Build
```bash
npm run build
```

## Deploy
```bash
npm run deploy:dev   # ambiente dev
npm run deploy:qa    # ambiente qa
npm run deploy:prod  # producción
```

## Endpoints

| Método | Path | Función |
|--------|------|---------|
| GET | /parametros/volatilidad | Listar volatilidades |
| PUT | /parametros/volatilidad/{id} | Actualizar volatilidad |
| GET | /parametros/horario-mercado | Listar horarios |
| PUT | /parametros/horario-mercado/{id} | Actualizar horario |
| GET | /parametros/feriados?anio=2026 | Listar feriados |
| POST | /parametros/feriados | Crear feriado |
| DELETE | /parametros/feriados/{fecha} | Eliminar feriado |
| GET | /parametros/rango-importe/pn | Listar rangos PN |
| POST | /parametros/rango-importe/pn | Crear rango PN |
| PUT | /parametros/rango-importe/pn/{id} | Actualizar rango PN |
| DELETE | /parametros/rango-importe/pn/{id} | Eliminar rango PN |
| GET | /parametros/rango-importe/pj | Listar rangos PJ |
| POST | /parametros/rango-importe/pj | Crear rango PJ |
| PUT | /parametros/rango-importe/pj/{id} | Actualizar rango PJ |
| DELETE | /parametros/rango-importe/pj/{id} | Eliminar rango PJ |
| GET | /parametros/segmento | Buscar segmentos |
| POST | /parametros/segmento | Crear segmento |
| PUT | /parametros/segmento/{codigoBanca} | Actualizar segmento |
| DELETE | /parametros/segmento/{codigoBanca} | Eliminar segmento |
| GET | /parametros/spread-liquidez | Listar spread liquidez |
| PUT | /parametros/spread-liquidez/{tipo}/{sentido} | Actualizar spread |
| GET | /parametros/spread-cliente | Buscar clientes |
| POST | /parametros/spread-cliente | Crear cliente |
| PUT | /parametros/spread-cliente/{codigoIbs} | Actualizar cliente |
| DELETE | /parametros/spread-cliente/{codigoIbs} | Eliminar cliente |
| GET | /parametros/spread-cliente/buscar-ibs/{ibs} | Buscar en IBS |
| GET | /tipo-cambio/base | Obtener TC Base |
| PUT | /tipo-cambio/base/{parMoneda} | Edición manual TC Base |
| GET | /tipo-cambio/base/{parMoneda}/auditoria | Historial TC Base |
| GET | /tipo-cambio/ventanilla/{parMoneda} | Obtener TC Ventanilla |
| POST | /tipo-cambio/ventanilla/{parMoneda} | Enviar TC Ventanilla |
| GET | /parametros/sistema | Listar parámetros sistema |
| PUT | /parametros/sistema/{grupo}/{clave} | Actualizar parámetro |
| GET | /usuarios | Listar usuarios |
| POST | /usuarios | Crear usuario |
| PUT | /usuarios/{usuarioId} | Actualizar usuario |
| DELETE | /usuarios/{usuarioId} | Desactivar usuario |
| GET | /perfiles | Listar perfiles |
| GET | /perfiles/{perfilId}/accesos | Accesos del perfil |

## Códigos de error

| Código | Descripción |
|--------|-------------|
| FX-MNT-001 | ID requerido |
| FX-MNT-002 | Validación de request fallida |
| FX-MNT-003 | Recurso no encontrado |
| FX-MNT-500 | Error interno del servidor |
