# Tasks — Base Spread de Clientes

---

## Task 1: src/models/spreadCliente.model.ts
Crear con exactamente este contenido:

```typescript
export type FlagMotor = "ACTIVO" | "INACTIVO";

export interface SpreadCliente {
  pk: string;
  sk: string;
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
  gsi2pk: string;
  gsi2sk: string;
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

## Task 2: src/validators/schemas.ts
Agregar al archivo existente (después de SpreadLiquidezUpdateSchema):

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

## Task 3: src/repositories/spreadCliente.repository.ts
Crear con exactamente este contenido:

```typescript
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { dynamo, TABLE } from "./dynamodb.client";
import {
  SpreadCliente,
  SpreadClienteCreateRequest,
  SpreadClienteCreateResult,
  SpreadClienteFiltros,
  SpreadClienteResponse,
} from "../models/spreadCliente.model";

const mapToResponse = (item: SpreadCliente): SpreadClienteResponse => ({
  codigoIbs: item.codigoIbs,
  tipoPersoneria: item.tipoPersoneria,
  tipoDocumento: item.tipoDocumento,
  nroDocumento: item.nroDocumento,
  razonSocial: item.razonSocial,
  apellidoPaterno: item.apellidoPaterno,
  apellidoMaterno: item.apellidoMaterno,
  nombres: item.nombres,
  codigoBanca: item.codigoBanca,
  descripcionBanca: item.descripcionBanca,
  spreadPips: item.spreadPips,
  flagMotor: item.flagMotor,
  updatedAt: item.updatedAt,
  updatedBy: item.updatedBy,
});

const aplicarFiltros = (
  items: SpreadCliente[],
  f: SpreadClienteFiltros
): SpreadCliente[] =>
  items.filter((item) => {
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

export const SpreadClienteRepository = {

  async buscar(filtros: SpreadClienteFiltros = {}): Promise<SpreadClienteResponse[]> {
    const result = await dynamo.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "#tipo = :tipo",
        ExpressionAttributeNames: { "#tipo": "tipo" },
        ExpressionAttributeValues: { ":tipo": "SPREAD_CLIENTE" },
      })
    );
    if (!result.Items || result.Items.length === 0) return [];
    const todos = result.Items as SpreadCliente[];
    return aplicarFiltros(todos, filtros).map(mapToResponse);
  },

  async obtenerPorCodigoIbs(
    codigoIbs: string
  ): Promise<SpreadClienteResponse | null> {
    const result = await dynamo.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `SPREAD_CLIENTE#${codigoIbs}`, SK: "METADATA" },
      })
    );
    if (!result.Item) return null;
    return mapToResponse(result.Item as SpreadCliente);
  },

  async crear(
    data: SpreadClienteCreateRequest,
    usuario: string
  ): Promise<SpreadClienteCreateResult> {
    const existe = await this.obtenerPorCodigoIbs(data.codigoIbs);
    if (existe) return { error: "DUPLICADO" };

    const now = new Date().toISOString();
    const item: SpreadCliente = {
      pk: `SPREAD_CLIENTE#${data.codigoIbs}`,
      sk: "METADATA",
      tipo: "SPREAD_CLIENTE",
      codigoIbs: data.codigoIbs,
      tipoPersoneria: data.tipoPersoneria,
      tipoDocumento: data.tipoDocumento,
      nroDocumento: data.nroDocumento,
      razonSocial: data.razonSocial,
      apellidoPaterno: data.apellidoPaterno,
      apellidoMaterno: data.apellidoMaterno,
      nombres: data.nombres,
      codigoBanca: data.codigoBanca,
      descripcionBanca: data.descripcionBanca,
      spreadPips: data.spreadPips,
      flagMotor: data.flagMotor,
      updatedAt: now,
      updatedBy: usuario,
      gsi2pk: "SPREAD_CLIENTE",
      gsi2sk: data.codigoIbs,
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    return { data: mapToResponse(item) };
  },

  async actualizar(
    codigoIbs: string,
    codigoBanca: string,
    descripcionBanca: string,
    spreadPips: number,
    flagMotor: string,
    usuario: string
  ): Promise<SpreadClienteResponse | null> {
    const existente = await this.obtenerPorCodigoIbs(codigoIbs);
    if (!existente) return null;

    const now = new Date().toISOString();

    await dynamo.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `SPREAD_CLIENTE#${codigoIbs}`, SK: "METADATA" },
        UpdateExpression:
          "SET codigoBanca = :codigoBanca, descripcionBanca = :descripcionBanca, " +
          "spreadPips = :spreadPips, flagMotor = :flagMotor, " +
          "updatedAt = :updatedAt, updatedBy = :updatedBy",
        ExpressionAttributeValues: {
          ":codigoBanca": codigoBanca,
          ":descripcionBanca": descripcionBanca,
          ":spreadPips": spreadPips,
          ":flagMotor": flagMotor,
          ":updatedAt": now,
          ":updatedBy": usuario,
        },
      })
    );

    return {
      ...existente,
      codigoBanca,
      descripcionBanca,
      spreadPips,
      flagMotor: flagMotor as "ACTIVO" | "INACTIVO",
      updatedAt: now,
      updatedBy: usuario,
    };
  },

  async eliminar(codigoIbs: string): Promise<boolean> {
    const result = await dynamo.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `SPREAD_CLIENTE#${codigoIbs}`, SK: "METADATA" },
      })
    );
    if (!result.Item) return false;

    await dynamo.send(
      new DeleteCommand({
        TableName: TABLE,
        Key: { PK: `SPREAD_CLIENTE#${codigoIbs}`, SK: "METADATA" },
      })
    );
    return true;
  },
};
```

---

## Task 4: src/handlers/spreadCliente.handler.ts
Crear con exactamente este contenido:

```typescript
import { APIGatewayProxyHandler } from "aws-lambda";
import { SpreadClienteRepository } from "../repositories/spreadCliente.repository";
import {
  SpreadClienteCreateSchema,
  SpreadClienteUpdateSchema,
} from "../validators/schemas";
import {
  ok,
  created,
  noContent,
  badRequest,
  notFound,
  conflict,
  serverError,
} from "../utils/response.util";
import { getUsuario } from "../utils/audit.util";
import { SpreadClienteFiltros } from "../models/spreadCliente.model";

