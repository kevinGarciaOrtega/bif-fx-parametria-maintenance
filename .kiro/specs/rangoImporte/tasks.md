# Tasks — Variable Rango de Importe PN y PJ

---

## Task 1: src/models/rangoImporte.model.ts
Crear con exactamente este contenido:

```typescript
export type TipoPersoneria = "PN" | "PJ";

export interface RangoImporte {
  pk: string;
  sk: string;
  tipo: "RANGO_PN" | "RANGO_PJ";
  id: string;
  tipoPersoneria: TipoPersoneria;
  importeMinimo: number;
  importeMaximo: number;
  pips: number;
  updatedAt: string;
  updatedBy: string;
}

export interface RangoImporteCreateRequest {
  importeMaximo: number;
  pips: number;
}

export interface RangoImporteUpdateRequest {
  importeMaximo: number;
  pips: number;
}

export interface RangoImporteResponse {
  id: string;
  tipoPersoneria: TipoPersoneria;
  importeMinimo: number;
  importeMaximo: number;
  pips: number;
  updatedAt: string;
  updatedBy: string;
}

export interface RangoImporteCreateResult {
  data?: RangoImporteResponse;
  error?: "IMPORTE_INVALIDO";
  importeMinimoActual?: number;
}
```

---

## Task 2: src/validators/schemas.ts
Agregar al archivo existente (después de FeriadoCreateSchema):

```typescript
// ── RANGO IMPORTE ───────────────────────────────────────────
export const RangoImporteCreateSchema = z.object({
  importeMaximo: z
    .number({ invalid_type_error: "Importe máximo debe ser un número" })
    .positive("Importe máximo debe ser > 0"),
  pips: z
    .number({ invalid_type_error: "PIPs debe ser un número" })
    .int("PIPs debe ser un número entero")
    .min(0, "PIPs debe ser >= 0"),
});

export const RangoImporteUpdateSchema = z.object({
  importeMaximo: z
    .number({ invalid_type_error: "Importe máximo debe ser un número" })
    .positive("Importe máximo debe ser > 0"),
  pips: z
    .number({ invalid_type_error: "PIPs debe ser un número" })
    .int("PIPs debe ser un número entero")
    .min(0, "PIPs debe ser >= 0"),
});

export type RangoImporteCreateInput = z.infer<typeof RangoImporteCreateSchema>;
export type RangoImporteUpdateInput = z.infer<typeof RangoImporteUpdateSchema>;
```

---

## Task 3: src/repositories/rangoImporte.repository.ts
Crear con exactamente este contenido:

```typescript
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { dynamo, TABLE } from "./dynamodb.client";
import {
  RangoImporte,
  RangoImporteCreateResult,
  RangoImporteResponse,
  TipoPersoneria,
} from "../models/rangoImporte.model";

const tipoKey = (tp: TipoPersoneria): "RANGO_PN" | "RANGO_PJ" =>
  tp === "PN" ? "RANGO_PN" : "RANGO_PJ";

const mapToResponse = (item: RangoImporte): RangoImporteResponse => ({
  id: item.id,
  tipoPersoneria: item.tipoPersoneria,
  importeMinimo: item.importeMinimo,
  importeMaximo: item.importeMaximo,
  pips: item.pips,
  updatedAt: item.updatedAt,
  updatedBy: item.updatedBy,
});

export const RangoImporteRepository = {

  async listar(tipoPersoneria: TipoPersoneria): Promise<RangoImporteResponse[]> {
    const tipo = tipoKey(tipoPersoneria);
    const result = await dynamo.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "#tipo = :tipo",
        ExpressionAttributeNames: { "#tipo": "tipo" },
        ExpressionAttributeValues: { ":tipo": tipo },
      })
    );
    if (!result.Items || result.Items.length === 0) return [];
    return (result.Items as RangoImporte[])
      .sort((a, b) => a.importeMinimo - b.importeMinimo)
      .map(mapToResponse);
  },

  async obtenerTodos(tipoPersoneria: TipoPersoneria): Promise<RangoImporte[]> {
    const tipo = tipoKey(tipoPersoneria);
    const result = await dynamo.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "#tipo = :tipo",
        ExpressionAttributeNames: { "#tipo": "tipo" },
        ExpressionAttributeValues: { ":tipo": tipo },
      })
    );
    if (!result.Items || result.Items.length === 0) return [];
    return result.Items as RangoImporte[];
  },

  async obtenerPorId(
    tipoPersoneria: TipoPersoneria,
    id: string
  ): Promise<RangoImporteResponse | null> {
    const tipo = tipoKey(tipoPersoneria);
    const result = await dynamo.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `${tipo}#${id}`, SK: "METADATA" },
      })
    );
    if (!result.Item) return null;
    return mapToResponse(result.Item as RangoImporte);
  },

  async crear(
    tipoPersoneria: TipoPersoneria,
    importeMaximo: number,
    pips: number,
    usuario: string
  ): Promise<RangoImporteCreateResult> {
    // Obtener último rango para calcular importeMinimo
    const todos = await this.obtenerTodos(tipoPersoneria);
    const importeMinimo =
      todos.length > 0
        ? Math.max(...todos.map((r) => r.importeMaximo))
        : 0;

    // Validar que importeMaximo > importeMinimo
    if (importeMaximo <= importeMinimo) {
      return { error: "IMPORTE_INVALIDO", importeMinimoActual: importeMinimo };
    }

    const tipo = tipoKey(tipoPersoneria);
    const id = uuidv4().replace(/-/g, "").substring(0, 8);
    const now = new Date().toISOString();

    const item: RangoImporte = {
      pk: `${tipo}#${id}`,
      sk: "METADATA",
      tipo,
      id,
      tipoPersoneria,
      importeMinimo,
      importeMaximo,
      pips,
      updatedAt: now,
      updatedBy: usuario,
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    return { data: mapToResponse(item) };
  },

  async actualizar(
    tipoPersoneria: TipoPersoneria,
    id: string,
    importeMaximo: number,
    pips: number,
    usuario: string
  ): Promise<RangoImporteResponse | null> {
    const existente = await this.obtenerPorId(tipoPersoneria, id);
    if (!existente) return null;

    const tipo = tipoKey(tipoPersoneria);
    const now = new Date().toISOString();

    await dynamo.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `${tipo}#${id}`, SK: "METADATA" },
        UpdateExpression:
          "SET importeMaximo = :importeMaximo, pips = :pips, updatedAt = :updatedAt, updatedBy = :updatedBy",
        ExpressionAttributeValues: {
          ":importeMaximo": importeMaximo,
          ":pips": pips,
          ":updatedAt": now,
          ":updatedBy": usuario,
        },
      })
    );

    return { ...existente, importeMaximo, pips, updatedAt: now, updatedBy: usuario };
  },

  async eliminar(tipoPersoneria: TipoPersoneria, id: string): Promise<boolean> {
    const tipo = tipoKey(tipoPersoneria);
    const result = await dynamo.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `${tipo}#${id}`, SK: "METADATA" },
      })
    );
    if (!result.Item) return false;

    await dynamo.send(
      new DeleteCommand({
        TableName: TABLE,
        Key: { PK: `${tipo}#${id}`, SK: "METADATA" },
      })
    );
    return true;
  },
};
```

---

## Task 4: src/handlers/rangoImporte.handler.ts
Crear con exactamente este contenido:

```typescript
import { APIGatewayProxyHandler } from "aws-lambda";
import { RangoImporteRepository } from "../repositories/rangoImporte.repository";
import {
  RangoImporteCreateSchema,
  RangoImporteUpdateSchema,
} from "../validators/schemas";
import {
  ok,
  created,
  noContent,
  badRequest,
  notFound,
  serverError,
} from "../utils/response.util";
import { getUsuario } from "../utils/audit.util";

// ── HELPERS ───────────────────────────────────────────────────
const parseBody = (body: string | null) => {
  try {
    return { parsed: JSON.parse(body ?? "{}"), error: null };
  } catch {
    return { parsed: null, error: "Body inválido, se esperaba JSON" };
  }
};

// ── PN — LISTAR ───────────────────────────────────────────────
export const listarPN: APIGatewayProxyHandler = async () => {
  try {
    const data = await RangoImporteRepository.listar("PN");
    return ok({ tipoPersoneria: "PN", data, total: data.length });
  } catch (error) {
    return serverError(error);
  }
};

