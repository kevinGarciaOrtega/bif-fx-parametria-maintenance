# Tasks — Parámetro Sistema: GET List + PUT

---

## Task 1: src/models/parametroSistema.model.ts
Crear con exactamente este contenido:

```typescript
export type TipoValorParametro = "INTEGER" | "DECIMAL" | "STRING" | "TIME";

export interface ParametroSistema {
  pk: string;
  sk: string;
  tipo: "PARAMETRO";
  grupo: string;
  clave: string;
  nombre: string;
  valor: string;
  tipoValor: TipoValorParametro;
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

## Task 2: src/validators/schemas.ts
Agregar al archivo existente (después de TCVentanillaEnviarSchema):

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

## Task 3: src/repositories/parametroSistema.repository.ts
Crear con exactamente este contenido:

```typescript
import { GetCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo, TABLE } from "./dynamodb.client";
import {
  ParametroSistema,
  ParametroSistemaGrupoResponse,
  ParametroSistemaItemResponse,
  ParametroSistemaResponse,
} from "../models/parametroSistema.model";

const mapToItem = (item: ParametroSistema): ParametroSistemaItemResponse => ({
  clave: item.clave,
  nombre: item.nombre,
  valor: item.valor,
  tipoValor: item.tipoValor,
  updatedAt: item.updatedAt,
  updatedBy: item.updatedBy,
});

const agrupar = (items: ParametroSistema[]): ParametroSistemaGrupoResponse[] => {
  const map = new Map<string, ParametroSistemaItemResponse[]>();
  for (const item of items) {
    if (!map.has(item.grupo)) map.set(item.grupo, []);
    map.get(item.grupo)!.push(mapToItem(item));
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([grupo, parametros]) => ({ grupo, parametros }));
};

export const ParametroSistemaRepository = {

  async listar(grupo?: string): Promise<ParametroSistemaGrupoResponse[]> {
    const filterExp = grupo
      ? "#tipo = :tipo AND PK = :pk"
      : "#tipo = :tipo";

    const expValues: Record<string, string> = { ":tipo": "PARAMETRO" };
    if (grupo) expValues[":pk"] = `PARAMETRO#${grupo}`;

    const result = await dynamo.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: filterExp,
        ExpressionAttributeNames: { "#tipo": "tipo" },
        ExpressionAttributeValues: expValues,
      })
    );

    if (!result.Items || result.Items.length === 0) return [];
    return agrupar(result.Items as ParametroSistema[]);
  },

  async obtenerPorClave(
    grupo: string,
    clave: string
  ): Promise<ParametroSistema | null> {
    const result = await dynamo.send(
      new GetCommand({
        TableName: TABLE,
        Key: {
          PK: `PARAMETRO#${grupo}`,
          SK: `PARAM#${clave}`,
        },
      })
    );
    if (!result.Item) return null;
    return result.Item as ParametroSistema;
  },

  async actualizar(
    grupo: string,
    clave: string,
    valor: string,
    usuario: string
  ): Promise<ParametroSistemaResponse | null> {
    const existente = await this.obtenerPorClave(grupo, clave);
    if (!existente) return null;

    const now = new Date().toISOString();

    await dynamo.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: {
          PK: `PARAMETRO#${grupo}`,
          SK: `PARAM#${clave}`,
        },
        UpdateExpression:
          "SET #valor = :valor, updatedAt = :updatedAt, updatedBy = :updatedBy",
        ExpressionAttributeNames: { "#valor": "valor" },
        ExpressionAttributeValues: {
          ":valor": valor,
          ":updatedAt": now,
          ":updatedBy": usuario,
        },
      })
    );

    return {
      grupo: existente.grupo,
      clave: existente.clave,
      nombre: existente.nombre,
      valor,
      tipoValor: existente.tipoValor,
      updatedAt: now,
      updatedBy: usuario,
    };
  },
};
```

---

## Task 4: src/handlers/parametroSistema.handler.ts
Crear con exactamente este contenido:

```typescript
import { APIGatewayProxyHandler } from "aws-lambda";
import { ParametroSistemaRepository } from "../repositories/parametroSistema.repository";
import { ParametroSistemaUpdateSchema } from "../validators/schemas";
import { ok, badRequest, notFound, serverError } from "../utils/response.util";
import { getUsuario } from "../utils/audit.util";