export const buscar: APIGatewayProxyHandler = async (event) => {
  try {
    const q = event.queryStringParameters ?? {};
    const filtros: SpreadClienteFiltros = {
      codigoIbs: q["codigoIbs"] ?? undefined,
      nroDocumento: q["nroDocumento"] ?? undefined,
      tipoDocumento: q["tipoDocumento"] ?? undefined,
      tipoPersoneria: q["tipoPersoneria"] ?? undefined,
      flagMotor: q["flagMotor"] ?? undefined,
      nombreCliente: q["nombreCliente"] ?? undefined,
    };
    const data = await SpreadClienteRepository.buscar(filtros);
    return ok({ data, total: data.length });
  } catch (error) {
    return serverError(error);
  }
};

export const buscarIbs: APIGatewayProxyHandler = async (event) => {
  try {
    const codigoIbs = event.pathParameters?.codigoIbs;
    if (!codigoIbs) return badRequest("FX-MNT-060", "Código IBS requerido");

    const result = await SpreadClienteRepository.obtenerPorCodigoIbs(codigoIbs);
    if (!result) return notFound("FX-MNT-062", `Cliente ${codigoIbs} no encontrado`);
    return ok(result);
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
      return badRequest("FX-MNT-061", "Body inválido, se esperaba JSON");
    }

    const parsed = SpreadClienteCreateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("FX-MNT-061", parsed.error.errors[0].message);
    }

    const usuario = getUsuario(event);
    const result = await SpreadClienteRepository.crear(parsed.data, usuario);

    if (result.error === "DUPLICADO") {
      return conflict(
        "FX-MNT-063",
        `El cliente ${parsed.data.codigoIbs} ya tiene spread configurado`
      );
    }
    return created(result.data!);
  } catch (error) {
    return serverError(error);
  }
};

export const actualizar: APIGatewayProxyHandler = async (event) => {
  try {
    const codigoIbs = event.pathParameters?.codigoIbs;
    if (!codigoIbs) return badRequest("FX-MNT-060", "Código IBS requerido");

    let body: unknown;
    try {
      body = JSON.parse(event.body ?? "{}");
    } catch {
      return badRequest("FX-MNT-061", "Body inválido, se esperaba JSON");
    }

    const parsed = SpreadClienteUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("FX-MNT-061", parsed.error.errors[0].message);
    }

    const usuario = getUsuario(event);
    const result = await SpreadClienteRepository.actualizar(
      codigoIbs,
      parsed.data.codigoBanca,
      parsed.data.descripcionBanca,
      parsed.data.spreadPips,
      parsed.data.flagMotor,
      usuario
    );

    if (!result) return notFound("FX-MNT-063", `Cliente ${codigoIbs} no encontrado`);
    return ok(result);
  } catch (error) {
    return serverError(error);
  }
};

