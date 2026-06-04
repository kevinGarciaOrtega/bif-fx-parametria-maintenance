# Tasks — Usuario: GET / POST / PUT / DELETE

---

## Task 1: src/models/usuario.model.ts
Crear con exactamente este contenido:

```typescript
export type PerfilId = "ADMINISTRADOR" | "OPERATIVO" | "CONSULTOR";
export type EstadoUsuario = "ACTIVO" | "INACTIVO";

export interface Usuario {
  pk: string;
  sk: string;
  tipo: "USUARIO";
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
  gsi3pk: string;
  gsi3sk: string;
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

## Task 2: src/validators/schemas.ts
Agregar al archivo existente (después de ParametroSistemaUpdateSchema):

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

export const UsuarioUpdateSchema = z
  .object({
    nombre: z.string().min(1, "nombre no puede estar vacío").optional(),
    apellido: z.string().min(1, "apellido no puede estar vacío").optional(),
    email: z.string().email("email inválido").optional(),
    perfilId: z
      .enum(["ADMINISTRADOR", "OPERATIVO", "CONSULTOR"], {
        errorMap: () => ({ message: "perfilId debe ser ADMINISTRADOR, OPERATIVO o CONSULTOR" }),
      })
      .optional(),
    estado: z
      .enum(["ACTIVO", "INACTIVO"], {
        errorMap: () => ({ message: "estado debe ser ACTIVO o INACTIVO" }),
      })
      .optional(),
  })
  .refine(
    (data) =>
      Object.values(data).some((v) => v !== undefined),
    { message: "Debe enviarse al menos un campo para actualizar" }
  );

export type UsuarioCreateInput = z.infer<typeof UsuarioCreateSchema>;
export type UsuarioUpdateInput = z.infer<typeof UsuarioUpdateSchema>;
```

---

## Task 3: src/repositories/usuario.repository.ts
Crear con exactamente este contenido:

