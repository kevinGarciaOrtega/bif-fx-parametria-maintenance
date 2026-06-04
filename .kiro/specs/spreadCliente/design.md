# Design — Base Spread de Clientes

## Archivos involucrados
```
src/
├── handlers/spreadCliente.handler.ts
├── repositories/spreadCliente.repository.ts
├── models/spreadCliente.model.ts
└── validators/schemas.ts  ← agregar SpreadClienteCreateSchema + SpreadClienteUpdateSchema

tests/unit/
├── spreadCliente.validator.test.ts
├── spreadCliente.repository.test.ts
└── spreadCliente.handler.test.ts
```

---

## Flujo GET /parametros/spread-cliente
```
buscar() handler
    ├── extraer query params: codigoIbs, nroDocumento, tipoDocumento,
    │   tipoPersoneria, flagMotor, nombreCliente
    └── SpreadClienteRepository.buscar(filtros)
            ├── ScanCommand tipo=SPREAD_CLIENTE
            ├── filtrar en memoria (AND de todos los filtros presentes)
            │   nombreCliente → contains en razonSocial || apellidoPaterno || nombres
            └── map(mapToResponse) sin pk/sk/tipo/gsi
    └── ok({ data, total })
```

## Flujo GET /parametros/spread-cliente/buscar-ibs/{codigoIbs}
```
buscarIbs() handler
    ├── codigoIbs = event.pathParameters?.codigoIbs
    ├── !codigoIbs → badRequest FX-MNT-060
    └── SpreadClienteRepository.obtenerPorCodigoIbs(codigoIbs)
            └── GetCommand PK=SPREAD_CLIENTE#${codigoIbs} SK=METADATA
    ├── null → notFound FX-MNT-062
    └── ok(result)  ← datos para pre-cargar formulario
```

## Flujo POST /parametros/spread-cliente
```
crear() handler
    ├── SpreadClienteCreateSchema.safeParse(body) → badRequest FX-MNT-061
    └── SpreadClienteRepository.crear(data, usuario)
            ├── GetCommand → ¿ya existe? → return { error: "DUPLICADO" }
            └── PutCommand con GSI2PK="SPREAD_CLIENTE" GSI2SK=codigoIbs
    ├── DUPLICADO → conflict FX-MNT-063
    └── created(result.data!)
```

## Flujo PUT /parametros/spread-cliente/{codigoIbs}
```
actualizar() handler
    ├── codigoIbs = event.pathParameters?.codigoIbs
    ├── !codigoIbs → badRequest FX-MNT-060
    ├── SpreadClienteUpdateSchema.safeParse(body) → badRequest FX-MNT-061
    └── SpreadClienteRepository.actualizar(codigoIbs, data, usuario)
            ├── GetCommand → !item → return null
            └── UpdateCommand SET codigoBanca, descripcionBanca,
                spreadPips, flagMotor, updatedAt, updatedBy
    ├── null → notFound FX-MNT-063
    └── ok(result)
```

## Flujo DELETE /parametros/spread-cliente/{codigoIbs}
```
eliminar() handler
    ├── codigoIbs = event.pathParameters?.codigoIbs
    ├── !codigoIbs → badRequest FX-MNT-060
    └── SpreadClienteRepository.eliminar(codigoIbs)
            ├── GetCommand → !item → return false
            └── DeleteCommand → return true
    ├── false → notFound FX-MNT-064
    └── noContent()
```

---

## Interfaces TypeScript

### src/models/spreadCliente.model.ts
```typescript
export type FlagMotor = "ACTIVO" | "INACTIVO";

export interface SpreadCliente {
  pk: string;             // SPREAD_CLIENTE#<codigoIbs>
  sk: string;             // METADATA
  tipo: "SPREAD_CLIENTE";
  codigoIbs: string;
  tipoPersoneria: string;
  tipoDocumento: string;
  nroDocumento: string;
  razonSocial: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombres: string;
  codigoBanca: string;
  descripcionBanca: string;
  spreadPips: number;
  flagMotor: FlagMotor;
  updatedAt: string;
  updatedBy: string;
  gsi2pk: string;         // "SPREAD_CLIENTE"
  gsi2sk: string;         // codigoIbs
}

export interface SpreadClienteCreateRequest {
  codigoIbs: string;
  tipoPersoneria: string;
  tipoDocumento: string;
  nroDocumento: string;
  razonSocial: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombres: string;
  codigoBanca: string;
  descripcionBanca: string;
  spreadPips: number;
  flagMotor: FlagMotor;
}

export interface SpreadClienteUpdateRequest {
  codigoBanca: string;
  descripcionBanca: string;
  spreadPips: number;
  flagMotor: FlagMotor;
}

export interface SpreadClienteResponse {
  codigoIbs: string;
  tipoPersoneria: string;
  tipoDocumento: string;
  nroDocumento: string;
  razonSocial: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombres: string;
  codigoBanca: string;
  descripcionBanca: string;
  spreadPips: number;
  flagMotor: FlagMotor;
  updatedAt: string;
  updatedBy: string;
}

export interface SpreadClienteFiltros {
  codigoIbs?: string;
  nroDocumento?: string;
  tipoDocumento?: string;
  tipoPersoneria?: string;
  flagMotor?: string;
  nombreCliente?: string;
}

export interface SpreadClienteCreateResult {
  data?: SpreadClienteResponse;
  error?: "DUPLICADO";
}
```

