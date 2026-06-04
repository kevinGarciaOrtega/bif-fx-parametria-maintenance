# Design — Usuario: GET / POST / PUT / DELETE

## Archivos involucrados
```
src/
├── handlers/usuario.handler.ts
├── repositories/usuario.repository.ts
├── models/usuario.model.ts
└── validators/schemas.ts  ← agregar UsuarioCreateSchema + UsuarioUpdateSchema

tests/unit/
├── usuario.validator.test.ts
├── usuario.repository.test.ts
└── usuario.handler.test.ts
```

---

## Flujo GET /usuarios
```
listar() handler
    ├── estado = queryStringParameters?.estado
    ├── perfilId = queryStringParameters?.perfilId
    └── UsuarioRepository.listar({ estado, perfilId })
            ├── ScanCommand tipo=USUARIO
            ├── filtrar en memoria (AND)
            └── map(mapToResponse) sin pk/sk/tipo/gsi
    └── ok({ data, total })
```

## Flujo POST /usuarios
```
crear() handler
    ├── UsuarioCreateSchema.safeParse(body)
    └── UsuarioRepository.crear(data, usuario)
            ├── ScanCommand → buscar username duplicado (case insensitive)
            │   └── existe → return { error: "DUPLICADO" }
            ├── usuarioId = "USR" + uuid().substring(0,6).toUpperCase()
            ├── now = new Date().toISOString()
            └── PutCommand:
                PK: USUARIO#${usuarioId}  SK: METADATA
                estado: "ACTIVO"
                username: toUpperCase
                GSI3PK: "PERFIL#${perfilId}"
                GSI3SK: "USUARIO#${usuarioId}"
    ├── DUPLICADO → conflict FX-MNT-082
    └── created(result.data!)
```

## Flujo PUT /usuarios/{usuarioId}
```
actualizar() handler
    ├── usuarioId = pathParameters?.usuarioId
    ├── !usuarioId → badRequest FX-MNT-080
    ├── UsuarioUpdateSchema.safeParse(body)
    └── UsuarioRepository.actualizar(usuarioId, data, usuario)
            ├── GetCommand PK=USUARIO#${usuarioId} SK=METADATA
            │   └── !item → return null
            ├── Construir UpdateExpression dinámicamente
            │   (solo los campos presentes en data)
            └── UpdateCommand
    ├── null → notFound FX-MNT-083
    └── ok(result)
```

## Flujo DELETE /usuarios/{usuarioId}
```
desactivar() handler  ← soft delete
    ├── usuarioId = pathParameters?.usuarioId
    ├── !usuarioId → badRequest FX-MNT-080
    └── UsuarioRepository.desactivar(usuarioId, usuario)
            ├── GetCommand → !item → return null
            └── UpdateCommand SET estado="INACTIVO", updatedAt, updatedBy
    ├── null → notFound FX-MNT-084
    └── ok(result)   ← HTTP 200, NO 204
```

---

## Interfaces TypeScript

### src/models/usuario.model.ts
```typescript
export type PerfilId = "ADMINISTRADOR" | "OPERATIVO" | "CONSULTOR";
export type EstadoUsuario = "ACTIVO" | "INACTIVO";

export interface Usuario {
  pk: string;              // USUARIO#<usuarioId>
  sk: string;              // METADATA
  tipo: "USUARIO";
  usuarioId: string;
  username: string;        // MAYÚSCULAS, inmutable
  nombre: string;
  apellido: string;
  email: string;
  perfilId: PerfilId;
  estado: EstadoUsuario;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  gsi3pk: string;          // "PERFIL#<perfilId>"
  gsi3sk: string;          // "USUARIO#<usuarioId>"
}

export interface UsuarioCreateRequest {
  username: string;
  nombre: string;
  apellido: string;
  email: string;
  perfilId: PerfilId;
}

export interface UsuarioUpdateRequest {
  nombre?: string;
  apellido?: string;
  email?: string;
  perfilId?: PerfilId;
  estado?: EstadoUsuario;
}

export interface UsuarioResponse {
  usuarioId: string;
  username: string;
  nombre: string;
  apellido: string;
  email: string;
  perfilId: PerfilId;
  estado: EstadoUsuario;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface UsuarioFiltros {
  estado?: string;
  perfilId?: string;
}

export interface UsuarioCreateResult {
  data?: UsuarioResponse;
  error?: "DUPLICADO";
  usernameExistente?: string;
}
```