// ── PN — CREAR ────────────────────────────────────────────────
export const crearPN: APIGatewayProxyHandler = async (event) => {
  try {
    const { parsed, error } = parseBody(event.body);
    if (error) return badRequest("FX-MNT-032", error);

    const parsed_val = RangoImporteCreateSchema.safeParse(parsed);
    if (!parsed_val.success) {
      return badRequest("FX-MNT-032", parsed_val.error.errors[0].message);
    }

    const usuario = getUsuario(event);
    const result = await RangoImporteRepository.crear(
      "PN",
      parsed_val.data.importeMaximo,
      parsed_val.data.pips,
      usuario
    );

    if (result.error === "IMPORTE_INVALIDO") {
      return badRequest(
        "FX-MNT-032",
        `Importe máximo debe ser mayor al importe mínimo (${result.importeMinimoActual})`
      );
    }
    return created(result.data!);
  } catch (error) {
    return serverError(error);
  }
};

// ── PN — ACTUALIZAR ───────────────────────────────────────────
export const actualizarPN: APIGatewayProxyHandler = async (event) => {
  try {
    const id = event.pathParameters?.id;
    if (!id) return badRequest("FX-MNT-031", "ID requerido");

    const { parsed, error } = parseBody(event.body);
    if (error) return badRequest("FX-MNT-032", error);

    const parsed_val = RangoImporteUpdateSchema.safeParse(parsed);
    if (!parsed_val.success) {
      return badRequest("FX-MNT-032", parsed_val.error.errors[0].message);
    }

    const usuario = getUsuario(event);
    const result = await RangoImporteRepository.actualizar(
      "PN",
      id,
      parsed_val.data.importeMaximo,
      parsed_val.data.pips,
      usuario
    );

    if (!result) return notFound("FX-MNT-033", `Rango PN ${id} no encontrado`);
    return ok(result);
  } catch (error) {
    return serverError(error);
  }
};

// ── PN — ELIMINAR ─────────────────────────────────────────────
export const eliminarPN: APIGatewayProxyHandler = async (event) => {
  try {
    const id = event.pathParameters?.id;
    if (!id) return badRequest("FX-MNT-031", "ID requerido");

    const eliminado = await RangoImporteRepository.eliminar("PN", id);
    if (!eliminado) return notFound("FX-MNT-034", `Rango PN ${id} no encontrado`);
    return noContent();
  } catch (error) {
    return serverError(error);
  }
};

// ── PJ — LISTAR ───────────────────────────────────────────────
export const listarPJ: APIGatewayProxyHandler = async () => {
  try {
    const data = await RangoImporteRepository.listar("PJ");
    return ok({ tipoPersoneria: "PJ", data, total: data.length });
  } catch (error) {
    return serverError(error);
  }
};

// ── PJ — CREAR ────────────────────────────────────────────────
export const crearPJ: APIGatewayProxyHandler = async (event) => {
  try {
    const { parsed, error } = parseBody(event.body);
    if (error) return badRequest("FX-MNT-032", error);

    const parsed_val = RangoImporteCreateSchema.safeParse(parsed);
    if (!parsed_val.success) {
      return badRequest("FX-MNT-032", parsed_val.error.errors[0].message);
    }

    const usuario = getUsuario(event);
    const result = await RangoImporteRepository.crear(
      "PJ",
      parsed_val.data.importeMaximo,
      parsed_val.data.pips,
      usuario
    );

    if (result.error === "IMPORTE_INVALIDO") {
      return badRequest(
        "FX-MNT-032",
        `Importe máximo debe ser mayor al importe mínimo (${result.importeMinimoActual})`
      );
    }
    return created(result.data!);
  } catch (error) {
    return serverError(error);
  }
};

// ── PJ — ACTUALIZAR ───────────────────────────────────────────
export const actualizarPJ: APIGatewayProxyHandler = async (event) => {
  try {
    const id = event.pathParameters?.id;
    if (!id) return badRequest("FX-MNT-031", "ID requerido");

    const { parsed, error } = parseBody(event.body);
    if (error) return badRequest("FX-MNT-032", error);

    const parsed_val = RangoImporteUpdateSchema.safeParse(parsed);
    if (!parsed_val.success) {
      return badRequest("FX-MNT-032", parsed_val.error.errors[0].message);
    }

    const usuario = getUsuario(event);
    const result = await RangoImporteRepository.actualizar(
      "PJ",
      id,
      parsed_val.data.importeMaximo,
      parsed_val.data.pips,
      usuario
    );

    if (!result) return notFound("FX-MNT-033", `Rango PJ ${id} no encontrado`);
    return ok(result);
  } catch (error) {
    return serverError(error);
  }
};

