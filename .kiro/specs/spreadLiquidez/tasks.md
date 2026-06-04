# Tasks — Variable Spread de Liquidez

---

## Task 1: src/models/spreadLiquidez.model.ts
Crear con exactamente este contenido:

```typescript
export type TipoMercado = "HORARIO_MERCADO_ABIERTO" | "HORARIO_MERCADO_CERRADO";
export type SentidoOperacion = "BANCO_COMPRA_DOLARES" | "BANCO_VENDE_DOLARES";

export interface SpreadLiquidez {
  pk: string;
  sk: string;
  tipo: "SPREAD_LIQUIDEZ";
  tipoMercado: TipoMercado;
  sentidoOperacion: SentidoOperacion;
  pips: number;
  updatedAt: string;
  updatedBy: string;
}

export interface SpreadLiquidezUpdateRequest {
  pips: number;
}

export interface SpreadLiquidezResponse {
  tipoMercado: TipoMercado;
  sentidoOperacion: SentidoOperacion;
  pips: number;
  updatedAt: string;
  updatedBy: string;
}
```

---

## Task 2: src/validators/schemas.ts
Agregar al archivo existente (después de SegmentoUpdateSchema):

```typescript
// ── SPREAD LIQUIDEZ ─────────────────────────────────────────
export const SpreadLiquidezUpdateSchema = z.object({
  pips: z
    .number({
      invalid_type_error: "PIPs debe ser un número",
      required_error: "pips es requerido",
    })
    .int("PIPs debe ser un número entero"),
});
export type SpreadLiquidezUpdateInput = z.infer<typeof SpreadLiquidezUpdateSchema>;
```

---

## Task 3: src/repositories/spreadLiquidez.repository.ts
Crear con exactamente este contenido:

```typescript
import { GetCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo, TABLE } from "./dynamodb.client";
import {
  SpreadLiquidez,
  SpreadLiquidezResponse,
  TipoMercado,
  SentidoOperacion,
} from "../models/spreadLiquidez.model";

const mapToResponse = (item: SpreadLiquidez): SpreadLiquidezResponse => ({
  tipoMercado: item.tipoMercado,
  sentidoOperacion: item.sentidoOperacion,
  pips: item.pips,
  updatedAt: item.updatedAt,
  updatedBy: item.updatedBy,
});

export const SpreadLiquidezRepository = {

  async listar(): Promise<SpreadLiquidezResponse[]> {
    const result = await dynamo.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "#tipo = :tipo",
        ExpressionAttributeNames: { "#tipo": "tipo" },
        ExpressionAttributeValues: { ":tipo": "SPREAD_LIQUIDEZ" },
      })
    );
    if (!result.Items || result.Items.length === 0) return [];
    return (result.Items as SpreadLiquidez[])
      .sort((a, b) => {
        const tipoComp = a.tipoMercado.localeCompare(b.tipoMercado);
        if (tipoComp !== 0) return tipoComp;
        return a.sentidoOperacion.localeCompare(b.sentidoOperacion);
      })
      .map(mapToResponse);
  },

  async obtenerPorClave(
    tipoMercado: TipoMercado,
    sentidoOperacion: SentidoOperacion
  ): Promise<SpreadLiquidezResponse | null> {
    const result = await dynamo.send(
      new GetCommand({
        TableName: TABLE,
        Key: {
          PK: `SPREAD_LIQUIDEZ#${tipoMercado}`,
          SK: `SENTIDO#${sentidoOperacion}`,
        },
      })
    );
    if (!result.Item) return null;
    return mapToResponse(result.Item as SpreadLiquidez);
  },

  async actualizar(
    tipoMercado: TipoMercado,
    sentidoOperacion: SentidoOperacion,
    pips: number,
    usuario: string
  ): Promise<SpreadLiquidezResponse | null> {
    const existente = await this.obtenerPorClave(tipoMercado, sentidoOperacion);
    if (!existente) return null;

    const now = new Date().toISOString();

    await dynamo.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: {
          PK: `SPREAD_LIQUIDEZ#${tipoMercado}`,
          SK: `SENTIDO#${sentidoOperacion}`,
        },
        UpdateExpression:
          "SET pips = :pips, updatedAt = :updatedAt, updatedBy = :updatedBy",
        ExpressionAttributeValues: {
          ":pips": pips,
          ":updatedAt": now,
          ":updatedBy": usuario,
        },
      })
    );

    return {
      ...existente,
      pips,
      updatedAt: now,
      updatedBy: usuario,
    };
  },
};
```

---

## Task 4: src/handlers/spreadLiquidez.handler.ts
Crear con exactamente este contenido:

```typescript
import { APIGatewayProxyHandler } from "aws-lambda";
import { SpreadLiquidezRepository } from "../repositories/spreadLiquidez.repository";
import { SpreadLiquidezUpdateSchema } from "../validators/schemas";
import { ok, badRequest, notFound, serverError } from "../utils/response.util";
import { getUsuario } from "../utils/audit.util";
import { TipoMercado, SentidoOperacion } from "../models/spreadLiquidez.model";

