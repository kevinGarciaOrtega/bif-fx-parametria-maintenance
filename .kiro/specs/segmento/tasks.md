# Tasks — Variable Segmento

---

## Task 1: src/models/segmento.model.ts
Crear con exactamente este contenido:

```typescript
export type OrigenSegmento = "MANUAL" | "SYNC_IBS";

export interface Segmento {
  pk: string;
  sk: string;
  tipo: "SEGMENTO";
  codigoBanca: string;
  descripcionBanca: string;
  pips: number;
  origen: OrigenSegmento;
  updatedAt: string;
  updatedBy: string;
  gsi2pk: string;
  gsi2sk: string;
}

export interface SegmentoCreateRequest {
  descripcionBanca: string;
  pips?: number;
}

export interface SegmentoUpdateRequest {
  pips: number;
}

export interface SegmentoResponse {
  codigoBanca: string;
  descripcionBanca: string;
  pips: number;
  origen: OrigenSegmento;
  updatedAt: string;
  updatedBy: string;
}

export interface SegmentoCreateResult {
  data?: SegmentoResponse;
  error?: "DUPLICADO";
  descripcionExistente?: string;
}
```

---

## Task 2: src/validators/schemas.ts
Agregar al archivo existente (después de RangoImporteUpdateSchema):

```typescript
// ── SEGMENTO ─────────────────────────────────────────────────
export const SegmentoCreateSchema = z.object({
  descripcionBanca: z
    .string({ required_error: "descripcionBanca es requerida" })
    .min(1, "descripcionBanca no puede estar vacía"),
  pips: z
    .number({ invalid_type_error: "PIPs debe ser un número" })
    .int("PIPs debe ser un número entero")
    .min(0, "PIPs debe ser >= 0")
    .default(100),
});

export const SegmentoUpdateSchema = z.object({
  pips: z
    .number({ invalid_type_error: "PIPs debe ser un número" })
    .int("PIPs debe ser un número entero")
    .min(0, "PIPs debe ser >= 0"),
});

export type SegmentoCreateInput = z.infer<typeof SegmentoCreateSchema>;
export type SegmentoUpdateInput = z.infer<typeof SegmentoUpdateSchema>;
```

---

## Task 3: src/repositories/segmento.repository.ts
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
  Segmento,
  SegmentoCreateResult,
  SegmentoResponse,
} from "../models/segmento.model";

const mapToResponse = (item: Segmento): SegmentoResponse => ({
  codigoBanca: item.codigoBanca,
  descripcionBanca: item.descripcionBanca,
  pips: item.pips,
  origen: item.origen,
  updatedAt: item.updatedAt,
  updatedBy: item.updatedBy,
});

const calcularSiguienteCodigo = (segmentos: Segmento[]): string => {
  if (segmentos.length === 0) return "0001";
  const maxCodigo = Math.max(
    ...segmentos.map((s) => parseInt(s.codigoBanca, 10))
  );
  return String(maxCodigo + 1).padStart(4, "0");
};