```typescript
import { GetCommand, PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { dynamo, TABLE } from "./dynamodb.client";
import {
  Usuario,
  UsuarioCreateRequest,
  UsuarioCreateResult,
  UsuarioFiltros,
  UsuarioResponse,
  UsuarioUpdateRequest,
} from "../models/usuario.model";

const mapToResponse = (item: Usuario): UsuarioResponse => ({
  usuarioId: item.usuarioId,
  username: item.username,
  nombre: item.nombre,
  apellido: item.apellido,
  email: item.email,
  perfilId: item.perfilId,
  estado: item.estado,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
  updatedBy: item.updatedBy,
});

export const UsuarioRepository = {

  async listar(filtros: UsuarioFiltros = {}): Promise<UsuarioResponse[]> {
    const result = await dynamo.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "#tipo = :tipo",
        ExpressionAttributeNames: { "#tipo": "tipo" },
        ExpressionAttributeValues: { ":tipo": "USUARIO" },
      })
    );
    if (!result.Items || result.Items.length === 0) return [];
    let items = result.Items as Usuario[];
    if (filtros.estado) items = items.filter((u) => u.estado === filtros.estado);
    if (filtros.perfilId) items = items.filter((u) => u.perfilId === filtros.perfilId);
    return items.map(mapToResponse);
  },

  async obtenerPorId(usuarioId: string): Promise<Usuario | null> {
    const result = await dynamo.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `USUARIO#${usuarioId}`, SK: "METADATA" },
      })
    );
    return result.Item ? (result.Item as Usuario) : null;
  },

  async crear(data: UsuarioCreateRequest, operador: string): Promise<UsuarioCreateResult> {
    // Verificar duplicado de username
    const todos = await dynamo.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "#tipo = :tipo",
        ExpressionAttributeNames: { "#tipo": "tipo" },
        ExpressionAttributeValues: { ":tipo": "USUARIO" },
      })
    );
    const usernameUpper = data.username.toUpperCase();
    const duplicado = (todos.Items as Usuario[] ?? []).find(
      (u) => u.username.toUpperCase() === usernameUpper
    );
    if (duplicado) return { error: "DUPLICADO", usernameExistente: duplicado.username };

    const usuarioId = "USR" + uuidv4().replace(/-/g, "").substring(0, 6).toUpperCase();
    const now = new Date().toISOString();

    const item: Usuario = {
      pk: `USUARIO#${usuarioId}`,
      sk: "METADATA",
      tipo: "USUARIO",
      usuarioId,
      username: usernameUpper,
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email,
      perfilId: data.perfilId,
      estado: "ACTIVO",
      createdAt: now,
      updatedAt: now,
      updatedBy: operador,
      gsi3pk: `PERFIL#${data.perfilId}`,
      gsi3sk: `USUARIO#${usuarioId}`,
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    return { data: mapToResponse(item) };
  },

  async actualizar(
    usuarioId: string,
    data: UsuarioUpdateRequest,
    operador: string
  ): Promise<UsuarioResponse | null> {
    const existente = await this.obtenerPorId(usuarioId);
    if (!existente) return null;

    const now = new Date().toISOString();
    const sets: string[] = [];
    const names: Record<string, string> = {};
    const values: Record<string, unknown> = { ":updatedAt": now, ":updatedBy": operador };

    if (data.nombre !== undefined) { sets.push("#nombre = :nombre"); names["#nombre"] = "nombre"; values[":nombre"] = data.nombre; }
    if (data.apellido !== undefined) { sets.push("apellido = :apellido"); values[":apellido"] = data.apellido; }
    if (data.email !== undefined) { sets.push("email = :email"); values[":email"] = data.email; }
    if (data.perfilId !== undefined) {
      sets.push("perfilId = :perfilId, gsi3pk = :gsi3pk");
      values[":perfilId"] = data.perfilId;
      values[":gsi3pk"] = `PERFIL#${data.perfilId}`;
    }
    if (data.estado !== undefined) { sets.push("estado = :estado"); values[":estado"] = data.estado; }

    sets.push("updatedAt = :updatedAt", "updatedBy = :updatedBy");

    await dynamo.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `USUARIO#${usuarioId}`, SK: "METADATA" },
        UpdateExpression: `SET ${sets.join(", ")}`,
        ExpressionAttributeNames: Object.keys(names).length > 0 ? names : undefined,
        ExpressionAttributeValues: values,
      })
    );

    return mapToResponse({
      ...existente,
      nombre: data.nombre ?? existente.nombre,
      apellido: data.apellido ?? existente.apellido,
      email: data.email ?? existente.email,
      perfilId: data.perfilId ?? existente.perfilId,
      estado: data.estado ?? existente.estado,
      updatedAt: now,
      updatedBy: operador,
    });
  },

  async desactivar(usuarioId: string, operador: string): Promise<UsuarioResponse | null> {
    const existente = await this.obtenerPorId(usuarioId);
    if (!existente) return null;

    const now = new Date().toISOString();

    await dynamo.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `USUARIO#${usuarioId}`, SK: "METADATA" },
        UpdateExpression: "SET estado = :estado, updatedAt = :updatedAt, updatedBy = :updatedBy",
        ExpressionAttributeValues: {
          ":estado": "INACTIVO",
          ":updatedAt": now,
          ":updatedBy": operador,
        },
      })
    );

    return mapToResponse({ ...existente, estado: "INACTIVO", updatedAt: now, updatedBy: operador });
  },
};
```

---

## Task 4: src/handlers/usuario.handler.ts
Crear con exactamente este contenido:

```typescript
import { APIGatewayProxyHandler } from "aws-lambda";
import { UsuarioRepository } from "../repositories/usuario.repository";
import { UsuarioCreateSchema, UsuarioUpdateSchema } from "../validators/schemas";
import { ok, created, badRequest, notFound, conflict, serverError } from "../utils/response.util";
import { getUsuario } from "../utils/audit.util";

export const listar: APIGatewayProxyHandler = async (event) => {
  try {
    const q = event.queryStringParameters ?? {};
    const data = await UsuarioRepository.listar({
      estado: q["estado"] ?? undefined,
      perfilId: q["perfilId"] ?? undefined,
    });
    return ok({ data, total: data.length });
  } catch (error) {
    return serverError(error);
  }
};

