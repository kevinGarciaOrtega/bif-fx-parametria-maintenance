# Design — Variable Horario de Mercado + Feriados

## Archivos involucrados
```
src/
├── handlers/
│   ├── horarioMercado.handler.ts   ← GET list + PUT
│   └── feriado.handler.ts          ← GET list + POST + DELETE
├── repositories/
│   ├── horarioMercado.repository.ts
│   └── feriado.repository.ts
├── models/
│   ├── horarioMercado.model.ts
│   └── feriado.model.ts
└── validators/
    └── schemas.ts                  ← agregar schemas de horario y feriado

tests/unit/
├── horarioMercado.validator.test.ts
├── horarioMercado.repository.test.ts
├── horarioMercado.handler.test.ts
├── feriado.validator.test.ts
├── feriado.repository.test.ts
└── feriado.handler.test.ts
```

---

## Flujo GET /parametros/horario-mercado
```
listar() handler
    └── HorarioMercadoRepository.listarTodos()
            └── ScanCommand FilterExpression #tipo = HORARIO
            └── map(mapToResponse) sin pk/sk/tipo
    └── ok({ data, total })
```

## Flujo PUT /parametros/horario-mercado/{id}
```
actualizar() handler
    ├── validar id path
    ├── VolatilidadUpdateSchema → HorarioMercadoUpdateSchema.safeParse
    ├── getUsuario(event)
    └── HorarioMercadoRepository.actualizar(id, pips, horaApertura, horaCierre, usuario)
            ├── GetCommand PK=HORARIO#${id} SK=METADATA
            │   └── null → return null
            └── UpdateCommand
                SET pips, horaApertura, horaCierre, updatedAt, updatedBy
                (NO toca nombre, pk, sk, tipo, id)
```

## Flujo GET /parametros/feriados?anio=2026
```
listar() handler
    ├── anio = event.queryStringParameters?.anio
    ├── !anio → badRequest FX-MNT-020
    ├── isNaN(Number(anio)) → badRequest FX-MNT-020
    └── FeriadoRepository.listarPorAnio(Number(anio))
            └── QueryCommand
                KeyConditionExpression: PK = :pk AND begins_with(SK, :sk)
                :pk = FERIADO#${anio}
                :sk = FECHA#
            └── map(mapToResponse) sin pk/sk/tipo
    └── ok({ anio, data, total })
```

## Flujo POST /parametros/feriados
```
crear() handler
    ├── FeriadoCreateSchema.safeParse(body)
    ├── extraer anio de fecha: new Date(body.fecha).getFullYear()
    └── FeriadoRepository.crear(fecha, descripcion, usuario)
            ├── GetCommand PK=FERIADO#${anio} SK=FECHA#${fecha}
            │   └── existe → return null (conflict)
            └── PutCommand
                PK: FERIADO#${anio}
                SK: FECHA#${fecha}
                tipo: FERIADO
                anio: Number
                fecha: string
                descripcion: string
                createdAt: ISO
                createdBy: usuario
```

## Flujo DELETE /parametros/feriados/{fecha}
```
eliminar() handler
    ├── fecha = event.pathParameters?.fecha
    ├── validar formato YYYY-MM-DD con regex
    └── FeriadoRepository.eliminar(fecha)
            ├── extraer anio de fecha
            ├── GetCommand PK=FERIADO#${anio} SK=FECHA#${fecha}
            │   └── !item → return false
            └── DeleteCommand PK=FERIADO#${anio} SK=FECHA#${fecha}
                return true
    ├── false → notFound FX-MNT-024
    └── true  → noContent() HTTP 204
```

---

## Interfaces TypeScript

### src/models/horarioMercado.model.ts
```typescript
export interface HorarioMercado {
  pk: string;           // HORARIO#<id>
  sk: string;           // METADATA
  tipo: "HORARIO";
  id: string;
  nombre: string;       // solo lectura
  horaApertura: string; // HH:MM
  horaCierre: string;   // HH:MM
  pips: number;
  updatedAt: string;
  updatedBy: string;
}

export interface HorarioMercadoUpdateRequest {
  pips: number;
  horaApertura: string;
  horaCierre: string;
}

export interface HorarioMercadoResponse {
  id: string;
  nombre: string;
  horaApertura: string;
  horaCierre: string;
  pips: number;
  updatedAt: string;
  updatedBy: string;
}
```

### src/models/feriado.model.ts
```typescript
export interface Feriado {
  pk: string;          // FERIADO#<anio>
  sk: string;          // FECHA#<fecha>
  tipo: "FERIADO";
  anio: number;
  fecha: string;       // YYYY-MM-DD
  descripcion: string;
  createdAt: string;
  createdBy: string;
}

export interface FeriadoCreateRequest {
  fecha: string;
  descripcion?: string;
}

export interface FeriadoResponse {
  fecha: string;
  descripcion: string;
  createdAt: string;
  createdBy: string;
}
```

---

## Schemas Zod — agregar a src/validators/schemas.ts

```typescript
const horaRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;

export const HorarioMercadoUpdateSchema = z.object({
  pips: z
    .number({ invalid_type_error: "PIPs debe ser un número" })
    .int("PIPs debe ser un número entero")
    .min(0, "PIPs debe ser >= 0"),
  horaApertura: z
    .string({ required_error: "horaApertura es requerida" })
    .regex(horaRegex, "Formato HH:MM requerido"),
  horaCierre: z
    .string({ required_error: "horaCierre es requerida" })
    .regex(horaRegex, "Formato HH:MM requerido"),
});

export const FeriadoCreateSchema = z.object({
  fecha: z
    .string({ required_error: "fecha es requerida" })
    .regex(fechaRegex, "Formato de fecha inválido, usar YYYY-MM-DD")
    .refine((f) => !isNaN(new Date(f).getTime()), "Fecha inválida"),
  descripcion: z.string().optional().default(""),
});
```

---

## Códigos de error de este módulo

| Código | HTTP | Cuándo |
|--------|------|--------|
| FX-MNT-011 | 400 | ID horario no viene en path |
| FX-MNT-012 | 400 | Validación falla en horario |
| FX-MNT-013 | 404 | ID horario no existe |
| FX-MNT-020 | 400 | anio faltante o inválido |
| FX-MNT-021 | 400 | Formato fecha inválido |
| FX-MNT-022 | 409 | Feriado ya existe |
| FX-MNT-023 | 400 | Formato fecha inválido en path |
| FX-MNT-024 | 404 | Feriado no encontrado |
| FX-MNT-500 | 500 | Error inesperado |