const TIPOS_MERCADO: TipoMercado[] = [
  "HORARIO_MERCADO_ABIERTO",
  "HORARIO_MERCADO_CERRADO",
];

const SENTIDOS: SentidoOperacion[] = [
  "BANCO_COMPRA_DOLARES",
  "BANCO_VENDE_DOLARES",
];

export const listar: APIGatewayProxyHandler = async () => {
  try {
    const data = await SpreadLiquidezRepository.listar();
    return ok({ data, total: data.length });
  } catch (error) {
    return serverError(error);
  }
};

export const actualizar: APIGatewayProxyHandler = async (event) => {
  try {
    const tipoMercado = event.pathParameters?.tipoMercado;
    const sentidoOperacion = event.pathParameters?.sentidoOperacion;

    if (!tipoMercado || !sentidoOperacion) {
      return badRequest("FX-MNT-050", "tipoMercado y sentidoOperacion son requeridos");
    }

    if (!TIPOS_MERCADO.includes(tipoMercado as TipoMercado)) {
      return badRequest(
        "FX-MNT-051",
        `tipoMercado inválido. Valores permitidos: ${TIPOS_MERCADO.join(", ")}`
      );
    }

    if (!SENTIDOS.includes(sentidoOperacion as SentidoOperacion)) {
      return badRequest(
        "FX-MNT-051",
        `sentidoOperacion inválido. Valores permitidos: ${SENTIDOS.join(", ")}`
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(event.body ?? "{}");
    } catch {
      return badRequest("FX-MNT-052", "Body inválido, se esperaba JSON");
    }

    const parsed = SpreadLiquidezUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("FX-MNT-052", parsed.error.errors[0].message);
    }

    const usuario = getUsuario(event);
    const result = await SpreadLiquidezRepository.actualizar(
      tipoMercado as TipoMercado,
      sentidoOperacion as SentidoOperacion,
      parsed.data.pips,
      usuario
    );

    if (!result) {
      return notFound("FX-MNT-053", "Spread de liquidez no encontrado");
    }
    return ok(result);
  } catch (error) {
    return serverError(error);
  }
};
```

---

## Task 5: tests/unit/spreadLiquidez.validator.test.ts
Crear con exactamente este contenido:

```typescript
import { SpreadLiquidezUpdateSchema } from "../../src/validators/schemas";

