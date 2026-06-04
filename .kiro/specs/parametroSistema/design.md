# Design — Parámetro Sistema: GET List + PUT

## Archivos involucrados
```
src/
├── handlers/parametroSistema.handler.ts
├── repositories/parametroSistema.repository.ts
├── models/parametroSistema.model.ts
└── validators/schemas.ts  ← agregar ParametroSistemaUpdateSchema

tests/unit/
├── parametroSistema.validator.test.ts
├── parametroSistema.repository.test.ts
└── parametroSistema.handler.test.ts
```

---

## Flujo GET /parametros/sistema
```
listar() handler
    ├── grupo = event.queryStringParameters?.grupo (opcional)
    └── ParametroSistemaRepository.listar(grupo?)
            ├── ScanCommand tipo=PARAMETRO
            │   (si grupo: FilterExpression agrega PK = :pk)
            ├── Agrupar en memoria: Map<grupo, parametros[]>
            ├── sort grupos ASC
            └── map a formato { grupo, parametros[] }
    └── ok({ data, totalGrupos, totalParametros })
```

## Flujo PUT /parametros/sistema/{grupo}/{clave}
```
actualizar() handler
    ├── grupo = event.pathParameters?.grupo
    ├── clave = event.pathParameters?.clave
    ├── !grupo || !clave → badRequest FX-MNT-070
    ├── ParametroSistemaUpdateSchema.safeParse(body)
    └── ParametroSistemaRepository.actualizar(grupo, clave, valor, usuario)
            ├── GetCommand PK=PARAMETRO#${grupo} SK=PARAM#${clave}
            │   └── !item → return null
            └── UpdateCommand SET valor, updatedAt, updatedBy
                (NO toca nombre ni tipoValor)
    ├── null → notFound FX-MNT-073
    └── ok(result)
```

---

## Interfaces TypeScript

### src/models/parametroSistema.model.ts
```typescript
export type TipoValorParametro = "INTEGER" | "DECIMAL" | "STRING" | "TIME";

export interface ParametroSistema {
  pk: string;              // PARAMETRO#<grupo>
  sk: string;              // PARAM#<clave>
  tipo: "PARAMETRO";
  grupo: string;
  clave: string;
  nombre: string;          // solo lectura
  valor: string;           // siempre string
  tipoValor: TipoValorParametro; // solo lectura
  updatedAt: string;
  updatedBy: string;
}

export interface ParametroSistemaUpdateRequest {
  valor: string;
}

export interface ParametroSistemaItemResponse {
  clave: string;
  nombre: string;
  valor: string;
  tipoValor: TipoValorParametro;
  updatedAt: string;
  updatedBy: string;
}

export interface ParametroSistemaGrupoResponse {
  grupo: string;
  parametros: ParametroSistemaItemResponse[];
}

export interface ParametroSistemaResponse {
  grupo: string;
  clave: string;
  nombre: string;
  valor: string;
  tipoValor: TipoValorParametro;
  updatedAt: string;
  updatedBy: string;
}
```

---

## Schema Zod — agregar a src/validators/schemas.ts

```typescript
// ── PARAMETRO SISTEMA ───────────────────────────────────────
export const ParametroSistemaUpdateSchema = z.object({
  valor: z
    .string({ required_error: "valor es requerido" })
    .min(1, "valor es requerido"),
});
export type ParametroSistemaUpdateInput = z.infer<typeof ParametroSistemaUpdateSchema>;
```

---

## Agrupación en memoria

```typescript
const agrupar = (items: ParametroSistema[]): ParametroSistemaGrupoResponse[] => {
  const map = new Map<string, ParametroSistemaItemResponse[]>();
  for (const item of items) {
    if (!map.has(item.grupo)) map.set(item.grupo, []);
    map.get(item.grupo)!.push({
      clave: item.clave, nombre: item.nombre, valor: item.valor,
      tipoValor: item.tipoValor, updatedAt: item.updatedAt, updatedBy: item.updatedBy,
    });
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([grupo, parametros]) => ({ grupo, parametros }));
};
```

---

## Códigos de error de este módulo

| Código | HTTP | Cuándo |
|--------|------|--------|
| FX-MNT-070 | 400 | grupo o clave no vienen en path |
| FX-MNT-072 | 400 | valor vacío o ausente |
| FX-MNT-073 | 404 | combinación grupo/clave no existe |
| FX-MNT-500 | 500 | Error inesperado |