export const SegmentoRepository = {

  async obtenerTodos(): Promise<Segmento[]> {
    const result = await dynamo.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "#tipo = :tipo",
        ExpressionAttributeNames: { "#tipo": "tipo" },
        ExpressionAttributeValues: { ":tipo": "SEGMENTO" },
      })
    );
    if (!result.Items || result.Items.length === 0) return [];
    return result.Items as Segmento[];
  },

  async buscar(descripcion?: string): Promise<SegmentoResponse[]> {
    const todos = await this.obtenerTodos();
    let filtrados = todos;

    if (descripcion && descripcion.trim() !== "") {
      const filtro = descripcion.toUpperCase();
      filtrados = todos.filter((s) =>
        s.descripcionBanca.toUpperCase().includes(filtro)
      );
    }

    return filtrados
      .sort((a, b) => a.codigoBanca.localeCompare(b.codigoBanca))
      .map(mapToResponse);
  },

  async obtenerPorCodigo(codigoBanca: string): Promise<SegmentoResponse | null> {
    const result = await dynamo.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `SEGMENTO#${codigoBanca}`, SK: "METADATA" },
      })
    );
    if (!result.Item) return null;
    return mapToResponse(result.Item as Segmento);
  },

  async crear(
    descripcionBanca: string,
    pips: number,
    usuario: string
  ): Promise<SegmentoCreateResult> {
    const todos = await this.obtenerTodos();
    const descripcionUpper = descripcionBanca.toUpperCase();

    // Verificar duplicado (case insensitive)
    const duplicado = todos.find(
      (s) => s.descripcionBanca.toUpperCase() === descripcionUpper
    );
    if (duplicado) {
      return { error: "DUPLICADO", descripcionExistente: duplicado.descripcionBanca };
    }

    const codigoBanca = calcularSiguienteCodigo(todos);
    const now = new Date().toISOString();

    const item: Segmento = {
      pk: `SEGMENTO#${codigoBanca}`,
      sk: "METADATA",
      tipo: "SEGMENTO",
      codigoBanca,
      descripcionBanca: descripcionUpper,
      pips,
      origen: "MANUAL",
      updatedAt: now,
      updatedBy: usuario,
      gsi2pk: "SEGMENTO",
      gsi2sk: descripcionUpper,
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    return { data: mapToResponse(item) };
  },

  async actualizar(
    codigoBanca: string,
    pips: number,
    usuario: string
  ): Promise<SegmentoResponse | null> {
    const existente = await this.obtenerPorCodigo(codigoBanca);
    if (!existente) return null;

    const now = new Date().toISOString();

    await dynamo.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `SEGMENTO#${codigoBanca}`, SK: "METADATA" },
        UpdateExpression:
          "SET pips = :pips, updatedAt = :updatedAt, updatedBy = :updatedBy",
        ExpressionAttributeValues: {
          ":pips": pips,
          ":updatedAt": now,
          ":updatedBy": usuario,
        },
      })
    );

    return { ...existente, pips, updatedAt: now, updatedBy: usuario };
  },

  async eliminar(codigoBanca: string): Promise<boolean> {
    const result = await dynamo.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `SEGMENTO#${codigoBanca}`, SK: "METADATA" },
      })
    );
    if (!result.Item) return false;

    await dynamo.send(
      new DeleteCommand({
        TableName: TABLE,
        Key: { PK: `SEGMENTO#${codigoBanca}`, SK: "METADATA" },
      })
    );
    return true;
  },
};
```

---

## Task 4: src/handlers/segmento.handler.ts
Crear con exactamente este contenido:

```typescript
import { APIGatewayProxyHandler } from "aws-lambda";
import { SegmentoRepository } from "../repositories/segmento.repository";
import { SegmentoCreateSchema, SegmentoUpdateSchema } from "../validators/schemas";
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

export const buscar: APIGatewayProxyHandler = async (event) => {
  try {
    const descripcion = event.queryStringParameters?.descripcion;
    const data = await SegmentoRepository.buscar(descripcion ?? undefined);
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
      return badRequest("FX-MNT-041", "Body inválido, se esperaba JSON");
    }

    const parsed = SegmentoCreateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("FX-MNT-041", parsed.error.errors[0].message);
    }

    const usuario = getUsuario(event);
    const result = await SegmentoRepository.crear(
      parsed.data.descripcionBanca,
      parsed.data.pips,
      usuario
    );

    if (result.error === "DUPLICADO") {
      return conflict(
        "FX-MNT-042",
        `El segmento ${result.descripcionExistente} ya existe`
      );
    }
    return created(result.data!);
  } catch (error) {
    return serverError(error);
  }
};