export const crear: APIGatewayProxyHandler = async (event) => {
  try {
    let body: unknown;
    try {
      body = JSON.parse(event.body ?? "{}");
    } catch {
      return badRequest("FX-MNT-081", "Body inválido, se esperaba JSON");
    }

    const parsed = UsuarioCreateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("FX-MNT-081", parsed.error.errors[0].message);
    }

    const operador = getUsuario(event);
    const result = await UsuarioRepository.crear(parsed.data, operador);

    if (result.error === "DUPLICADO") {
      return conflict("FX-MNT-082", `El usuario ${result.usernameExistente} ya existe`);
    }
    return created(result.data!);
  } catch (error) {
    return serverError(error);
  }
};

export const actualizar: APIGatewayProxyHandler = async (event) => {
  try {
    const usuarioId = event.pathParameters?.usuarioId;
    if (!usuarioId) return badRequest("FX-MNT-080", "usuarioId requerido");

    let body: unknown;
    try {
      body = JSON.parse(event.body ?? "{}");
    } catch {
      return badRequest("FX-MNT-081", "Body inválido, se esperaba JSON");
    }

    const parsed = UsuarioUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("FX-MNT-081", parsed.error.errors[0].message);
    }

    const operador = getUsuario(event);
    const result = await UsuarioRepository.actualizar(usuarioId, parsed.data, operador);

    if (!result) return notFound("FX-MNT-083", `Usuario ${usuarioId} no encontrado`);
    return ok(result);
  } catch (error) {
    return serverError(error);
  }
};

export const desactivar: APIGatewayProxyHandler = async (event) => {
  try {
    const usuarioId = event.pathParameters?.usuarioId;
    if (!usuarioId) return badRequest("FX-MNT-080", "usuarioId requerido");

    const operador = getUsuario(event);
    const result = await UsuarioRepository.desactivar(usuarioId, operador);

    if (!result) return notFound("FX-MNT-084", `Usuario ${usuarioId} no encontrado`);
    return ok(result);
  } catch (error) {
    return serverError(error);
  }
};
```

---

## Task 5: tests/unit/usuario.validator.test.ts
Crear con exactamente este contenido:

```typescript
import { UsuarioCreateSchema, UsuarioUpdateSchema } from "../../src/validators/schemas";

const bodyCreateValido = {
  username: "ANA.TORRES",
  nombre: "Ana",
  apellido: "Torres",
  email: "atorres@banbif.com.pe",
  perfilId: "OPERATIVO",
};

describe("UsuarioCreateSchema", () => {
  describe("casos válidos", () => {
    it("acepta body completo válido", () => {
      expect(UsuarioCreateSchema.safeParse(bodyCreateValido).success).toBe(true);
    });
    it("acepta perfilId ADMINISTRADOR", () => {
      expect(UsuarioCreateSchema.safeParse({ ...bodyCreateValido, perfilId: "ADMINISTRADOR" }).success).toBe(true);
    });
    it("acepta perfilId CONSULTOR", () => {
      expect(UsuarioCreateSchema.safeParse({ ...bodyCreateValido, perfilId: "CONSULTOR" }).success).toBe(true);
    });
  });

  describe("validación username", () => {
    it("rechaza username vacío", () => {
      const r = UsuarioCreateSchema.safeParse({ ...bodyCreateValido, username: "" });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("username no puede estar vacío");
    });
    it("rechaza username ausente", () => {
      const { username: _, ...sin } = bodyCreateValido;
      const r = UsuarioCreateSchema.safeParse(sin);
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("username es requerido");
    });
  });

  describe("validación email", () => {
    it("rechaza email sin @", () => {
      const r = UsuarioCreateSchema.safeParse({ ...bodyCreateValido, email: "no-es-email" });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("email inválido");
    });
    it("rechaza email ausente", () => {
      const { email: _, ...sin } = bodyCreateValido;
      expect(UsuarioCreateSchema.safeParse(sin).success).toBe(false);
    });
  });

  describe("validación perfilId", () => {
    it("rechaza perfilId inválido", () => {
      const r = UsuarioCreateSchema.safeParse({ ...bodyCreateValido, perfilId: "SUPERADMIN" });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("perfilId debe ser ADMINISTRADOR, OPERATIVO o CONSULTOR");
    });
    it("rechaza perfilId ausente", () => {
      const { perfilId: _, ...sin } = bodyCreateValido;
      expect(UsuarioCreateSchema.safeParse(sin).success).toBe(false);
    });
  });

  describe("campos requeridos", () => {
    it("rechaza nombre ausente", () => { const { nombre: _, ...sin } = bodyCreateValido; expect(UsuarioCreateSchema.safeParse(sin).success).toBe(false); });
    it("rechaza apellido ausente", () => { const { apellido: _, ...sin } = bodyCreateValido; expect(UsuarioCreateSchema.safeParse(sin).success).toBe(false); });
    it("rechaza body vacío", () => { expect(UsuarioCreateSchema.safeParse({}).success).toBe(false); });
  });
});