export const eliminar: APIGatewayProxyHandler = async (event) => {
  try {
    const codigoIbs = event.pathParameters?.codigoIbs;
    if (!codigoIbs) return badRequest("FX-MNT-060", "Código IBS requerido");

    const eliminado = await SpreadClienteRepository.eliminar(codigoIbs);
    if (!eliminado) return notFound("FX-MNT-064", `Cliente ${codigoIbs} no encontrado`);
    return noContent();
  } catch (error) {
    return serverError(error);
  }
};
```

---

## Task 5: tests/unit/spreadCliente.validator.test.ts
Crear con exactamente este contenido:

```typescript
import {
  SpreadClienteCreateSchema,
  SpreadClienteUpdateSchema,
} from "../../src/validators/schemas";

const bodyCreateValido = {
  codigoIbs: "999",
  codigoBanca: "0002",
  spreadPips: 150,
  flagMotor: "ACTIVO",
};

describe("SpreadClienteCreateSchema", () => {
  describe("casos válidos", () => {
    it("acepta request mínimo con campos opcionales vacíos", () => {
      expect(SpreadClienteCreateSchema.safeParse(bodyCreateValido).success).toBe(true);
    });
    it("acepta request completo", () => {
      expect(SpreadClienteCreateSchema.safeParse({
        ...bodyCreateValido,
        tipoPersoneria: "Persona Natural",
        tipoDocumento: "DNI",
        nroDocumento: "12345678",
        apellidoPaterno: "GARCIA",
        apellidoMaterno: "LOPEZ",
        nombres: "JUAN",
        razonSocial: "",
        descripcionBanca: "BANCA PREMIUM",
      }).success).toBe(true);
    });
    it("acepta spreadPips = 0", () => {
      expect(SpreadClienteCreateSchema.safeParse({ ...bodyCreateValido, spreadPips: 0 }).success).toBe(true);
    });
    it("flagMotor INACTIVO es válido", () => {
      expect(SpreadClienteCreateSchema.safeParse({ ...bodyCreateValido, flagMotor: "INACTIVO" }).success).toBe(true);
    });
  });

  describe("validación codigoIbs", () => {
    it("rechaza codigoIbs vacío", () => {
      const r = SpreadClienteCreateSchema.safeParse({ ...bodyCreateValido, codigoIbs: "" });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("codigoIbs no puede estar vacío");
    });
    it("rechaza codigoIbs ausente", () => {
      const { codigoIbs: _, ...sin } = bodyCreateValido;
      const r = SpreadClienteCreateSchema.safeParse(sin);
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("codigoIbs es requerido");
    });
  });

  describe("validación codigoBanca", () => {
    it("rechaza codigoBanca vacío", () => {
      const r = SpreadClienteCreateSchema.safeParse({ ...bodyCreateValido, codigoBanca: "" });
      expect(r.success).toBe(false);
    });
  });

  describe("validación spreadPips", () => {
    it("rechaza spreadPips negativo", () => {
      const r = SpreadClienteCreateSchema.safeParse({ ...bodyCreateValido, spreadPips: -1 });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("spreadPips debe ser >= 0");
    });
    it("rechaza spreadPips decimal", () => {
      expect(SpreadClienteCreateSchema.safeParse({ ...bodyCreateValido, spreadPips: 10.5 }).success).toBe(false);
    });
    it("rechaza spreadPips como string", () => {
      const r = SpreadClienteCreateSchema.safeParse({ ...bodyCreateValido, spreadPips: "150" });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("spreadPips debe ser un número");
    });
  });

  describe("validación flagMotor", () => {
    it("rechaza flagMotor inválido", () => {
      const r = SpreadClienteCreateSchema.safeParse({ ...bodyCreateValido, flagMotor: "OTRO" });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("flagMotor debe ser ACTIVO o INACTIVO");
    });
    it("rechaza flagMotor ausente", () => {
      const { flagMotor: _, ...sin } = bodyCreateValido;
      expect(SpreadClienteCreateSchema.safeParse(sin).success).toBe(false);
    });
  });
});