describe("SpreadLiquidezUpdateSchema", () => {

  describe("casos válidos", () => {
    it("acepta pips positivo", () => {
      expect(SpreadLiquidezUpdateSchema.safeParse({ pips: 50 }).success).toBe(true);
    });
    it("acepta pips = 0", () => {
      expect(SpreadLiquidezUpdateSchema.safeParse({ pips: 0 }).success).toBe(true);
    });
    it("acepta pips negativo", () => {
      expect(SpreadLiquidezUpdateSchema.safeParse({ pips: -15 }).success).toBe(true);
    });
    it("acepta pips muy negativo", () => {
      expect(SpreadLiquidezUpdateSchema.safeParse({ pips: -999 }).success).toBe(true);
    });
  });

  describe("validación de pips", () => {
    it("rechaza pips decimal positivo", () => {
      const r = SpreadLiquidezUpdateSchema.safeParse({ pips: 10.5 });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("PIPs debe ser un número entero");
    });
    it("rechaza pips decimal negativo", () => {
      expect(SpreadLiquidezUpdateSchema.safeParse({ pips: -10.5 }).success).toBe(false);
    });
    it("rechaza pips como string", () => {
      const r = SpreadLiquidezUpdateSchema.safeParse({ pips: "50" });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("PIPs debe ser un número");
    });
    it("rechaza pips ausente", () => {
      const r = SpreadLiquidezUpdateSchema.safeParse({});
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("pips es requerido");
    });
    it("rechaza body vacío", () => {
      expect(SpreadLiquidezUpdateSchema.safeParse({}).success).toBe(false);
    });
  });
});
```

---

## Task 6: tests/unit/spreadLiquidez.repository.test.ts
Crear con exactamente este contenido:

```typescript
import { SpreadLiquidezRepository } from "../../src/repositories/spreadLiquidez.repository";
import { dynamo } from "../../src/repositories/dynamodb.client";

jest.mock("../../src/repositories/dynamodb.client", () => ({
  dynamo: { send: jest.fn() },
  TABLE: "tablero-test",
}));

const mockSend = dynamo.send as jest.Mock;

const makeItem = (tipo: string, sentido: string, pips: number) => ({
  pk: `SPREAD_LIQUIDEZ#${tipo}`, sk: `SENTIDO#${sentido}`,
  tipo: "SPREAD_LIQUIDEZ", tipoMercado: tipo, sentidoOperacion: sentido, pips,
  updatedAt: "2026-05-25T08:30:00Z", updatedBy: "ROBERT.GARCIA",
});

const itemAbierto = makeItem("HORARIO_MERCADO_ABIERTO", "BANCO_COMPRA_DOLARES", 50);
const itemAbiertoVenta = makeItem("HORARIO_MERCADO_ABIERTO", "BANCO_VENDE_DOLARES", 25);
const itemCerradoCompra = makeItem("HORARIO_MERCADO_CERRADO", "BANCO_COMPRA_DOLARES", 0);
const itemCerradoVenta = makeItem("HORARIO_MERCADO_CERRADO", "BANCO_VENDE_DOLARES", -15);