describe("UsuarioUpdateSchema", () => {
  describe("casos válidos", () => {
    it("acepta solo nombre", () => { expect(UsuarioUpdateSchema.safeParse({ nombre: "Ana María" }).success).toBe(true); });
    it("acepta solo email", () => { expect(UsuarioUpdateSchema.safeParse({ email: "nuevo@banbif.com.pe" }).success).toBe(true); });
    it("acepta solo estado", () => { expect(UsuarioUpdateSchema.safeParse({ estado: "INACTIVO" }).success).toBe(true); });
    it("acepta solo perfilId", () => { expect(UsuarioUpdateSchema.safeParse({ perfilId: "ADMINISTRADOR" }).success).toBe(true); });
    it("acepta múltiples campos", () => { expect(UsuarioUpdateSchema.safeParse({ nombre: "Ana", perfilId: "CONSULTOR", estado: "ACTIVO" }).success).toBe(true); });
  });

  describe("validaciones", () => {
    it("rechaza body vacío (sin campos para actualizar)", () => {
      const r = UsuarioUpdateSchema.safeParse({});
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("Debe enviarse al menos un campo para actualizar");
    });
    it("rechaza email inválido", () => {
      const r = UsuarioUpdateSchema.safeParse({ email: "no-email" });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("email inválido");
    });
    it("rechaza perfilId inválido", () => {
      expect(UsuarioUpdateSchema.safeParse({ perfilId: "OTRO" }).success).toBe(false);
    });
    it("rechaza estado inválido", () => {
      const r = UsuarioUpdateSchema.safeParse({ estado: "SUSPENDIDO" });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("estado debe ser ACTIVO o INACTIVO");
    });
    it("rechaza nombre vacío string", () => {
      expect(UsuarioUpdateSchema.safeParse({ nombre: "" }).success).toBe(false);
    });
  });
});
```

---

## Task 6: tests/unit/usuario.repository.test.ts
Crear con exactamente este contenido:

```typescript
import { UsuarioRepository } from "../../src/repositories/usuario.repository";
import { dynamo } from "../../src/repositories/dynamodb.client";

jest.mock("../../src/repositories/dynamodb.client", () => ({
  dynamo: { send: jest.fn() },
  TABLE: "tablero-test",
}));

const mockSend = dynamo.send as jest.Mock;

const makeUsuario = (id: string, username: string, overrides: Record<string, unknown> = {}) => ({
  pk: `USUARIO#${id}`, sk: "METADATA", tipo: "USUARIO",
  usuarioId: id, username, nombre: "Test", apellido: "User",
  email: `${username.toLowerCase()}@banbif.com.pe`,
  perfilId: "OPERATIVO", estado: "ACTIVO",
  createdAt: "2026-05-25T08:30:00Z",
  updatedAt: "2026-05-25T08:30:00Z", updatedBy: "SISTEMA",
  gsi3pk: "PERFIL#OPERATIVO", gsi3sk: `USUARIO#${id}`,
  ...overrides,
});

const usr001 = makeUsuario("USR001", "ROBERT.GARCIA", { perfilId: "ADMINISTRADOR", gsi3pk: "PERFIL#ADMINISTRADOR" });
const usr002 = makeUsuario("USR002", "ANA.TORRES");
const usrInactivo = makeUsuario("USR003", "LUIS.MENDOZA", { estado: "INACTIVO" });

