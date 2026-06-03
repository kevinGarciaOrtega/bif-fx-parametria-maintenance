# Design — DynamoDB Local Setup: Tabla `tablero`

## Arquitectura de la solución

### Tecnologías
- **AWS CLI** para crear tabla y cargar datos
- **Node.js scripts** para setup, verificación y reset
- **Docker** para DynamoDB Local
- **TypeScript** para type safety en scripts

---

## Estructura de archivos a generar

```
dynamo-local/
├── docker-compose.yml          ← DynamoDB Local en Docker
├── scripts/
│   ├── setup.ts                ← crea tabla + carga todos los seeds
│   ├── verify.ts               ← verifica integridad de datos
│   └── reset.ts                ← elimina y recrea todo
├── schema/
│   └── create-table.json       ← DDL de la tabla con GSIs
└── seeds/
    ├── 01-volatilidad.json
    ├── 02-horario-mercado.json
    ├── 03-feriados.json
    ├── 04-rango-pn.json
    ├── 05-rango-pj.json
    ├── 06-segmentos.json
    ├── 07-spread-liquidez.json
    ├── 08-spread-clientes.json
    ├── 09-tc-base.json
    ├── 10-tc-ventanilla.json
    ├── 11-cotizaciones.json
    ├── 12-parametros-sistema.json
    ├── 13-perfiles.json
    ├── 14-pantallas.json
    ├── 15-perfil-accesos.json
    └── 16-usuarios.json
```

---

## Schema de la tabla

### Tabla principal: `tablero`
```
PK (HASH):  String — identificador de entidad
SK (RANGE): String — subtipo o identificador secundario
```

### Convención de claves PK/SK por entidad

| Entidad | PK | SK |
|---------|----|----|
| Volatilidad | `VOLATILIDAD#<id>` | `METADATA` |
| Horario Mercado | `HORARIO#<id>` | `METADATA` |
| Feriado | `FERIADO#<anio>` | `FECHA#<fecha>` |
| Rango PN | `RANGO_PN#<id>` | `METADATA` |
| Rango PJ | `RANGO_PJ#<id>` | `METADATA` |
| Segmento | `SEGMENTO#<codigoBanca>` | `METADATA` |
| Spread Liquidez | `SPREAD_LIQUIDEZ#<tipoMercado>` | `SENTIDO#<sentido>` |
| Spread Cliente | `SPREAD_CLIENTE#<codigoIbs>` | `METADATA` |
| TC Base activo | `TC_BASE#<parMoneda>` | `ACTIVO` |
| TC Base auditoría | `TC_BASE#<parMoneda>` | `AUDITORIA#<timestamp>` |
| TC Ventanilla | `TC_VENTANILLA#<parMoneda>` | `SEGMENTO#<segmento>` |
| Cotización | `COTIZACION#<uuid>` | `METADATA` |
| Parámetro Sistema | `PARAMETRO#<grupo>` | `PARAM#<clave>` |
| Perfil | `PERFIL#<perfilId>` | `METADATA` |
| Pantalla | `PANTALLA#<pantallaId>` | `METADATA` |
| Perfil Acceso | `PERFIL#<perfilId>` | `PANTALLA#<pantallaId>` |
| Usuario | `USUARIO#<usuarioId>` | `METADATA` |

---

## GSIs definidos

### GSI1: `GSI1-estado-fecha`
- **GSI1PK** (HASH): estado de la cotización
- **GSI1SK** (RANGE): fecha_expiracion
- **Uso**: Lambda nocturno busca cotizaciones COTIZADA vencidas
- **Query**: `GSI1PK = "COTIZADA" AND GSI1SK < :ahora`

### GSI2: `GSI2-cliente`
- **GSI2PK** (HASH): tipo de entidad o cliente
- **GSI2SK** (RANGE): identificador secundario
- **Uso**: búsqueda por descripción de segmento, por código IBS
- **Query**: `GSI2PK = "SEGMENTO" AND begins_with(GSI2SK, :desc)`

### GSI3: `GSI3-perfil-pantalla`
- **GSI3PK** (HASH): perfil o usuario
- **GSI3SK** (RANGE): pantalla o usuario
- **Uso**: listar pantallas de un perfil, listar usuarios de un perfil
- **Query**: `GSI3PK = "PERFIL#OPERATIVO" AND begins_with(GSI3SK, "PANTALLA#")`

---

## Docker Compose

```yaml
# docker-compose.yml
services:
  dynamodb-local:
    image: amazon/dynamodb-local:latest
    container_name: bif-fx-dynamodb-local
    ports:
      - "8000:8000"
    command: ["-jar", "DynamoDBLocal.jar", "-sharedDb", "-inMemory"]
    # Para persistencia en disco cambiar -inMemory por:
    # volumes:
    #   - ./data:/home/dynamodblocal/data
    # command: ["-jar", "DynamoDBLocal.jar", "-sharedDb", "-dbPath", "/home/dynamodblocal/data/"]
```

---

## Scripts

### setup.ts
```
1. Verificar que DynamoDB Local responde en http://localhost:8000
2. Verificar si la tabla "tablero" ya existe
   - Si existe: preguntar si desea recrear (o saltar)
3. Crear tabla usando schema/create-table.json
4. Esperar a que la tabla esté ACTIVE
5. Cargar seeds en orden (01 al 16) usando batch-write
6. Ejecutar verify.ts al finalizar
7. Mostrar resumen
```

### verify.ts
```
Consultar DynamoDB y verificar:
- Tabla existe y tiene GSIs activos
- Count por tipo de entidad:
  VOLATILIDAD: 2
  HORARIO: 2
  FERIADO: ≥12 (año 2026)
  RANGO_PN: 6
  RANGO_PJ: 4
  SEGMENTO: 8
  SPREAD_LIQUIDEZ: 4
  SPREAD_CLIENTE: 6
  TC_BASE (ACTIVO): 2
  TC_VENTANILLA: 4
  COTIZACION: 2
  PARAMETRO: 9
  PERFIL: 3
  PANTALLA: 11
  PERFIL_ACCESO: ≥17
  USUARIO: 3
- Imprimir tabla de resultados en consola
```

### reset.ts
```
1. Eliminar tabla "tablero" si existe
2. Esperar confirmación de eliminación
3. Ejecutar setup.ts completo
```

---

## Variables de entorno

```env
# .env.local (para desarrollo)
DYNAMO_ENDPOINT=http://localhost:8000
DYNAMO_REGION=us-east-1
DYNAMO_TABLE=tablero-dev
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
```

---

## Comandos npm a agregar en package.json

```json
{
  "scripts": {
    "dynamo:up": "docker-compose up -d",
    "dynamo:down": "docker-compose down",
    "dynamo:setup": "ts-node scripts/setup.ts",
    "dynamo:verify": "ts-node scripts/verify.ts",
    "dynamo:reset": "ts-node scripts/reset.ts",
    "dynamo:seed": "ts-node scripts/setup.ts --seed-only"
  }
}
```