export const listar: APIGatewayProxyHandler = async (event) => {
  try {
    const grupo = event.queryStringParameters?.grupo ?? undefined;
    const grupos = await ParametroSistemaRepository.listar(grupo);
    const totalParametros = grupos.reduce((acc, g) => acc + g.parametros.length, 0);
    return ok({
      data: grupos,
      totalGrupos: grupos.length,
      totalParametros,
    });
  } catch (error) {
    return serverError(error);
  }
};

export const actualizar: APIGatewayProxyHandler = async (event) => {
  try {
    const grupo = event.pathParameters?.grupo;
    const clave = event.pathParameters?.clave;

    if (!grupo || !clave) {
      return badRequest("FX-MNT-070", "grupo y clave son requeridos en el path");
    }

    let body: unknown;
    try {
      body = JSON.parse(event.body ?? "{}");
    } catch {
      return badRequest("FX-MNT-072", "Body inválido, se esperaba JSON");
    }

    const parsed = ParametroSistemaUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("FX-MNT-072", parsed.error.errors[0].message);
    }

    const usuario = getUsuario(event);
    const result = await ParametroSistemaRepository.actualizar(
      grupo,
      clave,
      parsed.data.valor,
      usuario
    );

    if (!result) {
      return notFound("FX-MNT-073", `Parámetro ${grupo}/${clave} no encontrado`);
    }
    return ok(result);
  } catch (error) {
    return serverError(error);
  }
};
```

---

## Task 5: tests/unit/parametroSistema.validator.test.ts
Crear con exactamente este contenido:

```typescript
import { ParametroSistemaUpdateSchema } from "../../src/validators/schemas";

describe("ParametroSistemaUpdateSchema", () => {

  describe("casos válidos", () => {
    it("acepta valor string normal", () => {
      expect(ParametroSistemaUpdateSchema.safeParse({ valor: "1" }).success).toBe(true);
    });
    it("acepta valor decimal como string", () => {
      expect(ParametroSistemaUpdateSchema.safeParse({ valor: "3.72" }).success).toBe(true);
    });
    it("acepta valor time como string", () => {
      expect(ParametroSistemaUpdateSchema.safeParse({ valor: "05:00" }).success).toBe(true);
    });
    it("acepta valor email list como string", () => {
      expect(ParametroSistemaUpdateSchema.safeParse({ valor: "a@b.com;c@d.com" }).success).toBe(true);
    });
    it("acepta valor 0 como string", () => {
      expect(ParametroSistemaUpdateSchema.safeParse({ valor: "0" }).success).toBe(true);
    });
  });

  describe("validación de valor", () => {
    it("rechaza valor vacío", () => {
      const r = ParametroSistemaUpdateSchema.safeParse({ valor: "" });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("valor es requerido");
    });
    it("rechaza valor ausente", () => {
      const r = ParametroSistemaUpdateSchema.safeParse({});
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("valor es requerido");
    });
    it("rechaza valor como número (debe ser string)", () => {
      expect(ParametroSistemaUpdateSchema.safeParse({ valor: 1 }).success).toBe(false);
    });
    it("rechaza valor null", () => {
      expect(ParametroSistemaUpdateSchema.safeParse({ valor: null }).success).toBe(false);
    });
    it("rechaza body vacío", () => {
      expect(ParametroSistemaUpdateSchema.safeParse({}).success).toBe(false);
    });
  });
});
```

---

## Task 6: tests/unit/parametroSistema.repository.test.ts
Crear con exactamente este contenido:

```typescript
import { ParametroSistemaRepository } from "../../src/repositories/parametroSistema.repository";
import { dynamo } from "../../src/repositories/dynamodb.client";