export const actualizar: APIGatewayProxyHandler = async (event) => {
  try {
    const codigoBanca = event.pathParameters?.codigoBanca;
    if (!codigoBanca) return badRequest("FX-MNT-040", "Código de banca requerido");

    let body: unknown;
    try {
      body = JSON.parse(event.body ?? "{}");
    } catch {
      return badRequest("FX-MNT-041", "Body inválido, se esperaba JSON");
    }

    const parsed = SegmentoUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("FX-MNT-041", parsed.error.errors[0].message);
    }

    const usuario = getUsuario(event);
    const result = await SegmentoRepository.actualizar(
      codigoBanca,
      parsed.data.pips,
      usuario
    );

    if (!result) {
      return notFound("FX-MNT-043", `Segmento ${codigoBanca} no encontrado`);
    }
    return ok(result);
  } catch (error) {
    return serverError(error);
  }
};

export const eliminar: APIGatewayProxyHandler = async (event) => {
  try {
    const codigoBanca = event.pathParameters?.codigoBanca;
    if (!codigoBanca) return badRequest("FX-MNT-040", "Código de banca requerido");

    const eliminado = await SegmentoRepository.eliminar(codigoBanca);
    if (!eliminado) {
      return notFound("FX-MNT-044", `Segmento ${codigoBanca} no encontrado`);
    }
    return noContent();
  } catch (error) {
    return serverError(error);
  }
};
```

---

## Task 5: tests/unit/segmento.validator.test.ts
Crear con exactamente este contenido:

```typescript
import { SegmentoCreateSchema, SegmentoUpdateSchema } from "../../src/validators/schemas";

describe("SegmentoCreateSchema", () => {

  describe("casos válidos", () => {
    it("acepta descripcionBanca y pips", () => {
      expect(SegmentoCreateSchema.safeParse({ descripcionBanca: "BANCA TEST", pips: 100 }).success).toBe(true);
    });
    it("pips por defecto = 100 si no se especifica", () => {
      const r = SegmentoCreateSchema.safeParse({ descripcionBanca: "BANCA TEST" });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.pips).toBe(100);
    });
    it("acepta pips = 0", () => {
      expect(SegmentoCreateSchema.safeParse({ descripcionBanca: "BANCA TEST", pips: 0 }).success).toBe(true);
    });
  });

  describe("validación descripcionBanca", () => {
    it("rechaza descripcionBanca vacía", () => {
      const r = SegmentoCreateSchema.safeParse({ descripcionBanca: "" });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("descripcionBanca no puede estar vacía");
    });
    it("rechaza descripcionBanca ausente", () => {
      const r = SegmentoCreateSchema.safeParse({});
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("descripcionBanca es requerida");
    });
    it("rechaza descripcionBanca null", () => {
      expect(SegmentoCreateSchema.safeParse({ descripcionBanca: null }).success).toBe(false);
    });
  });

  describe("validación pips", () => {
    it("rechaza pips negativo", () => {
      const r = SegmentoCreateSchema.safeParse({ descripcionBanca: "TEST", pips: -1 });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("PIPs debe ser >= 0");
    });
    it("rechaza pips decimal", () => {
      expect(SegmentoCreateSchema.safeParse({ descripcionBanca: "TEST", pips: 10.5 }).success).toBe(false);
    });
  });
});

describe("SegmentoUpdateSchema", () => {
  it("acepta pips válido", () => {
    expect(SegmentoUpdateSchema.safeParse({ pips: 200 }).success).toBe(true);
  });
  it("acepta pips = 0", () => {
    expect(SegmentoUpdateSchema.safeParse({ pips: 0 }).success).toBe(true);
  });
  it("rechaza pips negativo", () => {
    expect(SegmentoUpdateSchema.safeParse({ pips: -1 }).success).toBe(false);
  });
  it("rechaza pips decimal", () => {
    expect(SegmentoUpdateSchema.safeParse({ pips: 1.5 }).success).toBe(false);
  });
  it("rechaza pips ausente", () => {
    expect(SegmentoUpdateSchema.safeParse({}).success).toBe(false);
  });
});
```

---

## Task 6: tests/unit/segmento.repository.test.ts
Crear con exactamente este contenido:

```typescript
import { SegmentoRepository } from "../../src/repositories/segmento.repository";
import { dynamo } from "../../src/repositories/dynamodb.client";