describe("SpreadClienteUpdateSchema", () => {
  const bodyValido = { codigoBanca: "0003", spreadPips: 200, flagMotor: "INACTIVO" };

  it("acepta request válido", () => {
    expect(SpreadClienteUpdateSchema.safeParse(bodyValido).success).toBe(true);
  });
  it("rechaza spreadPips negativo", () => {
    expect(SpreadClienteUpdateSchema.safeParse({ ...bodyValido, spreadPips: -1 }).success).toBe(false);
  });
  it("rechaza flagMotor inválido", () => {
    expect(SpreadClienteUpdateSchema.safeParse({ ...bodyValido, flagMotor: "OTRO" }).success).toBe(false);
  });
  it("rechaza codigoBanca vacío", () => {
    expect(SpreadClienteUpdateSchema.safeParse({ ...bodyValido, codigoBanca: "" }).success).toBe(false);
  });
});
```

---

## Task 6: tests/unit/spreadCliente.repository.test.ts
Crear con exactamente este contenido:

```typescript
import { SpreadClienteRepository } from "../../src/repositories/spreadCliente.repository";
import { dynamo } from "../../src/repositories/dynamodb.client";

jest.mock("../../src/repositories/dynamodb.client", () => ({
  dynamo: { send: jest.fn() },
  TABLE: "tablero-test",
}));

const mockSend = dynamo.send as jest.Mock;

const makeItem = (ibs: string, overrides = {}) => ({
  pk: `SPREAD_CLIENTE#${ibs}`, sk: "METADATA", tipo: "SPREAD_CLIENTE",
  codigoIbs: ibs, tipoPersoneria: "Persona Juridica",
  tipoDocumento: "RUC", nroDocumento: "20100055237",
  razonSocial: "ALICO", apellidoPaterno: "", apellidoMaterno: "", nombres: "",
  codigoBanca: "0004", descripcionBanca: "BANCA CORPORATIVA",
  spreadPips: 150, flagMotor: "ACTIVO",
  updatedAt: "2026-05-25T08:30:00Z", updatedBy: "ROBERT.GARCIA",
  gsi2pk: "SPREAD_CLIENTE", gsi2sk: ibs,
  ...overrides,
});

const item437 = makeItem("437");