jest.mock("../../src/repositories/dynamodb.client", () => ({
  dynamo: { send: jest.fn() },
  TABLE: "tablero-test",
}));

const mockSend = dynamo.send as jest.Mock;

const makeParam = (grupo: string, clave: string, valor: string, tipoValor = "STRING") => ({
  pk: `PARAMETRO#${grupo}`,
  sk: `PARAM#${clave}`,
  tipo: "PARAMETRO",
  grupo,
  clave,
  nombre: `Nombre de ${clave}`,
  valor,
  tipoValor,
  updatedAt: "2026-05-25T08:30:00Z",
  updatedBy: "SISTEMA",
});

const paramContingencia1 = makeParam("CONTINGENCIA_DATATEC", "ACTIVAR_CONTINGENCIA", "0", "INTEGER");
const paramContingencia2 = makeParam("CONTINGENCIA_DATATEC", "TC_BANCO_COMPRA", "3.72", "DECIMAL");
const paramPlataforma = makeParam("PLATAFORMA_FX", "BUZON_CORREOS", "a@b.com", "STRING");

describe("ParametroSistemaRepository", () => {

  beforeEach(() => jest.clearAllMocks());

  describe("listar()", () => {
    it("retorna parámetros agrupados sin pk/sk/tipo", async () => {
      mockSend.mockResolvedValueOnce({ Items: [paramContingencia1, paramPlataforma] });
      const r = await ParametroSistemaRepository.listar();
      expect(r).toHaveLength(2); // 2 grupos
      expect(r[0].grupo).toBeDefined();
      const primerParam = r[0].parametros[0];
      expect(primerParam).not.toHaveProperty("pk");
      expect(primerParam).not.toHaveProperty("sk");
      expect(primerParam).not.toHaveProperty("tipo");
    });

    it("agrupa correctamente por grupo", async () => {
      mockSend.mockResolvedValueOnce({ Items: [paramContingencia1, paramContingencia2, paramPlataforma] });
      const r = await ParametroSistemaRepository.listar();
      const contingencia = r.find((g) => g.grupo === "CONTINGENCIA_DATATEC");
      expect(contingencia?.parametros).toHaveLength(2);
      const plataforma = r.find((g) => g.grupo === "PLATAFORMA_FX");
      expect(plataforma?.parametros).toHaveLength(1);
    });

    it("ordena grupos alfabéticamente ASC", async () => {
      mockSend.mockResolvedValueOnce({ Items: [paramPlataforma, paramContingencia1] });
      const r = await ParametroSistemaRepository.listar();
      expect(r[0].grupo).toBe("CONTINGENCIA_DATATEC"); // C antes que P
      expect(r[1].grupo).toBe("PLATAFORMA_FX");
    });

    it("filtra por grupo cuando se especifica", async () => {
      mockSend.mockResolvedValueOnce({ Items: [paramContingencia1, paramContingencia2] });
      const r = await ParametroSistemaRepository.listar("CONTINGENCIA_DATATEC");
      const arg = mockSend.mock.calls[0][0].input;
      expect(arg.ExpressionAttributeValues[":pk"]).toBe("PARAMETRO#CONTINGENCIA_DATATEC");
      expect(r).toHaveLength(1);
      expect(r[0].grupo).toBe("CONTINGENCIA_DATATEC");
      expect(r[0].parametros).toHaveLength(2);
    });

    it("retorna vacío sin items", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      expect(await ParametroSistemaRepository.listar()).toEqual([]);
    });

    it("usa FilterExpression tipo=PARAMETRO", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      await ParametroSistemaRepository.listar();
      expect(mockSend.mock.calls[0][0].input.ExpressionAttributeValues[":tipo"]).toBe("PARAMETRO");
    });
  });

  describe("obtenerPorClave()", () => {
    it("retorna el item cuando existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: paramContingencia1 });
      const r = await ParametroSistemaRepository.obtenerPorClave("CONTINGENCIA_DATATEC", "ACTIVAR_CONTINGENCIA");
      expect(r?.clave).toBe("ACTIVAR_CONTINGENCIA");
    });

    it("retorna null cuando no existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      expect(await ParametroSistemaRepository.obtenerPorClave("GRUPO", "CLAVE")).toBeNull();
    });

    it("construye PK y SK correctamente", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      await ParametroSistemaRepository.obtenerPorClave("CONTINGENCIA_DATATEC", "ACTIVAR_CONTINGENCIA");
      const arg = mockSend.mock.calls[0][0].input;
      expect(arg.Key.PK).toBe("PARAMETRO#CONTINGENCIA_DATATEC");
      expect(arg.Key.SK).toBe("PARAM#ACTIVAR_CONTINGENCIA");
    });
  });

  describe("actualizar()", () => {
    it("retorna null si no existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      expect(await ParametroSistemaRepository.actualizar("GRUPO", "CLAVE", "valor", "SISTEMA")).toBeNull();
    });

    it("retorna el parámetro actualizado", async () => {
      mockSend.mockResolvedValueOnce({ Item: paramContingencia1 }).mockResolvedValueOnce({});
      const r = await ParametroSistemaRepository.actualizar(
        "CONTINGENCIA_DATATEC", "ACTIVAR_CONTINGENCIA", "1", "ANA.TORRES"
      );
      expect(r?.valor).toBe("1");
      expect(r?.updatedBy).toBe("ANA.TORRES");
      expect(r?.nombre).toBe("Nombre de ACTIVAR_CONTINGENCIA");
      expect(r?.tipoValor).toBe("INTEGER");
    });

    it("UpdateExpression contiene valor, updatedAt, updatedBy", async () => {
      mockSend.mockResolvedValueOnce({ Item: paramContingencia1 }).mockResolvedValueOnce({});
      await ParametroSistemaRepository.actualizar("GRUPO", "CLAVE", "nuevo", "SISTEMA");
      const u = mockSend.mock.calls[1][0].input.UpdateExpression;
      expect(u).toContain("valor");
      expect(u).toContain("updatedAt");
      expect(u).toContain("updatedBy");
    });

    it("UpdateExpression NO contiene nombre ni tipoValor", async () => {
      mockSend.mockResolvedValueOnce({ Item: paramContingencia1 }).mockResolvedValueOnce({});
      await ParametroSistemaRepository.actualizar("GRUPO", "CLAVE", "nuevo", "SISTEMA");
      const u = mockSend.mock.calls[1][0].input.UpdateExpression;
      expect(u).not.toContain("nombre");
      expect(u).not.toContain("tipoValor");
    });

    it("nombre y tipoValor se preservan del registro original", async () => {
      mockSend.mockResolvedValueOnce({ Item: paramContingencia1 }).mockResolvedValueOnce({});
      const r = await ParametroSistemaRepository.actualizar("CONTINGENCIA_DATATEC", "ACTIVAR_CONTINGENCIA", "1", "SISTEMA");
      expect(r?.tipoValor).toBe("INTEGER");
      expect(r?.grupo).toBe("CONTINGENCIA_DATATEC");
      expect(r?.clave).toBe("ACTIVAR_CONTINGENCIA");
    });
  });
});
```

---

## Task 7: tests/unit/parametroSistema.handler.test.ts
Crear con exactamente este contenido:

```typescript
import { APIGatewayProxyEvent } from "aws-lambda";
import { listar, actualizar } from "../../src/handlers/parametroSistema.handler";
import { ParametroSistemaRepository } from "../../src/repositories/parametroSistema.repository";