---

## Schemas Zod — agregar a src/validators/schemas.ts

```typescript
// ── USUARIO ─────────────────────────────────────────────────
export const UsuarioCreateSchema = z.object({
  username: z
    .string({ required_error: "username es requerido" })
    .min(1, "username no puede estar vacío"),
  nombre: z
    .string({ required_error: "nombre es requerido" })
    .min(1, "nombre no puede estar vacío"),
  apellido: z
    .string({ required_error: "apellido es requerido" })
    .min(1, "apellido no puede estar vacío"),
  email: z
    .string({ required_error: "email es requerido" })
    .email("email inválido"),
  perfilId: z.enum(["ADMINISTRADOR", "OPERATIVO", "CONSULTOR"], {
    errorMap: () => ({ message: "perfilId debe ser ADMINISTRADOR, OPERATIVO o CONSULTOR" }),
  }),
});

export const UsuarioUpdateSchema = z.object({
  nombre: z.string().min(1, "nombre no puede estar vacío").optional(),
  apellido: z.string().min(1, "apellido no puede estar vacío").optional(),
  email: z.string().email("email inválido").optional(),
  perfilId: z.enum(["ADMINISTRADOR", "OPERATIVO", "CONSULTOR"], {
    errorMap: () => ({ message: "perfilId debe ser ADMINISTRADOR, OPERATIVO o CONSULTOR" }),
  }).optional(),
  estado: z.enum(["ACTIVO", "INACTIVO"], {
    errorMap: () => ({ message: "estado debe ser ACTIVO o INACTIVO" }),
  }).optional(),
}).refine(
  (data) => Object.keys(data).some((k) => data[k as keyof typeof data] !== undefined),
  { message: "Debe enviarse al menos un campo para actualizar" }
);

export type UsuarioCreateInput = z.infer<typeof UsuarioCreateSchema>;
export type UsuarioUpdateInput = z.infer<typeof UsuarioUpdateSchema>;
```

---

## UpdateExpression dinámica en PUT

```typescript
// Solo actualiza los campos enviados
const buildUpdateExpression = (data: UsuarioUpdateInput) => {
  const sets: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};

  if (data.nombre !== undefined) {
    sets.push("#nombre = :nombre");
    names["#nombre"] = "nombre";
    values[":nombre"] = data.nombre;
  }
  if (data.apellido !== undefined) { sets.push("apellido = :apellido"); values[":apellido"] = data.apellido; }
  if (data.email !== undefined) { sets.push("email = :email"); values[":email"] = data.email; }
  if (data.perfilId !== undefined) { sets.push("perfilId = :perfilId"); values[":perfilId"] = data.perfilId; }
  if (data.estado !== undefined) { sets.push("estado = :estado"); values[":estado"] = data.estado; }

  sets.push("updatedAt = :updatedAt", "updatedBy = :updatedBy");
  values[":updatedAt"] = new Date().toISOString();
  values[":updatedBy"] = "...usuario";

  return { expression: "SET " + sets.join(", "), names, values };
};
```

---

## Códigos de error de este módulo

| Código | HTTP | Cuándo |
|--------|------|--------|
| FX-MNT-080 | 400 | usuarioId no viene en path |
| FX-MNT-081 | 400 | Validación falla (email, perfilId, campos requeridos) |
| FX-MNT-082 | 409 | username ya existe |
| FX-MNT-083 | 404 | usuarioId no existe en PUT |
| FX-MNT-084 | 404 | usuarioId no existe en DELETE |
| FX-MNT-500 | 500 | Error inesperado |