---

## Schemas Zod — agregar a src/validators/schemas.ts

```typescript
// ── SPREAD CLIENTE ──────────────────────────────────────────
export const SpreadClienteCreateSchema = z.object({
  codigoIbs: z
    .string({ required_error: "codigoIbs es requerido" })
    .min(1, "codigoIbs no puede estar vacío"),
  tipoPersoneria: z.string().default(""),
  tipoDocumento: z.string().default(""),
  nroDocumento: z.string().default(""),
  razonSocial: z.string().default(""),
  apellidoPaterno: z.string().default(""),
  apellidoMaterno: z.string().default(""),
  nombres: z.string().default(""),
  codigoBanca: z
    .string({ required_error: "codigoBanca es requerido" })
    .min(1, "codigoBanca no puede estar vacío"),
  descripcionBanca: z.string().default(""),
  spreadPips: z
    .number({ invalid_type_error: "spreadPips debe ser un número" })
    .int("spreadPips debe ser un número entero")
    .min(0, "spreadPips debe ser >= 0"),
  flagMotor: z.enum(["ACTIVO", "INACTIVO"], {
    errorMap: () => ({ message: "flagMotor debe ser ACTIVO o INACTIVO" }),
  }),
});

export const SpreadClienteUpdateSchema = z.object({
  codigoBanca: z
    .string({ required_error: "codigoBanca es requerido" })
    .min(1, "codigoBanca no puede estar vacío"),
  descripcionBanca: z.string().default(""),
  spreadPips: z
    .number({ invalid_type_error: "spreadPips debe ser un número" })
    .int("spreadPips debe ser un número entero")
    .min(0, "spreadPips debe ser >= 0"),
  flagMotor: z.enum(["ACTIVO", "INACTIVO"], {
    errorMap: () => ({ message: "flagMotor debe ser ACTIVO o INACTIVO" }),
  }),
});

export type SpreadClienteCreateInput = z.infer<typeof SpreadClienteCreateSchema>;
export type SpreadClienteUpdateInput = z.infer<typeof SpreadClienteUpdateSchema>;
```

---

## Lógica de filtrado en memoria

```typescript
// Todos los filtros aplican como AND
const aplicarFiltros = (items: SpreadCliente[], f: SpreadClienteFiltros): SpreadCliente[] => {
  return items.filter((item) => {
    if (f.codigoIbs && item.codigoIbs !== f.codigoIbs) return false;
    if (f.nroDocumento && item.nroDocumento !== f.nroDocumento) return false;
    if (f.tipoDocumento && item.tipoDocumento !== f.tipoDocumento) return false;
    if (f.tipoPersoneria && item.tipoPersoneria !== f.tipoPersoneria) return false;
    if (f.flagMotor && item.flagMotor !== f.flagMotor) return false;
    if (f.nombreCliente) {
      const q = f.nombreCliente.toUpperCase();
      const enRazon = item.razonSocial.toUpperCase().includes(q);
      const enApellido = item.apellidoPaterno.toUpperCase().includes(q);
      const enNombre = item.nombres.toUpperCase().includes(q);
      if (!enRazon && !enApellido && !enNombre) return false;
    }
    return true;
  });
};
```

---

## Códigos de error de este módulo

| Código | HTTP | Cuándo |
|--------|------|--------|
| FX-MNT-060 | 400 | codigoIbs no viene en path |
| FX-MNT-061 | 400 | Validación falla (body inválido) |
| FX-MNT-062 | 404 | codigoIbs no existe en buscar-ibs |
| FX-MNT-063 | 404/409 | No existe en PUT / Duplicado en POST |
| FX-MNT-064 | 404 | No existe en DELETE |
| FX-MNT-500 | 500 | Error inesperado |