describe("SpreadLiquidezRepository", () => {

  beforeEach(() => jest.clearAllMocks());

  describe("listar()", () => {
    it("retorna lista mapeada sin pk, sk, tipo", async () => {
      mockSend.mockResolvedValueOnce({ Items: [itemAbierto] });
      const r = await SpreadLiquidezRepository.listar();
      expect(r[0]).not.toHaveProperty("pk");
      expect(r[0]).not.toHaveProperty("sk");
      expect(r[0]).not.toHaveProperty("tipo");
      expect(r[0].pips).toBe(50);
    });

    it("ordena ABIERTO antes que CERRADO, COMPRA antes que VENTA", async () => {
      mockSend.mockResolvedValueOnce({
        Items: [itemCerradoVenta, itemCerradoCompra, itemAbiertoVenta, itemAbierto],
      });
      const r = await SpreadLiquidezRepository.listar();
      expect(r[0].tipoMercado).toBe("HORARIO_MERCADO_ABIERTO");
      expect(r[0].sentidoOperacion).toBe("BANCO_COMPRA_DOLARES");
      expect(r[1].sentidoOperacion).toBe("BANCO_VENDE_DOLARES");
      expect(r[2].tipoMercado).toBe("HORARIO_MERCADO_CERRADO");
      expect(r[3].pips).toBe(-15);
    });

    it("retorna pips negativos correctamente", async () => {
      mockSend.mockResolvedValueOnce({ Items: [itemCerradoVenta] });
      const r = await SpreadLiquidezRepository.listar();
      expect(r[0].pips).toBe(-15);
    });

    it("retorna vacío sin items", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      expect(await SpreadLiquidezRepository.listar()).toEqual([]);
    });

    it("usa FilterExpression tipo=SPREAD_LIQUIDEZ", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      await SpreadLiquidezRepository.listar();
      expect(mockSend.mock.calls[0][0].input.ExpressionAttributeValues[":tipo"]).toBe("SPREAD_LIQUIDEZ");
    });
  });

  describe("obtenerPorClave()", () => {
    it("retorna registro mapeado", async () => {
      mockSend.mockResolvedValueOnce({ Item: itemAbierto });
      const r = await SpreadLiquidezRepository.obtenerPorClave(
        "HORARIO_MERCADO_ABIERTO", "BANCO_COMPRA_DOLARES"
      );
      expect(r?.pips).toBe(50);
      expect(r).not.toHaveProperty("pk");
    });
    it("retorna null cuando no existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      expect(await SpreadLiquidezRepository.obtenerPorClave(
        "HORARIO_MERCADO_ABIERTO", "BANCO_COMPRA_DOLARES"
      )).toBeNull();
    });
    it("construye PK y SK correctamente", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      await SpreadLiquidezRepository.obtenerPorClave(
        "HORARIO_MERCADO_ABIERTO", "BANCO_COMPRA_DOLARES"
      );
      const arg = mockSend.mock.calls[0][0].input;
      expect(arg.Key.PK).toBe("SPREAD_LIQUIDEZ#HORARIO_MERCADO_ABIERTO");
      expect(arg.Key.SK).toBe("SENTIDO#BANCO_COMPRA_DOLARES");
    });
  });

  describe("actualizar()", () => {
    it("retorna null si no existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      expect(await SpreadLiquidezRepository.actualizar(
        "HORARIO_MERCADO_ABIERTO", "BANCO_COMPRA_DOLARES", 75, "SISTEMA"
      )).toBeNull();
    });

    it("actualiza pips positivo correctamente", async () => {
      mockSend.mockResolvedValueOnce({ Item: itemAbierto }).mockResolvedValueOnce({});
      const r = await SpreadLiquidezRepository.actualizar(
        "HORARIO_MERCADO_ABIERTO", "BANCO_COMPRA_DOLARES", 75, "ANA.TORRES"
      );
      expect(r?.pips).toBe(75);
      expect(r?.updatedBy).toBe("ANA.TORRES");
    });

    it("actualiza pips negativo correctamente", async () => {
      mockSend.mockResolvedValueOnce({ Item: itemCerradoVenta }).mockResolvedValueOnce({});
      const r = await SpreadLiquidezRepository.actualizar(
        "HORARIO_MERCADO_CERRADO", "BANCO_VENDE_DOLARES", -20, "SISTEMA"
      );
      expect(r?.pips).toBe(-20);
    });

    it("actualiza pips = 0", async () => {
      mockSend.mockResolvedValueOnce({ Item: itemAbierto }).mockResolvedValueOnce({});
      const r = await SpreadLiquidezRepository.actualizar(
        "HORARIO_MERCADO_ABIERTO", "BANCO_COMPRA_DOLARES", 0, "SISTEMA"
      );
      expect(r?.pips).toBe(0);
    });

    it("UpdateExpression contiene pips, updatedAt, updatedBy", async () => {
      mockSend.mockResolvedValueOnce({ Item: itemAbierto }).mockResolvedValueOnce({});
      await SpreadLiquidezRepository.actualizar(
        "HORARIO_MERCADO_ABIERTO", "BANCO_COMPRA_DOLARES", 75, "SISTEMA"
      );
      const u = mockSend.mock.calls[1][0].input.UpdateExpression;
      expect(u).toContain("pips");
      expect(u).toContain("updatedAt");
      expect(u).toContain("updatedBy");
    });

    it("UpdateExpression NO contiene tipoMercado ni sentidoOperacion", async () => {
      mockSend.mockResolvedValueOnce({ Item: itemAbierto }).mockResolvedValueOnce({});
      await SpreadLiquidezRepository.actualizar(
        "HORARIO_MERCADO_ABIERTO", "BANCO_COMPRA_DOLARES", 75, "SISTEMA"
      );
      const u = mockSend.mock.calls[1][0].input.UpdateExpression;
      expect(u).not.toContain("tipoMercado");
      expect(u).not.toContain("sentidoOperacion");
    });
  });
});
```

---

## Task 7: tests/unit/spreadLiquidez.handler.test.ts
Crear con exactamente este contenido:

```typescript
import { APIGatewayProxyEvent } from "aws-lambda";
import { listar, actualizar } from "../../src/handlers/spreadLiquidez.handler";
import { SpreadLiquidezRepository } from "../../src/repositories/spreadLiquidez.repository";