// ── PJ — ELIMINAR ─────────────────────────────────────────────
export const eliminarPJ: APIGatewayProxyHandler = async (event) => {
  try {
    const id = event.pathParameters?.id;
    if (!id) return badRequest("FX-MNT-031", "ID requerido");

    const eliminado = await RangoImporteRepository.eliminar("PJ", id);
    if (!eliminado) return notFound("FX-MNT-034", `Rango PJ ${id} no encontrado`);
    return noContent();
  } catch (error) {
    return serverError(error);
  }
};
```

---

## Task 5: tests/unit/rangoImporte.validator.test.ts
Crear con exactamente este contenido:

```typescript
import {
  RangoImporteCreateSchema,
  RangoImporteUpdateSchema,
} from "../../src/validators/schemas";

describe("RangoImporteCreateSchema", () => {

  describe("casos válidos", () => {
    it("acepta importeMaximo positivo y pips=0", () => {
      expect(RangoImporteCreateSchema.safeParse({ importeMaximo: 500, pips: 0 }).success).toBe(true);
    });
    it("acepta importeMaximo decimal", () => {
      expect(RangoImporteCreateSchema.safeParse({ importeMaximo: 500.50, pips: 100 }).success).toBe(true);
    });
  });

  describe("validación importeMaximo", () => {
    it("rechaza importeMaximo negativo", () => {
      const r = RangoImporteCreateSchema.safeParse({ importeMaximo: -1, pips: 100 });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("Importe máximo debe ser > 0");
    });
    it("rechaza importeMaximo = 0", () => {
      expect(RangoImporteCreateSchema.safeParse({ importeMaximo: 0, pips: 100 }).success).toBe(false);
    });
    it("rechaza importeMaximo como string", () => {
      const r = RangoImporteCreateSchema.safeParse({ importeMaximo: "500", pips: 100 });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("Importe máximo debe ser un número");
    });
    it("rechaza importeMaximo ausente", () => {
      expect(RangoImporteCreateSchema.safeParse({ pips: 100 }).success).toBe(false);
    });
  });

  describe("validación pips", () => {
    it("rechaza pips negativo", () => {
      const r = RangoImporteCreateSchema.safeParse({ importeMaximo: 500, pips: -1 });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("PIPs debe ser >= 0");
    });
    it("rechaza pips decimal", () => {
      expect(RangoImporteCreateSchema.safeParse({ importeMaximo: 500, pips: 10.5 }).success).toBe(false);
    });
    it("rechaza pips ausente", () => {
      expect(RangoImporteCreateSchema.safeParse({ importeMaximo: 500 }).success).toBe(false);
    });
  });

  describe("body inválido", () => {
    it("rechaza body vacío", () => {
      expect(RangoImporteCreateSchema.safeParse({}).success).toBe(false);
    });
  });
});

describe("RangoImporteUpdateSchema", () => {
  it("acepta importeMaximo y pips válidos", () => {
    expect(RangoImporteUpdateSchema.safeParse({ importeMaximo: 2000, pips: 75 }).success).toBe(true);
  });
  it("rechaza importeMaximo negativo", () => {
    expect(RangoImporteUpdateSchema.safeParse({ importeMaximo: -1, pips: 75 }).success).toBe(false);
  });
  it("rechaza pips decimal", () => {
    expect(RangoImporteUpdateSchema.safeParse({ importeMaximo: 2000, pips: 1.5 }).success).toBe(false);
  });
});
```

---

## Task 6: tests/unit/rangoImporte.repository.test.ts
Crear con exactamente este contenido:

```typescript
import { RangoImporteRepository } from "../../src/repositories/rangoImporte.repository";
import { dynamo } from "../../src/repositories/dynamodb.client";

jest.mock("../../src/repositories/dynamodb.client", () => ({
  dynamo: { send: jest.fn() },
  TABLE: "tablero-test",
}));

const mockSend = dynamo.send as jest.Mock;

const itemPN = {
  pk: "RANGO_PN#001", sk: "METADATA", tipo: "RANGO_PN",
  id: "001", tipoPersoneria: "PN",
  importeMinimo: 0, importeMaximo: 500, pips: 100,
  updatedAt: "2026-05-25T08:30:00Z", updatedBy: "ROBERT.GARCIA",
};

const responsePN = {
  id: "001", tipoPersoneria: "PN",
  importeMinimo: 0, importeMaximo: 500, pips: 100,
  updatedAt: "2026-05-25T08:30:00Z", updatedBy: "ROBERT.GARCIA",
};