jest.mock("../../src/repositories/dynamodb.client", () => ({
  dynamo: { send: jest.fn() },
  TABLE: "tablero-test",
}));

const mockSend = dynamo.send as jest.Mock;

const makeItem = (codigo: string, desc: string, pips = 100) => ({
  pk: `SEGMENTO#${codigo}`, sk: "METADATA", tipo: "SEGMENTO",
  codigoBanca: codigo, descripcionBanca: desc, pips,
  origen: "MANUAL", updatedAt: "2026-05-25T08:30:00Z", updatedBy: "ROBERT.GARCIA",
  gsi2pk: "SEGMENTO", gsi2sk: desc,
});

const item0001 = makeItem("0001", "DIVISION DE NEGOCIOS");
const item0002 = makeItem("0002", "BANCA PREMIUM", 150);

describe("SegmentoRepository", () => {

  beforeEach(() => jest.clearAllMocks());

  describe("buscar()", () => {
    it("retorna todos los segmentos sin filtro", async () => {
      mockSend.mockResolvedValueOnce({ Items: [item0001, item0002] });
      const r = await SegmentoRepository.buscar();
      expect(r).toHaveLength(2);
      expect(r[0]).not.toHaveProperty("pk");
      expect(r[0]).not.toHaveProperty("gsi2pk");
    });

    it("ordena por codigoBanca ASC", async () => {
      mockSend.mockResolvedValueOnce({ Items: [item0002, item0001] });
      const r = await SegmentoRepository.buscar();
      expect(r[0].codigoBanca).toBe("0001");
      expect(r[1].codigoBanca).toBe("0002");
    });

    it("filtra por descripcion case insensitive", async () => {
      mockSend.mockResolvedValueOnce({ Items: [item0001, item0002] });
      const r = await SegmentoRepository.buscar("banca");
      expect(r).toHaveLength(1);
      expect(r[0].codigoBanca).toBe("0002");
    });

    it("retorna vacío sin items", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      expect(await SegmentoRepository.buscar()).toEqual([]);
    });

    it("usa FilterExpression tipo=SEGMENTO", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      await SegmentoRepository.buscar();
      expect(mockSend.mock.calls[0][0].input.ExpressionAttributeValues[":tipo"]).toBe("SEGMENTO");
    });
  });

  describe("obtenerPorCodigo()", () => {
    it("retorna segmento mapeado sin pk/sk/tipo/gsi", async () => {
      mockSend.mockResolvedValueOnce({ Item: item0001 });
      const r = await SegmentoRepository.obtenerPorCodigo("0001");
      expect(r?.codigoBanca).toBe("0001");
      expect(r).not.toHaveProperty("pk");
      expect(r).not.toHaveProperty("gsi2pk");
    });
    it("retorna null cuando no existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      expect(await SegmentoRepository.obtenerPorCodigo("0099")).toBeNull();
    });
    it("construye PK SEGMENTO#0001", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      await SegmentoRepository.obtenerPorCodigo("0001");
      expect(mockSend.mock.calls[0][0].input.Key.PK).toBe("SEGMENTO#0001");
    });
  });

  describe("crear()", () => {
    it("primer segmento obtiene código 0001", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] }).mockResolvedValueOnce({});
      const r = await SegmentoRepository.crear("nueva banca", 100, "SISTEMA");
      expect(r.data?.codigoBanca).toBe("0001");
    });

    it("siguiente código es max + 1 formateado a 4 dígitos", async () => {
      mockSend.mockResolvedValueOnce({ Items: [item0001, item0002] }).mockResolvedValueOnce({});
      const r = await SegmentoRepository.crear("OTRA BANCA", 100, "SISTEMA");
      expect(r.data?.codigoBanca).toBe("0003");
    });

    it("guarda descripcionBanca en MAYÚSCULAS", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] }).mockResolvedValueOnce({});
      const r = await SegmentoRepository.crear("nueva banca", 100, "SISTEMA");
      expect(r.data?.descripcionBanca).toBe("NUEVA BANCA");
    });

    it("retorna DUPLICADO si descripcion ya existe (case insensitive)", async () => {
      mockSend.mockResolvedValueOnce({ Items: [item0001, item0002] });
      const r = await SegmentoRepository.crear("banca premium", 100, "SISTEMA");
      expect(r.error).toBe("DUPLICADO");
      expect(r.descripcionExistente).toBe("BANCA PREMIUM");
    });

    it("origen es MANUAL", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] }).mockResolvedValueOnce({});
      const r = await SegmentoRepository.crear("TEST", 100, "SISTEMA");
      expect(r.data?.origen).toBe("MANUAL");
    });

    it("PutCommand incluye gsi2pk y gsi2sk", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] }).mockResolvedValueOnce({});
      await SegmentoRepository.crear("TEST BANCA", 100, "SISTEMA");
      const putArg = mockSend.mock.calls[1][0].input;
      expect(putArg.Item.gsi2pk).toBe("SEGMENTO");
      expect(putArg.Item.gsi2sk).toBe("TEST BANCA");
    });
  });

  describe("actualizar()", () => {
    it("retorna null si no existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      expect(await SegmentoRepository.actualizar("0099", 200, "SISTEMA")).toBeNull();
    });

    it("UpdateExpression solo contiene pips, updatedAt, updatedBy", async () => {
      mockSend.mockResolvedValueOnce({ Item: item0001 }).mockResolvedValueOnce({});
      await SegmentoRepository.actualizar("0001", 200, "ANA.TORRES");
      const u = mockSend.mock.calls[1][0].input.UpdateExpression;
      expect(u).toContain("pips");
      expect(u).toContain("updatedAt");
      expect(u).toContain("updatedBy");
    });

    it("UpdateExpression NO contiene codigoBanca ni descripcionBanca", async () => {
      mockSend.mockResolvedValueOnce({ Item: item0001 }).mockResolvedValueOnce({});
      await SegmentoRepository.actualizar("0001", 200, "SISTEMA");
      const u = mockSend.mock.calls[1][0].input.UpdateExpression;
      expect(u).not.toContain("codigoBanca");
      expect(u).not.toContain("descripcionBanca");
    });

    it("retorna objeto con pips actualizado y descripcion original", async () => {
      mockSend.mockResolvedValueOnce({ Item: item0001 }).mockResolvedValueOnce({});
      const r = await SegmentoRepository.actualizar("0001", 200, "SISTEMA");
      expect(r?.pips).toBe(200);
      expect(r?.descripcionBanca).toBe("DIVISION DE NEGOCIOS");
    });
  });

  describe("eliminar()", () => {
    it("retorna false si no existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      expect(await SegmentoRepository.eliminar("0099")).toBe(false);
    });
    it("retorna true y llama DeleteCommand", async () => {
      mockSend.mockResolvedValueOnce({ Item: item0001 }).mockResolvedValueOnce({});
      expect(await SegmentoRepository.eliminar("0001")).toBe(true);
    });
    it("DeleteCommand PK=SEGMENTO#0001", async () => {
      mockSend.mockResolvedValueOnce({ Item: item0001 }).mockResolvedValueOnce({});
      await SegmentoRepository.eliminar("0001");
      expect(mockSend.mock.calls[1][0].input.Key.PK).toBe("SEGMENTO#0001");
    });
  });
});
```

---

## Task 7: tests/unit/segmento.handler.test.ts
Crear con exactamente este contenido:

```typescript
import { APIGatewayProxyEvent } from "aws-lambda";
import { buscar, crear, actualizar, eliminar } from "../../src/handlers/segmento.handler";
import { SegmentoRepository } from "../../src/repositories/segmento.repository";