describe("UsuarioRepository", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("listar()", () => {
    it("retorna usuarios sin pk/sk/tipo/gsi", async () => {
      mockSend.mockResolvedValueOnce({ Items: [usr001] });
      const r = await UsuarioRepository.listar();
      expect(r[0]).not.toHaveProperty("pk");
      expect(r[0]).not.toHaveProperty("gsi3pk");
      expect(r[0].usuarioId).toBe("USR001");
    });
    it("filtra por estado ACTIVO", async () => {
      mockSend.mockResolvedValueOnce({ Items: [usr001, usr002, usrInactivo] });
      const r = await UsuarioRepository.listar({ estado: "ACTIVO" });
      expect(r).toHaveLength(2);
      expect(r.every((u) => u.estado === "ACTIVO")).toBe(true);
    });
    it("filtra por perfilId", async () => {
      mockSend.mockResolvedValueOnce({ Items: [usr001, usr002] });
      const r = await UsuarioRepository.listar({ perfilId: "ADMINISTRADOR" });
      expect(r).toHaveLength(1);
      expect(r[0].perfilId).toBe("ADMINISTRADOR");
    });
    it("combina filtros como AND", async () => {
      mockSend.mockResolvedValueOnce({ Items: [usr001, usr002, usrInactivo] });
      const r = await UsuarioRepository.listar({ estado: "ACTIVO", perfilId: "OPERATIVO" });
      expect(r).toHaveLength(1);
      expect(r[0].username).toBe("ANA.TORRES");
    });
    it("retorna vacío sin items", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      expect(await UsuarioRepository.listar()).toEqual([]);
    });
  });

  describe("obtenerPorId()", () => {
    it("retorna usuario cuando existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: usr001 });
      expect((await UsuarioRepository.obtenerPorId("USR001"))?.usuarioId).toBe("USR001");
    });
    it("retorna null cuando no existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      expect(await UsuarioRepository.obtenerPorId("USR999")).toBeNull();
    });
    it("construye PK USUARIO#USR001", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      await UsuarioRepository.obtenerPorId("USR001");
      expect(mockSend.mock.calls[0][0].input.Key.PK).toBe("USUARIO#USR001");
    });
  });

  describe("crear()", () => {
    const dataCreate = { username: "nueva.persona", nombre: "Nueva", apellido: "Persona", email: "nueva@banbif.com.pe", perfilId: "OPERATIVO" as const };

    it("retorna DUPLICADO si username ya existe (case insensitive)", async () => {
      mockSend.mockResolvedValueOnce({ Items: [usr001] }); // scan
      const r = await UsuarioRepository.crear({ ...dataCreate, username: "robert.garcia" }, "SISTEMA");
      expect(r.error).toBe("DUPLICADO");
    });

    it("guarda username en MAYÚSCULAS", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] }).mockResolvedValueOnce({});
      const r = await UsuarioRepository.crear(dataCreate, "SISTEMA");
      expect(r.data?.username).toBe("NUEVA.PERSONA");
    });

    it("estado inicial es ACTIVO", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] }).mockResolvedValueOnce({});
      const r = await UsuarioRepository.crear(dataCreate, "SISTEMA");
      expect(r.data?.estado).toBe("ACTIVO");
    });

    it("PutCommand incluye gsi3pk y gsi3sk", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] }).mockResolvedValueOnce({});
      await UsuarioRepository.crear(dataCreate, "SISTEMA");
      const put = mockSend.mock.calls[1][0].input;
      expect(put.Item.gsi3pk).toBe("PERFIL#OPERATIVO");
      expect(put.Item.gsi3sk).toMatch(/^USUARIO#USR/);
    });

    it("usuarioId generado empieza con USR", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] }).mockResolvedValueOnce({});
      const r = await UsuarioRepository.crear(dataCreate, "SISTEMA");
      expect(r.data?.usuarioId).toMatch(/^USR/);
    });
  });

  describe("actualizar()", () => {
    it("retorna null si no existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      expect(await UsuarioRepository.actualizar("USR999", { nombre: "Test" }, "SISTEMA")).toBeNull();
    });
    it("actualiza solo los campos enviados", async () => {
      mockSend.mockResolvedValueOnce({ Item: usr002 }).mockResolvedValueOnce({});
      const r = await UsuarioRepository.actualizar("USR002", { nombre: "Ana María" }, "ANA.TORRES");
      expect(r?.nombre).toBe("Ana María");
      expect(r?.apellido).toBe("User"); // original
    });
    it("username NO cambia en el resultado", async () => {
      mockSend.mockResolvedValueOnce({ Item: usr002 }).mockResolvedValueOnce({});
      const r = await UsuarioRepository.actualizar("USR002", { nombre: "Ana" }, "SISTEMA");
      expect(r?.username).toBe("ANA.TORRES");
    });
    it("actualiza gsi3pk cuando cambia perfilId", async () => {
      mockSend.mockResolvedValueOnce({ Item: usr002 }).mockResolvedValueOnce({});
      await UsuarioRepository.actualizar("USR002", { perfilId: "ADMINISTRADOR" }, "SISTEMA");
      const u = mockSend.mock.calls[1][0].input.UpdateExpression;
      expect(u).toContain("gsi3pk");
    });
  });

  describe("desactivar()", () => {
    it("retorna null si no existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      expect(await UsuarioRepository.desactivar("USR999", "SISTEMA")).toBeNull();
    });
    it("retorna usuario con estado INACTIVO", async () => {
      mockSend.mockResolvedValueOnce({ Item: usr001 }).mockResolvedValueOnce({});
      const r = await UsuarioRepository.desactivar("USR001", "ANA.TORRES");
      expect(r?.estado).toBe("INACTIVO");
      expect(r?.updatedBy).toBe("ANA.TORRES");
    });
    it("NO elimina el registro (UpdateCommand, no DeleteCommand)", async () => {
      mockSend.mockResolvedValueOnce({ Item: usr001 }).mockResolvedValueOnce({});
      await UsuarioRepository.desactivar("USR001", "SISTEMA");
      const call = mockSend.mock.calls[1][0];
      // Debe ser UpdateCommand, no DeleteCommand
      expect(call.input.UpdateExpression).toContain("estado");
      expect(call.input.UpdateExpression).not.toContain("DELETE");
    });
    it("UpdateExpression contiene estado=INACTIVO", async () => {
      mockSend.mockResolvedValueOnce({ Item: usr001 }).mockResolvedValueOnce({});
      await UsuarioRepository.desactivar("USR001", "SISTEMA");
      const values = mockSend.mock.calls[1][0].input.ExpressionAttributeValues;
      expect(values[":estado"]).toBe("INACTIVO");
    });
  });
});
```

---

## Task 7: tests/unit/usuario.handler.test.ts
Crear con exactamente este contenido:

```typescript
import { APIGatewayProxyEvent } from "aws-lambda";
import { listar, crear, actualizar, desactivar } from "../../src/handlers/usuario.handler";
import { UsuarioRepository } from "../../src/repositories/usuario.repository";