describe("RangoImporteRepository", () => {

  beforeEach(() => jest.clearAllMocks());

  describe("listar()", () => {
    it("retorna lista mapeada sin pk, sk, tipo", async () => {
      mockSend.mockResolvedValueOnce({ Items: [itemPN] });
      const result = await RangoImporteRepository.listar("PN");
      expect(result[0]).toEqual(responsePN);
      expect(result[0]).not.toHaveProperty("pk");
      expect(result[0]).not.toHaveProperty("sk");
      expect(result[0]).not.toHaveProperty("tipo");
    });

    it("retorna lista ordenada por importeMinimo ASC", async () => {
      const item2 = { ...itemPN, pk: "RANGO_PN#002", id: "002", importeMinimo: 500, importeMaximo: 1500 };
      mockSend.mockResolvedValueOnce({ Items: [item2, itemPN] });
      const result = await RangoImporteRepository.listar("PN");
      expect(result[0].importeMinimo).toBe(0);
      expect(result[1].importeMinimo).toBe(500);
    });

    it("retorna array vacío sin items", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      expect(await RangoImporteRepository.listar("PN")).toEqual([]);
    });

    it("usa FilterExpression tipo=RANGO_PN para PN", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      await RangoImporteRepository.listar("PN");
      expect(mockSend.mock.calls[0][0].input.ExpressionAttributeValues[":tipo"]).toBe("RANGO_PN");
    });

    it("usa FilterExpression tipo=RANGO_PJ para PJ", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      await RangoImporteRepository.listar("PJ");
      expect(mockSend.mock.calls[0][0].input.ExpressionAttributeValues[":tipo"]).toBe("RANGO_PJ");
    });
  });

  describe("crear()", () => {
    it("importeMinimo = 0 cuando no hay rangos previos", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] }) // obtenerTodos
               .mockResolvedValueOnce({});           // PutCommand
      const result = await RangoImporteRepository.crear("PN", 500, 100, "SISTEMA");
      expect(result.data?.importeMinimo).toBe(0);
      expect(result.data?.importeMaximo).toBe(500);
    });

    it("importeMinimo = max(importeMaximo) de rangos existentes", async () => {
      mockSend.mockResolvedValueOnce({ Items: [itemPN] }) // obtenerTodos → max=500
               .mockResolvedValueOnce({});               // PutCommand
      const result = await RangoImporteRepository.crear("PN", 1500, 80, "ANA.TORRES");
      expect(result.data?.importeMinimo).toBe(500);
      expect(result.data?.importeMaximo).toBe(1500);
    });

    it("retorna error IMPORTE_INVALIDO cuando importeMaximo <= importeMinimo", async () => {
      mockSend.mockResolvedValueOnce({ Items: [itemPN] }); // max existente = 500
      const result = await RangoImporteRepository.crear("PN", 400, 100, "SISTEMA");
      expect(result.error).toBe("IMPORTE_INVALIDO");
      expect(result.importeMinimoActual).toBe(500);
    });

    it("retorna error IMPORTE_INVALIDO cuando importeMaximo = importeMinimo", async () => {
      mockSend.mockResolvedValueOnce({ Items: [itemPN] }); // max = 500
      const result = await RangoImporteRepository.crear("PN", 500, 100, "SISTEMA");
      expect(result.error).toBe("IMPORTE_INVALIDO");
    });

    it("PK del PutCommand es RANGO_PN#<id>", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] }).mockResolvedValueOnce({});
      await RangoImporteRepository.crear("PN", 500, 100, "SISTEMA");
      const putArg = mockSend.mock.calls[1][0].input;
      expect(putArg.Item.pk).toMatch(/^RANGO_PN#/);
      expect(putArg.Item.sk).toBe("METADATA");
    });
  });

  describe("obtenerPorId()", () => {
    it("retorna respuesta mapeada cuando existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: itemPN });
      expect(await RangoImporteRepository.obtenerPorId("PN", "001")).toEqual(responsePN);
    });

    it("retorna null cuando no existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      expect(await RangoImporteRepository.obtenerPorId("PN", "999")).toBeNull();
    });

    it("construye PK RANGO_PN#001", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      await RangoImporteRepository.obtenerPorId("PN", "001");
      expect(mockSend.mock.calls[0][0].input.Key.PK).toBe("RANGO_PN#001");
    });
  });

  describe("actualizar()", () => {
    it("retorna null si no existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      expect(await RangoImporteRepository.actualizar("PN", "999", 2000, 75, "SISTEMA")).toBeNull();
    });

    it("UpdateExpression contiene importeMaximo, pips, updatedAt, updatedBy", async () => {
      mockSend.mockResolvedValueOnce({ Item: itemPN }).mockResolvedValueOnce({});
      await RangoImporteRepository.actualizar("PN", "001", 2000, 75, "ANA.TORRES");
      const u = mockSend.mock.calls[1][0].input.UpdateExpression;
      expect(u).toContain("importeMaximo");
      expect(u).toContain("pips");
      expect(u).toContain("updatedAt");
      expect(u).toContain("updatedBy");
    });

    it("UpdateExpression NO contiene importeMinimo", async () => {
      mockSend.mockResolvedValueOnce({ Item: itemPN }).mockResolvedValueOnce({});
      await RangoImporteRepository.actualizar("PN", "001", 2000, 75, "SISTEMA");
      expect(mockSend.mock.calls[1][0].input.UpdateExpression).not.toContain("importeMinimo");
    });

    it("retorna objeto con nuevos valores e importeMinimo original", async () => {
      mockSend.mockResolvedValueOnce({ Item: itemPN }).mockResolvedValueOnce({});
      const result = await RangoImporteRepository.actualizar("PN", "001", 2000, 75, "SISTEMA");
      expect(result?.importeMaximo).toBe(2000);
      expect(result?.pips).toBe(75);
      expect(result?.importeMinimo).toBe(0);
    });
  });

  describe("eliminar()", () => {
    it("retorna false si no existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      expect(await RangoImporteRepository.eliminar("PN", "999")).toBe(false);
    });

    it("retorna true y llama DeleteCommand cuando existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: itemPN }).mockResolvedValueOnce({});
      expect(await RangoImporteRepository.eliminar("PN", "001")).toBe(true);
    });

    it("DeleteCommand usa PK=RANGO_PN#001", async () => {
      mockSend.mockResolvedValueOnce({ Item: itemPN }).mockResolvedValueOnce({});
      await RangoImporteRepository.eliminar("PN", "001");
      expect(mockSend.mock.calls[1][0].input.Key.PK).toBe("RANGO_PN#001");
    });
  });
});
```

---

## Task 7: tests/unit/rangoImporte.handler.test.ts
Crear con exactamente este contenido:

```typescript
import { APIGatewayProxyEvent } from "aws-lambda";
import {
  listarPN, crearPN, actualizarPN, eliminarPN,
  listarPJ, crearPJ, actualizarPJ, eliminarPJ,
} from "../../src/handlers/rangoImporte.handler";
import { RangoImporteRepository } from "../../src/repositories/rangoImporte.repository";