describe("SpreadClienteRepository", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("buscar()", () => {
    it("retorna todos sin filtros sin campos internos", async () => {
      mockSend.mockResolvedValueOnce({ Items: [item437] });
      const r = await SpreadClienteRepository.buscar();
      expect(r[0].codigoIbs).toBe("437");
      expect(r[0]).not.toHaveProperty("pk");
      expect(r[0]).not.toHaveProperty("gsi2pk");
    });

    it("filtra por codigoIbs exacto", async () => {
      const item2 = makeItem("52291");
      mockSend.mockResolvedValueOnce({ Items: [item437, item2] });
      const r = await SpreadClienteRepository.buscar({ codigoIbs: "437" });
      expect(r).toHaveLength(1);
      expect(r[0].codigoIbs).toBe("437");
    });

    it("filtra por flagMotor", async () => {
      const itemInactivo = makeItem("999", { flagMotor: "INACTIVO" });
      mockSend.mockResolvedValueOnce({ Items: [item437, itemInactivo] });
      const r = await SpreadClienteRepository.buscar({ flagMotor: "ACTIVO" });
      expect(r).toHaveLength(1);
      expect(r[0].flagMotor).toBe("ACTIVO");
    });

    it("filtra por nombreCliente contains (case insensitive)", async () => {
      const itemPersona = makeItem("111", { apellidoPaterno: "GARCIA", nombres: "JUAN", razonSocial: "" });
      mockSend.mockResolvedValueOnce({ Items: [item437, itemPersona] });
      const r = await SpreadClienteRepository.buscar({ nombreCliente: "garcia" });
      expect(r).toHaveLength(1);
      expect(r[0].codigoIbs).toBe("111");
    });

    it("combina filtros como AND", async () => {
      const itemRUC = makeItem("222", { tipoDocumento: "RUC", flagMotor: "INACTIVO" });
      mockSend.mockResolvedValueOnce({ Items: [item437, itemRUC] });
      const r = await SpreadClienteRepository.buscar({ tipoDocumento: "RUC", flagMotor: "ACTIVO" });
      expect(r).toHaveLength(1);
      expect(r[0].codigoIbs).toBe("437");
    });

    it("retorna vacío sin items", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      expect(await SpreadClienteRepository.buscar()).toEqual([]);
    });

    it("usa FilterExpression tipo=SPREAD_CLIENTE", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      await SpreadClienteRepository.buscar();
      expect(mockSend.mock.calls[0][0].input.ExpressionAttributeValues[":tipo"]).toBe("SPREAD_CLIENTE");
    });
  });

  describe("obtenerPorCodigoIbs()", () => {
    it("retorna cliente mapeado", async () => {
      mockSend.mockResolvedValueOnce({ Item: item437 });
      const r = await SpreadClienteRepository.obtenerPorCodigoIbs("437");
      expect(r?.codigoIbs).toBe("437");
      expect(r).not.toHaveProperty("pk");
    });
    it("retorna null cuando no existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      expect(await SpreadClienteRepository.obtenerPorCodigoIbs("999")).toBeNull();
    });
    it("construye PK correctamente", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      await SpreadClienteRepository.obtenerPorCodigoIbs("437");
      expect(mockSend.mock.calls[0][0].input.Key.PK).toBe("SPREAD_CLIENTE#437");
    });
  });

  describe("crear()", () => {
    const dataCreate = {
      codigoIbs: "999", tipoPersoneria: "Persona Natural",
      tipoDocumento: "DNI", nroDocumento: "12345678",
      razonSocial: "", apellidoPaterno: "GARCIA",
      apellidoMaterno: "LOPEZ", nombres: "JUAN",
      codigoBanca: "0002", descripcionBanca: "BANCA PREMIUM",
      spreadPips: 150, flagMotor: "ACTIVO" as const,
    };

    it("retorna DUPLICADO si ya existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: item437 });
      const r = await SpreadClienteRepository.crear({ ...dataCreate, codigoIbs: "437" }, "SISTEMA");
      expect(r.error).toBe("DUPLICADO");
    });

    it("crea y retorna SpreadClienteResponse", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined }).mockResolvedValueOnce({});
      const r = await SpreadClienteRepository.crear(dataCreate, "ANA.TORRES");
      expect(r.data?.codigoIbs).toBe("999");
      expect(r.data?.updatedBy).toBe("ANA.TORRES");
    });

    it("PutCommand incluye gsi2pk y gsi2sk", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined }).mockResolvedValueOnce({});
      await SpreadClienteRepository.crear(dataCreate, "SISTEMA");
      const put = mockSend.mock.calls[1][0].input;
      expect(put.Item.gsi2pk).toBe("SPREAD_CLIENTE");
      expect(put.Item.gsi2sk).toBe("999");
    });

    it("PK es SPREAD_CLIENTE#999", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined }).mockResolvedValueOnce({});
      await SpreadClienteRepository.crear(dataCreate, "SISTEMA");
      expect(mockSend.mock.calls[1][0].input.Item.pk).toBe("SPREAD_CLIENTE#999");
    });
  });

  describe("actualizar()", () => {
    it("retorna null si no existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      expect(await SpreadClienteRepository.actualizar("999", "0003", "DESC", 200, "INACTIVO", "SISTEMA")).toBeNull();
    });

    it("actualiza codigoBanca, spreadPips y flagMotor", async () => {
      mockSend.mockResolvedValueOnce({ Item: item437 }).mockResolvedValueOnce({});
      const r = await SpreadClienteRepository.actualizar("437", "0003", "NUEVA DESC", 200, "INACTIVO", "ANA.TORRES");
      expect(r?.codigoBanca).toBe("0003");
      expect(r?.spreadPips).toBe(200);
      expect(r?.flagMotor).toBe("INACTIVO");
    });

    it("datos del cliente (nombre, doc) se preservan", async () => {
      mockSend.mockResolvedValueOnce({ Item: item437 }).mockResolvedValueOnce({});
      const r = await SpreadClienteRepository.actualizar("437", "0003", "DESC", 200, "INACTIVO", "SISTEMA");
      expect(r?.nroDocumento).toBe("20100055237");
      expect(r?.razonSocial).toBe("ALICO");
    });

    it("UpdateExpression contiene los 6 campos correctos", async () => {
      mockSend.mockResolvedValueOnce({ Item: item437 }).mockResolvedValueOnce({});
      await SpreadClienteRepository.actualizar("437", "0003", "DESC", 200, "INACTIVO", "SISTEMA");
      const u = mockSend.mock.calls[1][0].input.UpdateExpression;
      expect(u).toContain("codigoBanca");
      expect(u).toContain("spreadPips");
      expect(u).toContain("flagMotor");
      expect(u).toContain("updatedAt");
    });

    it("UpdateExpression NO contiene datos del cliente", async () => {
      mockSend.mockResolvedValueOnce({ Item: item437 }).mockResolvedValueOnce({});
      await SpreadClienteRepository.actualizar("437", "0003", "DESC", 200, "INACTIVO", "SISTEMA");
      const u = mockSend.mock.calls[1][0].input.UpdateExpression;
      expect(u).not.toContain("nroDocumento");
      expect(u).not.toContain("apellidoPaterno");
    });
  });

  describe("eliminar()", () => {
    it("retorna false si no existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      expect(await SpreadClienteRepository.eliminar("999")).toBe(false);
    });
    it("retorna true y llama DeleteCommand", async () => {
      mockSend.mockResolvedValueOnce({ Item: item437 }).mockResolvedValueOnce({});
      expect(await SpreadClienteRepository.eliminar("437")).toBe(true);
    });
    it("DeleteCommand PK=SPREAD_CLIENTE#437", async () => {
      mockSend.mockResolvedValueOnce({ Item: item437 }).mockResolvedValueOnce({});
      await SpreadClienteRepository.eliminar("437");
      expect(mockSend.mock.calls[1][0].input.Key.PK).toBe("SPREAD_CLIENTE#437");
    });
  });
});
```

---

## Task 7: tests/unit/spreadCliente.handler.test.ts
Crear con exactamente este contenido:

```typescript
import { APIGatewayProxyEvent } from "aws-lambda";
import {
  buscar, buscarIbs, crear, actualizar, eliminar,
} from "../../src/handlers/spreadCliente.handler";
import { SpreadClienteRepository } from "../../src/repositories/spreadCliente.repository";