jest.mock("../../src/repositories/usuario.repository");
const mockRepo = UsuarioRepository as jest.Mocked<typeof UsuarioRepository>;

const mockEvent = (o: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent =>
  ({ pathParameters: null, body: null, requestContext: { authorizer: null } as any,
     headers: {}, multiValueHeaders: {}, httpMethod: "GET", isBase64Encoded: false,
     path: "/", queryStringParameters: null, multiValueQueryStringParameters: null,
     stageVariables: null, resource: "/", ...o } as APIGatewayProxyEvent);

const usuarioItem = {
  usuarioId: "USR001", username: "ROBERT.GARCIA",
  nombre: "Robert", apellido: "Garcia",
  email: "rgarcia@banbif.com.pe", perfilId: "ADMINISTRADOR" as const,
  estado: "ACTIVO" as const,
  createdAt: "2026-05-25T08:30:00Z", updatedAt: "2026-05-25T08:30:00Z", updatedBy: "SISTEMA",
};

const bodyCrear = JSON.stringify({
  username: "ANA.TORRES", nombre: "Ana", apellido: "Torres",
  email: "atorres@banbif.com.pe", perfilId: "OPERATIVO",
});

const bodyActualizar = JSON.stringify({ nombre: "Ana María", estado: "INACTIVO" });

describe("usuario.handler", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("listar()", () => {
    it("retorna 200 con data y total", async () => {
      mockRepo.listar.mockResolvedValueOnce([usuarioItem]);
      const res = await listar(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(200); expect(JSON.parse(res!.body).total).toBe(1);
    });
    it("pasa filtros al repository", async () => {
      mockRepo.listar.mockResolvedValueOnce([]);
      await listar(mockEvent({ queryStringParameters: { estado: "ACTIVO", perfilId: "ADMINISTRADOR" } }), {} as any, () => {});
      expect(mockRepo.listar).toHaveBeenCalledWith({ estado: "ACTIVO", perfilId: "ADMINISTRADOR" });
    });
    it("retorna 200 vacío", async () => {
      mockRepo.listar.mockResolvedValueOnce([]);
      const res = await listar(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(200); expect(JSON.parse(res!.body).total).toBe(0);
    });
    it("retorna 500 ante error", async () => {
      mockRepo.listar.mockRejectedValueOnce(new Error("err"));
      expect((await listar(mockEvent(), {} as any, () => {}))!.statusCode).toBe(500);
    });
  });

  describe("crear()", () => {
    it("retorna 201 con usuario creado", async () => {
      mockRepo.crear.mockResolvedValueOnce({ data: usuarioItem });
      const res = await crear(mockEvent({ body: bodyCrear }), {} as any, () => {});
      expect(res!.statusCode).toBe(201);
    });
    it("retorna 409 FX-MNT-082 duplicado", async () => {
      mockRepo.crear.mockResolvedValueOnce({ error: "DUPLICADO", usernameExistente: "ANA.TORRES" });
      const res = await crear(mockEvent({ body: bodyCrear }), {} as any, () => {});
      expect(res!.statusCode).toBe(409);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-082");
      expect(JSON.parse(res!.body).mensaje).toContain("ANA.TORRES");
    });
    it("retorna 400 FX-MNT-081 email inválido", async () => {
      const res = await crear(mockEvent({ body: JSON.stringify({ username: "TEST", nombre: "T", apellido: "T", email: "no-email", perfilId: "OPERATIVO" }) }), {} as any, () => {});
      expect(res!.statusCode).toBe(400); expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-081");
    });
    it("retorna 400 FX-MNT-081 perfilId inválido", async () => {
      const res = await crear(mockEvent({ body: JSON.stringify({ username: "TEST", nombre: "T", apellido: "T", email: "t@b.com", perfilId: "SUPERADMIN" }) }), {} as any, () => {});
      expect(res!.statusCode).toBe(400); expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-081");
    });
    it("retorna 400 FX-MNT-081 username ausente", async () => {
      const res = await crear(mockEvent({ body: JSON.stringify({ nombre: "T", apellido: "T", email: "t@b.com", perfilId: "OPERATIVO" }) }), {} as any, () => {});
      expect(res!.statusCode).toBe(400); expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-081");
    });
    it("retorna 500 ante error", async () => {
      mockRepo.crear.mockRejectedValueOnce(new Error("err"));
      const res = await crear(mockEvent({ body: bodyCrear }), {} as any, () => {});
      expect(res!.statusCode).toBe(500);
    });
  });

  describe("actualizar()", () => {
    it("retorna 200 con usuario actualizado", async () => {
      mockRepo.actualizar.mockResolvedValueOnce({ ...usuarioItem, nombre: "Ana María" });
      const res = await actualizar(mockEvent({ pathParameters: { usuarioId: "USR001" }, body: bodyActualizar }), {} as any, () => {});
      expect(res!.statusCode).toBe(200);
    });
    it("retorna 400 FX-MNT-080 sin usuarioId", async () => {
      const res = await actualizar(mockEvent({ body: bodyActualizar }), {} as any, () => {});
      expect(res!.statusCode).toBe(400); expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-080");
    });
    it("retorna 400 FX-MNT-081 body vacío", async () => {
      const res = await actualizar(mockEvent({ pathParameters: { usuarioId: "USR001" }, body: "{}" }), {} as any, () => {});
      expect(res!.statusCode).toBe(400); expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-081");
    });
    it("retorna 400 FX-MNT-081 email inválido", async () => {
      const res = await actualizar(mockEvent({ pathParameters: { usuarioId: "USR001" }, body: JSON.stringify({ email: "malo" }) }), {} as any, () => {});
      expect(res!.statusCode).toBe(400); expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-081");
    });
    it("retorna 400 FX-MNT-081 estado inválido", async () => {
      const res = await actualizar(mockEvent({ pathParameters: { usuarioId: "USR001" }, body: JSON.stringify({ estado: "SUSPENDIDO" }) }), {} as any, () => {});
      expect(res!.statusCode).toBe(400); expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-081");
    });
    it("retorna 404 FX-MNT-083 no existe", async () => {
      mockRepo.actualizar.mockResolvedValueOnce(null);
      const res = await actualizar(mockEvent({ pathParameters: { usuarioId: "USR999" }, body: bodyActualizar }), {} as any, () => {});
      expect(res!.statusCode).toBe(404); expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-083");
    });
    it("retorna 500 ante error", async () => {
      mockRepo.actualizar.mockRejectedValueOnce(new Error("err"));
      const res = await actualizar(mockEvent({ pathParameters: { usuarioId: "USR001" }, body: bodyActualizar }), {} as any, () => {});
      expect(res!.statusCode).toBe(500);
    });
  });

  describe("desactivar()", () => {
    it("retorna 200 con usuario INACTIVO", async () => {
      mockRepo.desactivar.mockResolvedValueOnce({ ...usuarioItem, estado: "INACTIVO" });
      const res = await desactivar(mockEvent({ pathParameters: { usuarioId: "USR001" } }), {} as any, () => {});
      expect(res!.statusCode).toBe(200);
      expect(JSON.parse(res!.body).estado).toBe("INACTIVO");
    });
    it("retorna 400 FX-MNT-080 sin usuarioId", async () => {
      const res = await desactivar(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(400); expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-080");
    });
    it("retorna 404 FX-MNT-084 no existe", async () => {
      mockRepo.desactivar.mockResolvedValueOnce(null);
      const res = await desactivar(mockEvent({ pathParameters: { usuarioId: "USR999" } }), {} as any, () => {});
      expect(res!.statusCode).toBe(404); expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-084");
    });
    it("retorna 500 ante error", async () => {
      mockRepo.desactivar.mockRejectedValueOnce(new Error("err"));
      const res = await desactivar(mockEvent({ pathParameters: { usuarioId: "USR001" } }), {} as any, () => {});
      expect(res!.statusCode).toBe(500);
    });
  });
});
```

---

## Task 8: Verificar serverless.yml
Agregar o descomentar estas 4 funciones:

```yaml
listarUsuarios:
  handler: src/handlers/usuario.handler.listar
  events:
    - http:
        path: /usuarios
        method: GET
        cors: true

crearUsuario:
  handler: src/handlers/usuario.handler.crear
  events:
    - http:
        path: /usuarios
        method: POST
        cors: true

actualizarUsuario:
  handler: src/handlers/usuario.handler.actualizar
  events:
    - http:
        path: /usuarios/{usuarioId}
        method: PUT
        cors: true

desactivarUsuario:
  handler: src/handlers/usuario.handler.desactivar
  events:
    - http:
        path: /usuarios/{usuarioId}
        method: DELETE
        cors: true
```

---

## Criterios de aceptación

```
□ npx tsc --noEmit                          → 0 errores
□ npx jest tests/unit/usuario               → todos pasan
□ GET /usuarios                             → 200 con lista
□ GET ?estado=ACTIVO&perfilId=OPERATIVO     → 200 filtrado (AND)
□ POST nuevo usuario                        → 201, username en MAYÚSCULAS, estado=ACTIVO
□ POST username duplicado                   → 409 FX-MNT-082
□ POST email inválido                       → 400 FX-MNT-081
□ POST perfilId=SUPERADMIN                  → 400 FX-MNT-081
□ PUT actualiza solo campos enviados
□ PUT username NO cambia
□ PUT body vacío {}                         → 400 FX-MNT-081
□ DELETE (soft delete)                      → 200 con estado=INACTIVO
□ DELETE NO elimina el registro de DynamoDB
□ pk, sk, tipo, gsi3pk, gsi3sk nunca en response
```
