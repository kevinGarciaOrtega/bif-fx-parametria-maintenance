# DynamoDB Local — BIF FX tablero

## Requisitos previos
- Docker Desktop instalado
- Node.js 20.x
- AWS CLI configurado (cualquier credencial sirve para local)

## Setup inicial

```bash
npm install
npm run up          # levanta DynamoDB Local en puerto 8000
npm run setup       # crea tabla + carga todos los datos
```

## Verificar datos

```bash
npm run verify
```

## Resetear datos

```bash
npm run reset
```

## Detener DynamoDB Local

```bash
npm run down
```

## Conectar desde el servicio Lambda

Configura las siguientes variables de entorno en tu Lambda o `.env.local`:

```env
DYNAMO_ENDPOINT=http://localhost:8000
DYNAMO_REGION=us-east-1
DYNAMO_TABLE=tablero-dev
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
STAGE=dev
```

## Estructura de archivos

```
dynamo-local/
├── docker-compose.yml          ← DynamoDB Local en Docker
├── package.json                ← scripts npm
├── tsconfig.json               ← configuración TypeScript
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

## Tabla: tablero-dev

Single Table Design con los siguientes GSIs:

| GSI | PK | SK | Uso |
|-----|----|----|-----|
| GSI1-estado-fecha | GSI1PK (estado cotización) | GSI1SK (fecha expiración) | Cotizaciones vencidas |
| GSI2-cliente | GSI2PK (tipo/cliente) | GSI2SK (identificador) | Búsqueda por cliente o segmento |
| GSI3-perfil-pantalla | GSI3PK (perfil) | GSI3SK (pantalla/usuario) | Accesos por perfil |