jest.mock("../../src/repositories/spreadLiquidez.repository");
const mockRepo = SpreadLiquidezRepository as jest.Mocked<typeof SpreadLiquidezRepository>;

const mockEvent = (o: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent =>
  ({ pathParameters: null, body: null, requestContext: { authorizer: null } as any,
     headers: {}, multiValueHeaders: {}, httpMethod: "GET", isBase64Encoded: false,
     path: "/", queryStringParameters: null, multiValueQueryStringParameters: null,
     stageVariables: null, resource: "/", ...o } as APIGatewayProxyEvent);

const item = {
  tipoMercado: "HORARIO_MERCADO_ABIERTO" as const,
  sentidoOperacion: "BANCO_COMPRA_DOLARES" as const,
  pips: 50, updatedAt: "2026-05-25T08:30:00Z", updatedBy: "ROBERT.GARCIA",
};

const pathValido = {
  tipoMercado: "HORARIO_MERCADO_ABIERTO",
  sentidoOperacion: "BANCO_COMPRA_DOLARES",
};

const bodyValido = JSON.stringify({ pips: 75 });

describe("spreadLiquidez.handler", () => {

  beforeEach(() => jest.clearAllMocks());

  describe("listar()", () => {
    it("retorna 200 con data y total", async () => {
      mockRepo.listar.mockResolvedValueOnce([item]);
      const res = await listar(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(200);
      const b = JSON.parse(res!.body);
      expect(b.total).toBe(1);
      expect(b.data[0].pips).toBe(50);
    });
    it("retorna 200 vacío", async () => {
      mockRepo.listar.mockResolvedValueOnce([]);
      const res = await listar(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(200);
      expect(JSON.parse(res!.body).total).toBe(0);
    });
    it("retorna 500 ante error", async () => {
      mockRepo.listar.mockRejectedValueOnce(new Error("err"));
      const res = await listar(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(500);
    });
    it("incluye header Content-Type", async () => {
      mockRepo.listar.mockResolvedValueOnce([]);
      const res = await listar(mockEvent(), {} as any, () => {});
      expect(res!.headers?.["Content-Type"]).toBe("application/json");
    });
  });

  describe("actualizar()", () => {
    it("retorna 200 con registro actualizado", async () => {
      mockRepo.actualizar.mockResolvedValueOnce({ ...item, pips: 75 });
      const res = await actualizar(
        mockEvent({ pathParameters: pathValido, body: bodyValido }),
        {} as any, () => {}
      );
      expect(res!.statusCode).toBe(200);
      expect(JSON.parse(res!.body).pips).toBe(75);
    });

    it("retorna 200 con pips negativo", async () => {
      mockRepo.actualizar.mockResolvedValueOnce({ ...item, pips: -20 });
      const res = await actualizar(
        mockEvent({ pathParameters: pathValido, body: JSON.stringify({ pips: -20 }) }),
        {} as any, () => {}
      );
      expect(res!.statusCode).toBe(200);
      expect(JSON.parse(res!.body).pips).toBe(-20);
    });

    it("retorna 200 con pips = 0", async () => {
      mockRepo.actualizar.mockResolvedValueOnce({ ...item, pips: 0 });
      const res = await actualizar(
        mockEvent({ pathParameters: pathValido, body: JSON.stringify({ pips: 0 }) }),
        {} as any, () => {}
      );
      expect(res!.statusCode).toBe(200);
    });

    it("retorna 400 FX-MNT-050 sin tipoMercado", async () => {
      const res = await actualizar(
        mockEvent({ pathParameters: { sentidoOperacion: "BANCO_COMPRA_DOLARES" }, body: bodyValido }),
        {} as any, () => {}
      );
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-050");
    });

    it("retorna 400 FX-MNT-050 sin sentidoOperacion", async () => {
      const res = await actualizar(
        mockEvent({ pathParameters: { tipoMercado: "HORARIO_MERCADO_ABIERTO" }, body: bodyValido }),
        {} as any, () => {}
      );
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-050");
    });

    it("retorna 400 FX-MNT-051 tipoMercado inválido", async () => {
      const res = await actualizar(
        mockEvent({ pathParameters: { tipoMercado: "TIPO_INVALIDO", sentidoOperacion: "BANCO_COMPRA_DOLARES" }, body: bodyValido }),
        {} as any, () => {}
      );
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-051");
    });

    it("retorna 400 FX-MNT-051 sentidoOperacion inválido", async () => {
      const res = await actualizar(
        mockEvent({ pathParameters: { tipoMercado: "HORARIO_MERCADO_ABIERTO", sentidoOperacion: "SENTIDO_INVALIDO" }, body: bodyValido }),
        {} as any, () => {}
      );
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-051");
    });

    it("retorna 400 FX-MNT-052 pips decimal", async () => {
      const res = await actualizar(
        mockEvent({ pathParameters: pathValido, body: JSON.stringify({ pips: 10.5 }) }),
        {} as any, () => {}
      );
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-052");
    });

    it("retorna 400 FX-MNT-052 pips como string", async () => {
      const res = await actualizar(
        mockEvent({ pathParameters: pathValido, body: JSON.stringify({ pips: "50" }) }),
        {} as any, () => {}
      );
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-052");
    });

    it("retorna 400 FX-MNT-052 body vacío", async () => {
      const res = await actualizar(
        mockEvent({ pathParameters: pathValido, body: "{}" }),
        {} as any, () => {}
      );
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-052");
    });

    it("retorna 404 FX-MNT-053 combinación no existe", async () => {
      mockRepo.actualizar.mockResolvedValueOnce(null);
      const res = await actualizar(
        mockEvent({ pathParameters: pathValido, body: bodyValido }),
        {} as any, () => {}
      );
      expect(res!.statusCode).toBe(404);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-053");
    });

    it("retorna 500 ante error", async () => {
      mockRepo.actualizar.mockRejectedValueOnce(new Error("err"));
      const res = await actualizar(
        mockEvent({ pathParameters: pathValido, body: bodyValido }),
        {} as any, () => {}
      );
      expect(res!.statusCode).toBe(500);
    });
  });
});
```

---

## Task 8: Verificar serverless.yml
Agregar o descomentar estas 2 funciones:

```yaml
listarSpreadLiquidez:
  handler: src/handlers/spreadLiquidez.handler.listar
  events:
    - http:
        path: /parametros/spread-liquidez
        method: GET
        cors: true

actualizarSpreadLiquidez:
  handler: src/handlers/spreadLiquidez.handler.actualizar
  events:
    - http:
        path: /parametros/spread-liquidez/{tipoMercado}/{sentidoOperacion}
        method: PUT
        cors: true
```

---

## Criterios de aceptación

```
□ npx tsc --noEmit                                          → 0 errores
□ npx jest tests/unit/spreadLiquidez                        → todos pasan
□ GET /parametros/spread-liquidez                           → 200 con 4 items ordenados
□ pips negativo en GET                                      → aparece como número negativo
□ PUT con pips=75                                           → 200 actualizado
□ PUT con pips=-20                                          → 200 actualizado (negativo OK)
□ PUT con pips=0                                            → 200 actualizado
□ PUT con pips=10.5                                         → 400 FX-MNT-052
□ PUT tipoMercado=TIPO_INVALIDO                             → 400 FX-MNT-051
□ PUT sentidoOperacion=SENTIDO_INVALIDO                     → 400 FX-MNT-051
□ PUT sin tipoMercado en path                               → 400 FX-MNT-050
□ PUT combinación no existente en DynamoDB                  → 404 FX-MNT-053
□ pk, sk, tipo nunca en response
□ tipoMercado y sentidoOperacion NO cambian tras PUT
```