jest.mock("../../src/repositories/parametroSistema.repository");
const mockRepo = ParametroSistemaRepository as jest.Mocked<typeof ParametroSistemaRepository>;

const mockEvent = (o: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent =>
  ({ pathParameters: null, body: null, requestContext: { authorizer: null } as any,
     headers: {}, multiValueHeaders: {}, httpMethod: "GET", isBase64Encoded: false,
     path: "/", queryStringParameters: null, multiValueQueryStringParameters: null,
     stageVariables: null, resource: "/", ...o } as APIGatewayProxyEvent);

const grupoResponse = {
  grupo: "CONTINGENCIA_DATATEC",
  parametros: [
    { clave: "ACTIVAR_CONTINGENCIA", nombre: "Activar contingencia", valor: "0", tipoValor: "INTEGER" as const, updatedAt: "2026-05-25T08:30:00Z", updatedBy: "SISTEMA" },
    { clave: "TC_BANCO_COMPRA", nombre: "TC Banco Compra", valor: "3.72", tipoValor: "DECIMAL" as const, updatedAt: "2026-05-25T08:30:00Z", updatedBy: "SISTEMA" },
  ],
};

const paramResponse = {
  grupo: "CONTINGENCIA_DATATEC",
  clave: "ACTIVAR_CONTINGENCIA",
  nombre: "Activar contingencia",
  valor: "1",
  tipoValor: "INTEGER" as const,
  updatedAt: "2026-06-03T10:00:00Z",
  updatedBy: "ANA.TORRES",
};

describe("parametroSistema.handler", () => {

  beforeEach(() => jest.clearAllMocks());

  describe("listar()", () => {
    it("retorna 200 con grupos y totales", async () => {
      mockRepo.listar.mockResolvedValueOnce([grupoResponse]);
      const res = await listar(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(200);
      const b = JSON.parse(res!.body);
      expect(b.totalGrupos).toBe(1);
      expect(b.totalParametros).toBe(2);
      expect(b.data[0].grupo).toBe("CONTINGENCIA_DATATEC");
    });

    it("pasa filtro grupo al repository cuando se especifica", async () => {
      mockRepo.listar.mockResolvedValueOnce([grupoResponse]);
      await listar(mockEvent({ queryStringParameters: { grupo: "CONTINGENCIA_DATATEC" } }), {} as any, () => {});
      expect(mockRepo.listar).toHaveBeenCalledWith("CONTINGENCIA_DATATEC");
    });

    it("llama listar sin filtro cuando no hay query params", async () => {
      mockRepo.listar.mockResolvedValueOnce([]);
      await listar(mockEvent(), {} as any, () => {});
      expect(mockRepo.listar).toHaveBeenCalledWith(undefined);
    });

    it("retorna 200 vacío cuando no hay parámetros", async () => {
      mockRepo.listar.mockResolvedValueOnce([]);
      const res = await listar(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(200);
      const b = JSON.parse(res!.body);
      expect(b.totalGrupos).toBe(0);
      expect(b.totalParametros).toBe(0);
    });

    it("retorna 500 ante error", async () => {
      mockRepo.listar.mockRejectedValueOnce(new Error("err"));
      const res = await listar(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(500);
    });
  });

  describe("actualizar()", () => {
    const pathValido = { grupo: "CONTINGENCIA_DATATEC", clave: "ACTIVAR_CONTINGENCIA" };
    const bodyValido = JSON.stringify({ valor: "1" });

    it("retorna 200 con parámetro actualizado", async () => {
      mockRepo.actualizar.mockResolvedValueOnce(paramResponse);
      const res = await actualizar(
        mockEvent({ pathParameters: pathValido, body: bodyValido }),
        {} as any, () => {}
      );
      expect(res!.statusCode).toBe(200);
      const b = JSON.parse(res!.body);
      expect(b.valor).toBe("1");
      expect(b.tipoValor).toBe("INTEGER");
    });

    it("retorna 400 FX-MNT-070 sin grupo", async () => {
      const res = await actualizar(
        mockEvent({ pathParameters: { clave: "ACTIVAR_CONTINGENCIA" }, body: bodyValido }),
        {} as any, () => {}
      );
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-070");
    });

    it("retorna 400 FX-MNT-070 sin clave", async () => {
      const res = await actualizar(
        mockEvent({ pathParameters: { grupo: "CONTINGENCIA_DATATEC" }, body: bodyValido }),
        {} as any, () => {}
      );
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-070");
    });

    it("retorna 400 FX-MNT-072 valor vacío", async () => {
      const res = await actualizar(
        mockEvent({ pathParameters: pathValido, body: JSON.stringify({ valor: "" }) }),
        {} as any, () => {}
      );
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-072");
    });

    it("retorna 400 FX-MNT-072 valor ausente", async () => {
      const res = await actualizar(
        mockEvent({ pathParameters: pathValido, body: "{}" }),
        {} as any, () => {}
      );
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-072");
    });

    it("retorna 400 FX-MNT-072 valor como número", async () => {
      const res = await actualizar(
        mockEvent({ pathParameters: pathValido, body: JSON.stringify({ valor: 1 }) }),
        {} as any, () => {}
      );
      expect(res!.statusCode).toBe(400);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-072");
    });

    it("retorna 404 FX-MNT-073 combinación no existe", async () => {
      mockRepo.actualizar.mockResolvedValueOnce(null);
      const res = await actualizar(
        mockEvent({ pathParameters: pathValido, body: bodyValido }),
        {} as any, () => {}
      );
      expect(res!.statusCode).toBe(404);
      expect(JSON.parse(res!.body).codigo).toBe("FX-MNT-073");
      expect(JSON.parse(res!.body).mensaje).toContain("CONTINGENCIA_DATATEC");
    });

    it("retorna 500 ante error", async () => {
      mockRepo.actualizar.mockRejectedValueOnce(new Error("err"));
      const res = await actualizar(
        mockEvent({ pathParameters: pathValido, body: bodyValido }),
        {} as any, () => {}
      );
      expect(res!.statusCode).toBe(500);
    });

    it("updatedBy es SISTEMA sin authorizer", async () => {
      mockRepo.actualizar.mockResolvedValueOnce({ ...paramResponse, updatedBy: "SISTEMA" });
      await actualizar(mockEvent({ pathParameters: pathValido, body: bodyValido }), {} as any, () => {});
      expect(mockRepo.actualizar).toHaveBeenCalledWith(
        "CONTINGENCIA_DATATEC", "ACTIVAR_CONTINGENCIA", "1", "SISTEMA"
      );
    });
  });
});
```

---

## Task 8: Verificar serverless.yml
Agregar o descomentar estas 2 funciones:

```yaml
listarParametrosSistema:
  handler: src/handlers/parametroSistema.handler.listar
  events:
    - http:
        path: /parametros/sistema
        method: GET
        cors: true

actualizarParametroSistema:
  handler: src/handlers/parametroSistema.handler.actualizar
  events:
    - http:
        path: /parametros/sistema/{grupo}/{clave}
        method: PUT
        cors: true
```

---

## Criterios de aceptación

```
□ npx tsc --noEmit                                          → 0 errores
□ npx jest tests/unit/parametroSistema                      → todos pasan
□ GET /parametros/sistema                                   → 200 con grupos y totales
□ GET /parametros/sistema?grupo=CONTINGENCIA_DATATEC        → 200 solo ese grupo
□ Grupos ordenados alfabéticamente en el response
□ PUT /parametros/sistema/CONTINGENCIA_DATATEC/ACTIVAR_CONTINGENCIA → 200
□ PUT valor="" → 400 FX-MNT-072
□ PUT sin grupo en path → 400 FX-MNT-070
□ PUT combinación inexistente → 404 FX-MNT-073
□ nombre y tipoValor NO cambian tras PUT
□ pk, sk, tipo nunca en response
□ totalParametros = suma de todos los parametros en todos los grupos
```