jest.mock("../../src/repositories/rangoImporte.repository");
const mockRepo = RangoImporteRepository as jest.Mocked<typeof RangoImporteRepository>;

const mockEvent = (o: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent =>
  ({ pathParameters: null, body: null, requestContext: { authorizer: null } as any,
     headers: {}, multiValueHeaders: {}, httpMethod: "GET", isBase64Encoded: false,
     path: "/", queryStringParameters: null, multiValueQueryStringParameters: null,
     stageVariables: null, resource: "/", ...o } as APIGatewayProxyEvent);

const itemPN = {
  id: "001", tipoPersoneria: "PN" as const,
  importeMinimo: 0, importeMaximo: 500, pips: 100,
  updatedAt: "2026-05-25T08:30:00Z", updatedBy: "ROBERT.GARCIA",
};

const bodyCrear = JSON.stringify({ importeMaximo: 1500, pips: 80 });
const bodyActualizar = JSON.stringify({ importeMaximo: 2000, pips: 75 });

describe("rangoImporte.handler", () => {

  beforeEach(() => jest.clearAllMocks());

  // ── PN LISTAR ─────────────────────────────────────────────
  describe("listarPN()", () => {
    it("retorna 200 con tipoPersoneria PN, data y total", async () => {
      mockRepo.listar.mockResolvedValueOnce([itemPN]);
      const res = await listarPN(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(200);
      const b = JSON.parse(res!.body);
      expect(b.tipoPersoneria).toBe("PN");
      expect(b.total).toBe(1);
    });

    it("retorna 200 vacío", async () => {
      mockRepo.listar.mockResolvedValueOnce([]);
      const res = await listarPN(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(200);
      expect(JSON.parse(res!.body).total).toBe(0);
    });

    it("retorna 500 ante error", async () => {
      mockRepo.listar.mockRejectedValueOnce(new Error("err"));
      const res = await listarPN(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(500);
    });
  });

  // ── PN CREAR ──────────────────────────────────────────────
  describe("crearPN()", () => {
    it("retorna 201 con rango creado", async () => {
      mockRepo.crear.mockResolvedValueOnce({ data: { ...itemPN, importeMinimo: 500, importeMaximo: 1500 } });
      const res = await crearPN(mockEvent({ body: bodyCrear }), {} as any, () => {});
      expect(res!.statusCode).toBe(201);
      expect(JSON.parse(res!.body).importeMaximo).toBe(1500);
    });

    it("retorna 400 FX-MNT-032 importeMaximo <= importeMinimo", async () => {
      mockRepo.crear.mockResolvedValueOnce({ error: "IMPORTE_INVALIDO", importeMinimoActual: 500 });
      const res = await crearPN(mockEvent({ body: bodyCrear }), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-032");
      expect(JSON.parse(res!.body).mensaje).toContain("500");
    });

    it("retorna 400 FX-MNT-032 importeMaximo negativo", async () => {
      const res = await crearPN(mockEvent({ body: JSON.stringify({ importeMaximo: -1, pips: 100 }) }), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-032");
    });

    it("retorna 400 FX-MNT-032 pips negativo", async () => {
      const res = await crearPN(mockEvent({ body: JSON.stringify({ importeMaximo: 500, pips: -1 }) }), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-032");
    });

    it("retorna 400 body vacío", async () => {
      const res = await crearPN(mockEvent({ body: "{}" }), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
    });

    it("retorna 500 ante error", async () => {
      mockRepo.crear.mockRejectedValueOnce(new Error("err"));
      const res = await crearPN(mockEvent({ body: bodyCrear }), {} as any, () => {});
      expect(res!.statusCode).toBe(500);
    });
  });

  // ── PN ACTUALIZAR ─────────────────────────────────────────
  describe("actualizarPN()", () => {
    it("retorna 200 con datos actualizados", async () => {
      mockRepo.actualizar.mockResolvedValueOnce({ ...itemPN, importeMaximo: 2000, pips: 75 });
      const res = await actualizarPN(mockEvent({ pathParameters: { id: "001" }, body: bodyActualizar }), {} as any, () => {});
      expect(res!.statusCode).toBe(200);
      expect(JSON.parse(res!.body).importeMaximo).toBe(2000);
    });

    it("retorna 400 FX-MNT-031 sin id", async () => {
      const res = await actualizarPN(mockEvent({ body: bodyActualizar }), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-031");
    });

    it("retorna 400 FX-MNT-032 importeMaximo negativo", async () => {
      const res = await actualizarPN(mockEvent({ pathParameters: { id: "001" }, body: JSON.stringify({ importeMaximo: -1, pips: 75 }) }), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-032");
    });

    it("retorna 404 FX-MNT-033 id no existe", async () => {
      mockRepo.actualizar.mockResolvedValueOnce(null);
      const res = await actualizarPN(mockEvent({ pathParameters: { id: "999" }, body: bodyActualizar }), {} as any, () => {});
      expect(res!.statusCode).toBe(404);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-033");
    });

    it("retorna 500 ante error", async () => {
      mockRepo.actualizar.mockRejectedValueOnce(new Error("err"));
      const res = await actualizarPN(mockEvent({ pathParameters: { id: "001" }, body: bodyActualizar }), {} as any, () => {});
      expect(res!.statusCode).toBe(500);
    });
  });

  // ── PN ELIMINAR ───────────────────────────────────────────
  describe("eliminarPN()", () => {
    it("retorna 204 al eliminar", async () => {
      mockRepo.eliminar.mockResolvedValueOnce(true);
      const res = await eliminarPN(mockEvent({ pathParameters: { id: "001" } }), {} as any, () => {});
      expect(res!.statusCode).toBe(204);
    });

    it("retorna 400 FX-MNT-031 sin id", async () => {
      const res = await eliminarPN(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-031");
    });

    it("retorna 404 FX-MNT-034 id no existe", async () => {
      mockRepo.eliminar.mockResolvedValueOnce(false);
      const res = await eliminarPN(mockEvent({ pathParameters: { id: "999" } }), {} as any, () => {});
      expect(res!.statusCode).toBe(404);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-034");
    });

    it("retorna 500 ante error", async () => {
      mockRepo.eliminar.mockRejectedValueOnce(new Error("err"));
      const res = await eliminarPN(mockEvent({ pathParameters: { id: "001" } }), {} as any, () => {});
      expect(res!.statusCode).toBe(500);
    });
  });

  // ── PJ — misma lógica con tipoPersoneria PJ ───────────────
  describe("listarPJ()", () => {
    it("retorna 200 con tipoPersoneria PJ", async () => {
      mockRepo.listar.mockResolvedValueOnce([{ ...itemPN, tipoPersoneria: "PJ" as const }]);
      const res = await listarPJ(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(200);
      expect(JSON.parse(res!.body).tipoPersoneria).toBe("PJ");
    });
  });

  describe("crearPJ()", () => {
    it("retorna 201 con rango PJ creado", async () => {
      mockRepo.crear.mockResolvedValueOnce({ data: { ...itemPN, tipoPersoneria: "PJ" as const, importeMaximo: 1000 } });
      const res = await crearPJ(mockEvent({ body: JSON.stringify({ importeMaximo: 1000, pips: 100 }) }), {} as any, () => {});
      expect(res!.statusCode).toBe(201);
    });
  });

  describe("actualizarPJ()", () => {
    it("retorna 404 FX-MNT-033 id PJ no existe", async () => {
      mockRepo.actualizar.mockResolvedValueOnce(null);
      const res = await actualizarPJ(mockEvent({ pathParameters: { id: "999" }, body: bodyActualizar }), {} as any, () => {});
      expect(res!.statusCode).toBe(404);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-033");
    });
  });

  describe("eliminarPJ()", () => {
    it("retorna 204 al eliminar PJ", async () => {
      mockRepo.eliminar.mockResolvedValueOnce(true);
      const res = await eliminarPJ(mockEvent({ pathParameters: { id: "001" } }), {} as any, () => {});
      expect(res!.statusCode).toBe(204);
    });
  });
});
```

---

## Task 8: Verificar serverless.yml
Verificar que existen estas 8 funciones (ya deberían estar del scaffold):

```yaml
listarRangoImportePN:
  handler: src/handlers/rangoImporte.handler.listarPN
  events:
    - http: { path: /parametros/rango-importe/pn, method: GET, cors: true }

crearRangoImportePN:
  handler: src/handlers/rangoImporte.handler.crearPN
  events:
    - http: { path: /parametros/rango-importe/pn, method: POST, cors: true }

actualizarRangoImportePN:
  handler: src/handlers/rangoImporte.handler.actualizarPN
  events:
    - http: { path: /parametros/rango-importe/pn/{id}, method: PUT, cors: true }

eliminarRangoImportePN:
  handler: src/handlers/rangoImporte.handler.eliminarPN
  events:
    - http: { path: /parametros/rango-importe/pn/{id}, method: DELETE, cors: true }

listarRangoImportePJ:
  handler: src/handlers/rangoImporte.handler.listarPJ
  events:
    - http: { path: /parametros/rango-importe/pj, method: GET, cors: true }

crearRangoImportePJ:
  handler: src/handlers/rangoImporte.handler.crearPJ
  events:
    - http: { path: /parametros/rango-importe/pj, method: POST, cors: true }

actualizarRangoImportePJ:
  handler: src/handlers/rangoImporte.handler.actualizarPJ
  events:
    - http: { path: /parametros/rango-importe/pj/{id}, method: PUT, cors: true }

eliminarRangoImportePJ:
  handler: src/handlers/rangoImporte.handler.eliminarPJ
  events:
    - http: { path: /parametros/rango-importe/pj/{id}, method: DELETE, cors: true }
```

---

## Criterios de aceptación

```
□ npx tsc --noEmit                         → 0 errores
□ npx jest tests/unit/rangoImporte         → todos pasan
□ GET /parametros/rango-importe/pn         → 200 ordenado por importeMinimo ASC
□ POST /parametros/rango-importe/pn        → 201 con importeMinimo calculado automáticamente
□ POST importeMaximo <= importeMinimo      → 400 FX-MNT-032 con valor actual
□ POST importeMaximo negativo              → 400 FX-MNT-032
□ PUT /parametros/rango-importe/pn/001     → 200 actualizado
□ PUT importeMinimo NO cambia tras update  → verificar en DynamoDB
□ DELETE /parametros/rango-importe/pn/001  → 204
□ DELETE id inexistente                    → 404 FX-MNT-034
□ pk, sk, tipo nunca en response
□ PN y PJ son independientes (rangos no se mezclan)
```