jest.mock("../../src/repositories/segmento.repository");
const mockRepo = SegmentoRepository as jest.Mocked<typeof SegmentoRepository>;

const mockEvent = (o: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent =>
  ({ pathParameters: null, body: null, requestContext: { authorizer: null } as any,
     headers: {}, multiValueHeaders: {}, httpMethod: "GET", isBase64Encoded: false,
     path: "/", queryStringParameters: null, multiValueQueryStringParameters: null,
     stageVariables: null, resource: "/", ...o } as APIGatewayProxyEvent);

const segItem = {
  codigoBanca: "0001", descripcionBanca: "DIVISION DE NEGOCIOS",
  pips: 100, origen: "MANUAL" as const,
  updatedAt: "2026-05-25T08:30:00Z", updatedBy: "ROBERT.GARCIA",
};

describe("segmento.handler", () => {

  beforeEach(() => jest.clearAllMocks());

  describe("buscar()", () => {
    it("retorna 200 con todos los segmentos", async () => {
      mockRepo.buscar.mockResolvedValueOnce([segItem]);
      const res = await buscar(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(200);
      expect(JSON.parse(res!.body).total).toBe(1);
    });

    it("retorna 200 con filtro por descripcion", async () => {
      mockRepo.buscar.mockResolvedValueOnce([segItem]);
      const res = await buscar(mockEvent({ queryStringParameters: { descripcion: "DIVISION" } }), {} as any, () => {});
      expect(res!.statusCode).toBe(200);
      expect(mockRepo.buscar).toHaveBeenCalledWith("DIVISION");
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

  describe("crear()", () => {
    it("retorna 201 con segmento creado", async () => {
      mockRepo.crear.mockResolvedValueOnce({ data: { ...segItem, codigoBanca: "0009" } });
      const res = await crear(mockEvent({ body: JSON.stringify({ descripcionBanca: "NUEVA BANCA", pips: 150 }) }), {} as any, () => {});
      expect(res!.statusCode).toBe(201);
    });

    it("retorna 409 FX-MNT-042 duplicado", async () => {
      mockRepo.crear.mockResolvedValueOnce({ error: "DUPLICADO", descripcionExistente: "BANCA PREMIUM" });
      const res = await crear(mockEvent({ body: JSON.stringify({ descripcionBanca: "banca premium" }) }), {} as any, () => {});
      expect(res!.statusCode).toBe(409);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-042");
      expect(JSON.parse(res!.body).mensaje).toContain("BANCA PREMIUM");
    });

    it("retorna 400 FX-MNT-041 descripcionBanca vacía", async () => {
      const res = await crear(mockEvent({ body: JSON.stringify({ descripcionBanca: "" }) }), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-041");
    });

    it("retorna 400 FX-MNT-041 descripcionBanca ausente", async () => {
      const res = await crear(mockEvent({ body: "{}" }), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-041");
    });

    it("retorna 400 FX-MNT-041 pips negativo", async () => {
      const res = await crear(mockEvent({ body: JSON.stringify({ descripcionBanca: "TEST", pips: -1 }) }), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-041");
    });

    it("retorna 500 ante error", async () => {
      mockRepo.crear.mockRejectedValueOnce(new Error("err"));
      const res = await crear(mockEvent({ body: JSON.stringify({ descripcionBanca: "TEST" }) }), {} as any, () => {});
      expect(res!.statusCode).toBe(500);
    });
  });

  describe("actualizar()", () => {
    it("retorna 200 con pips actualizado", async () => {
      mockRepo.actualizar.mockResolvedValueOnce({ ...segItem, pips: 200 });
      const res = await actualizar(mockEvent({ pathParameters: { codigoBanca: "0001" }, body: JSON.stringify({ pips: 200 }) }), {} as any, () => {});
      expect(res!.statusCode).toBe(200);
      expect(JSON.parse(res!.body).pips).toBe(200);
    });

    it("retorna 400 FX-MNT-040 sin codigoBanca", async () => {
      const res = await actualizar(mockEvent({ body: JSON.stringify({ pips: 200 }) }), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-040");
    });

    it("retorna 400 FX-MNT-041 pips negativo", async () => {
      const res = await actualizar(mockEvent({ pathParameters: { codigoBanca: "0001" }, body: JSON.stringify({ pips: -1 }) }), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-041");
    });

    it("retorna 404 FX-MNT-043 no existe", async () => {
      mockRepo.actualizar.mockResolvedValueOnce(null);
      const res = await actualizar(mockEvent({ pathParameters: { codigoBanca: "0099" }, body: JSON.stringify({ pips: 200 }) }), {} as any, () => {});
      expect(res!.statusCode).toBe(404);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-043");
    });

    it("retorna 500 ante error", async () => {
      mockRepo.actualizar.mockRejectedValueOnce(new Error("err"));
      const res = await actualizar(mockEvent({ pathParameters: { codigoBanca: "0001" }, body: JSON.stringify({ pips: 200 }) }), {} as any, () => {});
      expect(res!.statusCode).toBe(500);
    });
  });

  describe("eliminar()", () => {
    it("retorna 204 al eliminar", async () => {
      mockRepo.eliminar.mockResolvedValueOnce(true);
      const res = await eliminar(mockEvent({ pathParameters: { codigoBanca: "0001" } }), {} as any, () => {});
      expect(res!.statusCode).toBe(204);
    });

    it("retorna 400 FX-MNT-040 sin codigoBanca", async () => {
      const res = await eliminar(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-040");
    });

    it("retorna 404 FX-MNT-044 no existe", async () => {
      mockRepo.eliminar.mockResolvedValueOnce(false);
      const res = await eliminar(mockEvent({ pathParameters: { codigoBanca: "0099" } }), {} as any, () => {});
      expect(res!.statusCode).toBe(404);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-044");
    });

    it("retorna 500 ante error", async () => {
      mockRepo.eliminar.mockRejectedValueOnce(new Error("err"));
      const res = await eliminar(mockEvent({ pathParameters: { codigoBanca: "0001" } }), {} as any, () => {});
      expect(res!.statusCode).toBe(500);
    });
  });
});
```

---

## Task 8: Verificar serverless.yml
Agregar o descomentar estas 4 funciones:

```yaml
buscarSegmento:
  handler: src/handlers/segmento.handler.buscar
  events:
    - http:
        path: /parametros/segmento
        method: GET
        cors: true

crearSegmento:
  handler: src/handlers/segmento.handler.crear
  events:
    - http:
        path: /parametros/segmento
        method: POST
        cors: true

actualizarSegmento:
  handler: src/handlers/segmento.handler.actualizar
  events:
    - http:
        path: /parametros/segmento/{codigoBanca}
        method: PUT
        cors: true

eliminarSegmento:
  handler: src/handlers/segmento.handler.eliminar
  events:
    - http:
        path: /parametros/segmento/{codigoBanca}
        method: DELETE
        cors: true
```

---

## Criterios de aceptación

```
□ npx tsc --noEmit                              → 0 errores
□ npx jest tests/unit/segmento                  → todos pasan
□ GET /parametros/segmento                      → 200 ordenado por codigoBanca ASC
□ GET /parametros/segmento?descripcion=BANCA    → 200 filtrado
□ POST nuevo segmento                           → 201 con codigoBanca auto + MAYÚSCULAS
□ POST descripcion duplicada                    → 409 FX-MNT-042
□ POST descripcionBanca vacía                   → 400 FX-MNT-041
□ PUT /parametros/segmento/0001                 → 200 pips actualizado
□ PUT codigoBanca y descripcionBanca NO cambian
□ DELETE /parametros/segmento/0001              → 204
□ DELETE no existe                              → 404 FX-MNT-044
□ pk, sk, tipo, gsi2pk, gsi2sk nunca en response
```