jest.mock("../../src/repositories/spreadCliente.repository");
const mockRepo = SpreadClienteRepository as jest.Mocked<typeof SpreadClienteRepository>;

const mockEvent = (o: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent =>
  ({ pathParameters: null, body: null, requestContext: { authorizer: null } as any,
     headers: {}, multiValueHeaders: {}, httpMethod: "GET", isBase64Encoded: false,
     path: "/", queryStringParameters: null, multiValueQueryStringParameters: null,
     stageVariables: null, resource: "/", ...o } as APIGatewayProxyEvent);

const clienteItem = {
  codigoIbs: "437", tipoPersoneria: "Persona Juridica",
  tipoDocumento: "RUC", nroDocumento: "20100055237",
  razonSocial: "ALICO", apellidoPaterno: "", apellidoMaterno: "", nombres: "",
  codigoBanca: "0004", descripcionBanca: "BANCA CORPORATIVA",
  spreadPips: 150, flagMotor: "ACTIVO" as const,
  updatedAt: "2026-05-25T08:30:00Z", updatedBy: "ROBERT.GARCIA",
};

const bodyCrear = JSON.stringify({
  codigoIbs: "999", codigoBanca: "0002", spreadPips: 150, flagMotor: "ACTIVO",
});

const bodyActualizar = JSON.stringify({
  codigoBanca: "0003", descripcionBanca: "NUEVA", spreadPips: 200, flagMotor: "INACTIVO",
});

describe("spreadCliente.handler", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("buscar()", () => {
    it("retorna 200 con todos los clientes", async () => {
      mockRepo.buscar.mockResolvedValueOnce([clienteItem]);
      const res = await buscar(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(200);
      expect(JSON.parse(res!.body).total).toBe(1);
    });

    it("pasa filtros al repository", async () => {
      mockRepo.buscar.mockResolvedValueOnce([]);
      await buscar(mockEvent({ queryStringParameters: { flagMotor: "ACTIVO", tipoDocumento: "RUC" } }), {} as any, () => {});
      expect(mockRepo.buscar).toHaveBeenCalledWith(
        expect.objectContaining({ flagMotor: "ACTIVO", tipoDocumento: "RUC" })
      );
    });

    it("retorna 200 vacío", async () => {
      mockRepo.buscar.mockResolvedValueOnce([]);
      const res = await buscar(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(200);
      expect(JSON.parse(res!.body).total).toBe(0);
    });

    it("retorna 500 ante error", async () => {
      mockRepo.buscar.mockRejectedValueOnce(new Error("err"));
      const res = await buscar(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(500);
    });
  });

  describe("buscarIbs()", () => {
    it("retorna 200 con datos del cliente", async () => {
      mockRepo.obtenerPorCodigoIbs.mockResolvedValueOnce(clienteItem);
      const res = await buscarIbs(mockEvent({ pathParameters: { codigoIbs: "437" } }), {} as any, () => {});
      expect(res!.statusCode).toBe(200);
      expect(JSON.parse(res!.body).codigoIbs).toBe("437");
    });

    it("retorna 400 FX-MNT-060 sin codigoIbs", async () => {
      const res = await buscarIbs(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-060");
    });

    it("retorna 404 FX-MNT-062 no encontrado", async () => {
      mockRepo.obtenerPorCodigoIbs.mockResolvedValueOnce(null);
      const res = await buscarIbs(mockEvent({ pathParameters: { codigoIbs: "999" } }), {} as any, () => {});
      expect(res!.statusCode).toBe(404);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-062");
    });

    it("retorna 500 ante error", async () => {
      mockRepo.obtenerPorCodigoIbs.mockRejectedValueOnce(new Error("err"));
      const res = await buscarIbs(mockEvent({ pathParameters: { codigoIbs: "437" } }), {} as any, () => {});
      expect(res!.statusCode).toBe(500);
    });
  });

  describe("crear()", () => {
    it("retorna 201 con cliente creado", async () => {
      mockRepo.crear.mockResolvedValueOnce({ data: clienteItem });
      const res = await crear(mockEvent({ body: bodyCrear }), {} as any, () => {});
      expect(res!.statusCode).toBe(201);
    });

    it("retorna 409 FX-MNT-063 duplicado", async () => {
      mockRepo.crear.mockResolvedValueOnce({ error: "DUPLICADO" });
      const res = await crear(mockEvent({ body: bodyCrear }), {} as any, () => {});
      expect(res!.statusCode).toBe(409);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-063");
    });

    it("retorna 400 FX-MNT-061 codigoIbs ausente", async () => {
      const res = await crear(mockEvent({ body: JSON.stringify({ codigoBanca: "0002", spreadPips: 150, flagMotor: "ACTIVO" }) }), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-061");
    });

    it("retorna 400 FX-MNT-061 spreadPips negativo", async () => {
      const res = await crear(mockEvent({ body: JSON.stringify({ codigoIbs: "999", codigoBanca: "0002", spreadPips: -1, flagMotor: "ACTIVO" }) }), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-061");
    });

    it("retorna 400 FX-MNT-061 flagMotor inválido", async () => {
      const res = await crear(mockEvent({ body: JSON.stringify({ codigoIbs: "999", codigoBanca: "0002", spreadPips: 150, flagMotor: "OTRO" }) }), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-061");
    });

    it("retorna 500 ante error", async () => {
      mockRepo.crear.mockRejectedValueOnce(new Error("err"));
      const res = await crear(mockEvent({ body: bodyCrear }), {} as any, () => {});
      expect(res!.statusCode).toBe(500);
    });
  });

  describe("actualizar()", () => {
    it("retorna 200 actualizado", async () => {
      mockRepo.actualizar.mockResolvedValueOnce({ ...clienteItem, codigoBanca: "0003", spreadPips: 200 });
      const res = await actualizar(mockEvent({ pathParameters: { codigoIbs: "437" }, body: bodyActualizar }), {} as any, () => {});
      expect(res!.statusCode).toBe(200);
    });

    it("retorna 400 FX-MNT-060 sin codigoIbs", async () => {
      const res = await actualizar(mockEvent({ body: bodyActualizar }), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-060");
    });

    it("retorna 400 FX-MNT-061 spreadPips negativo", async () => {
      const res = await actualizar(mockEvent({ pathParameters: { codigoIbs: "437" }, body: JSON.stringify({ codigoBanca: "0003", spreadPips: -1, flagMotor: "ACTIVO" }) }), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-061");
    });

    it("retorna 400 FX-MNT-061 flagMotor inválido", async () => {
      const res = await actualizar(mockEvent({ pathParameters: { codigoIbs: "437" }, body: JSON.stringify({ codigoBanca: "0003", spreadPips: 150, flagMotor: "OTRO" }) }), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-061");
    });

    it("retorna 404 FX-MNT-063 no existe", async () => {
      mockRepo.actualizar.mockResolvedValueOnce(null);
      const res = await actualizar(mockEvent({ pathParameters: { codigoIbs: "999" }, body: bodyActualizar }), {} as any, () => {});
      expect(res!.statusCode).toBe(404);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-063");
    });

    it("retorna 500 ante error", async () => {
      mockRepo.actualizar.mockRejectedValueOnce(new Error("err"));
      const res = await actualizar(mockEvent({ pathParameters: { codigoIbs: "437" }, body: bodyActualizar }), {} as any, () => {});
      expect(res!.statusCode).toBe(500);
    });
  });

  describe("eliminar()", () => {
    it("retorna 204 al eliminar", async () => {
      mockRepo.eliminar.mockResolvedValueOnce(true);
      const res = await eliminar(mockEvent({ pathParameters: { codigoIbs: "437" } }), {} as any, () => {});
      expect(res!.statusCode).toBe(204);
    });

    it("retorna 400 FX-MNT-060 sin codigoIbs", async () => {
      const res = await eliminar(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-060");
    });

    it("retorna 404 FX-MNT-064 no existe", async () => {
      mockRepo.eliminar.mockResolvedValueOnce(false);
      const res = await eliminar(mockEvent({ pathParameters: { codigoIbs: "999" } }), {} as any, () => {});
      expect(res!.statusCode).toBe(404);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-064");
    });

    it("retorna 500 ante error", async () => {
      mockRepo.eliminar.mockRejectedValueOnce(new Error("err"));
      const res = await eliminar(mockEvent({ pathParameters: { codigoIbs: "437" } }), {} as any, () => {});
      expect(res!.statusCode).toBe(500);
    });
  });
});
```

---

## Task 8: Verificar serverless.yml
Agregar o descomentar estas 5 funciones:

```yaml
buscarSpreadCliente:
  handler: src/handlers/spreadCliente.handler.buscar
  events:
    - http:
        path: /parametros/spread-cliente
        method: GET
        cors: true

buscarClienteIbs:
  handler: src/handlers/spreadCliente.handler.buscarIbs
  events:
    - http:
        path: /parametros/spread-cliente/buscar-ibs/{codigoIbs}
        method: GET
        cors: true

crearSpreadCliente:
  handler: src/handlers/spreadCliente.handler.crear
  events:
    - http:
        path: /parametros/spread-cliente
        method: POST
        cors: true

actualizarSpreadCliente:
  handler: src/handlers/spreadCliente.handler.actualizar
  events:
    - http:
        path: /parametros/spread-cliente/{codigoIbs}
        method: PUT
        cors: true

eliminarSpreadCliente:
  handler: src/handlers/spreadCliente.handler.eliminar
  events:
    - http:
        path: /parametros/spread-cliente/{codigoIbs}
        method: DELETE
        cors: true
```

---

## Criterios de aceptación

```
□ npx tsc --noEmit                                    → 0 errores
□ npx jest tests/unit/spreadCliente                   → todos pasan
□ GET /parametros/spread-cliente                      → 200 con todos
□ GET ?flagMotor=ACTIVO&tipoDocumento=RUC              → 200 filtrado (AND)
□ GET ?nombreCliente=alico                            → 200 filtro por nombre
□ GET /buscar-ibs/437                                 → 200 con datos del cliente
□ GET /buscar-ibs/999                                 → 404 FX-MNT-062
□ POST nuevo cliente                                  → 201 creado
□ POST codigoIbs duplicado                            → 409 FX-MNT-063
□ POST spreadPips negativo                            → 400 FX-MNT-061
□ POST flagMotor inválido                             → 400 FX-MNT-061
□ PUT actualiza codigoBanca, spreadPips, flagMotor
□ PUT datos del cliente (nombre, doc) NO cambian
□ DELETE /437                                         → 204
□ DELETE no existe                                    → 404 FX-MNT-064
□ pk, sk, tipo, gsi2pk, gsi2sk nunca en response
```
