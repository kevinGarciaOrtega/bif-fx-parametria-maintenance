# Tasks — Tipo de Cambio: TC Base + TC Ventanilla

---

## Task 1: src/models/tipoCambio.model.ts
Crear con exactamente este contenido:

```typescript
export type ParMoneda = "USD_PEN" | "EUR_PEN";
export type SegmentoVentanilla = "EMPLEADO" | "PREMIUM" | "PREFERENCIAL" | "PIZARRA";
export type EstadoVentana = "ACTIVO" | "CERRADO";
export type FuenteTC = "DATATEC" | "BLOOMBERG";

export interface TCBase {
  pk: string;
  sk: string;
  tipo: "TC_BASE";
  parMoneda: ParMoneda;
  monedaOrigen: string;
  monedaDestino: string;
  fuente: FuenteTC;
  fuenteCompra: string;
  valorCompra: number;
  fuenteVenta: string;
  valorVenta: number;
  ultimaActualizacion: string;
  estadoVentana: EstadoVentana;
  esEdicionManual: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface TCBaseAuditoria {
  pk: string;
  sk: string;
  tipo: "TC_BASE_AUDITORIA";
  parMoneda: ParMoneda;
  valorCompraAnterior: number;
  valorCompraNuevo: number;
  valorVentaAnterior: number;
  valorVentaNuevo: number;
  esEdicionManual: boolean;
  motivoEdicion: string;
  updatedAt: string;
  updatedBy: string;
}

export interface TCVentanilla {
  pk: string;
  sk: string;
  tipo: "TC_VENTANILLA";
  parMoneda: ParMoneda;
  segmento: SegmentoVentanilla;
  tcBaseCompraRef: number;
  tcBaseVentaRef: number;
  spreadCompraPips: number;
  spreadVentaPips: number;
  valorCompra: number;
  valorVenta: number;
  enviadoAt: string;
  enviadoBy: string;
}

export interface TCBaseResponse {
  parMoneda: string;
  monedaOrigen: string;
  monedaDestino: string;
  fuente: string;
  fuenteCompra: string;
  valorCompra: number;
  fuenteVenta: string;
  valorVenta: number;
  ultimaActualizacion: string;
  estadoVentana: string;
  esEdicionManual: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface TCBaseAuditoriaResponse {
  timestamp: string;
  valorCompraAnterior: number;
  valorCompraNuevo: number;
  valorVentaAnterior: number;
  valorVentaNuevo: number;
  esEdicionManual: boolean;
  motivoEdicion: string;
  updatedBy: string;
}

export interface TCVentanillaResponse {
  segmento: string;
  tcBaseCompraRef: number;
  tcBaseVentaRef: number;
  spreadCompraPips: number;
  spreadVentaPips: number;
  valorCompra: number;
  valorVenta: number;
  enviadoAt: string;
  enviadoBy: string;
}

export interface TCVentanillaSegmentoRequest {
  segmento: SegmentoVentanilla;
  spreadCompraPips: number;
  spreadVentaPips: number;
}

export interface TCBaseUpdateResult {
  data?: TCBaseResponse;
  error?: "NO_ENCONTRADO";
}

export interface TCVentanillaEnviarResult {
  data?: TCVentanillaResponse[];
  error?: "TC_BASE_NO_ENCONTRADO";
}
```

---

## Task 2: src/validators/schemas.ts
Agregar al archivo existente (después de SpreadClienteUpdateSchema):

```typescript
// ── TC BASE ─────────────────────────────────────────────────
export const TCBaseUpdateSchema = z.object({
  valorCompra: z
    .number({ invalid_type_error: "Valor compra debe ser un número" })
    .positive("Valor compra debe ser > 0"),
  valorVenta: z
    .number({ invalid_type_error: "Valor venta debe ser un número" })
    .positive("Valor venta debe ser > 0"),
  motivoEdicion: z
    .string({ required_error: "motivoEdicion es requerido" })
    .min(1, "motivoEdicion no puede estar vacío"),
}).refine((data) => data.valorVenta >= data.valorCompra, {
  message: "Valor venta debe ser >= valor compra",
  path: ["valorVenta"],
});

// ── TC VENTANILLA ───────────────────────────────────────────
const SEGMENTOS_VENTANILLA = ["EMPLEADO", "PREMIUM", "PREFERENCIAL", "PIZARRA"] as const;

export const TCVentanillaEnviarSchema = z.object({
  segmentos: z
    .array(
      z.object({
        segmento: z.enum(SEGMENTOS_VENTANILLA, {
          errorMap: () => ({ message: "segmento inválido" }),
        }),
        spreadCompraPips: z
          .number({ invalid_type_error: "spreadCompraPips debe ser un número" })
          .int("spreadCompraPips debe ser un número entero"),
        spreadVentaPips: z
          .number({ invalid_type_error: "spreadVentaPips debe ser un número" })
          .int("spreadVentaPips debe ser un número entero"),
      })
    )
    .length(4, "Deben enviarse exactamente 4 segmentos")
    .refine(
      (segs) => {
        const nombres = segs.map((s) => s.segmento);
        return SEGMENTOS_VENTANILLA.every((s) => nombres.includes(s));
      },
      { message: "Deben incluirse todos los segmentos: EMPLEADO, PREMIUM, PREFERENCIAL, PIZARRA" }
    ),
});

export type TCBaseUpdateInput = z.infer<typeof TCBaseUpdateSchema>;
export type TCVentanillaEnviarInput = z.infer<typeof TCVentanillaEnviarSchema>;
```

---

## Task 3: src/repositories/tipoCambio.repository.ts
Crear con exactamente este contenido:

```typescript
import {
  BatchWriteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { dynamo, TABLE } from "./dynamodb.client";
import {
  TCBase,
  TCBaseAuditoria,
  TCBaseAuditoriaResponse,
  TCBaseResponse,
  TCBaseUpdateResult,
  TCVentanilla,
  TCVentanillaEnviarResult,
  TCVentanillaResponse,
  TCVentanillaSegmentoRequest,
  ParMoneda,
} from "../models/tipoCambio.model";

const mapTCBaseToResponse = (item: TCBase): TCBaseResponse => ({
  parMoneda: item.parMoneda,
  monedaOrigen: item.monedaOrigen,
  monedaDestino: item.monedaDestino,
  fuente: item.fuente,
  fuenteCompra: item.fuenteCompra,
  valorCompra: item.valorCompra,
  fuenteVenta: item.fuenteVenta,
  valorVenta: item.valorVenta,
  ultimaActualizacion: item.ultimaActualizacion,
  estadoVentana: item.estadoVentana,
  esEdicionManual: item.esEdicionManual,
  updatedAt: item.updatedAt,
  updatedBy: item.updatedBy,
});

const mapAuditoriaToResponse = (item: TCBaseAuditoria): TCBaseAuditoriaResponse => ({
  timestamp: item.sk.replace("AUDITORIA#", ""),
  valorCompraAnterior: item.valorCompraAnterior,
  valorCompraNuevo: item.valorCompraNuevo,
  valorVentaAnterior: item.valorVentaAnterior,
  valorVentaNuevo: item.valorVentaNuevo,
  esEdicionManual: item.esEdicionManual,
  motivoEdicion: item.motivoEdicion,
  updatedBy: item.updatedBy,
});

const mapVentanillaToResponse = (item: TCVentanilla): TCVentanillaResponse => ({
  segmento: item.segmento,
  tcBaseCompraRef: item.tcBaseCompraRef,
  tcBaseVentaRef: item.tcBaseVentaRef,
  spreadCompraPips: item.spreadCompraPips,
  spreadVentaPips: item.spreadVentaPips,
  valorCompra: item.valorCompra,
  valorVenta: item.valorVenta,
  enviadoAt: item.enviadoAt,
  enviadoBy: item.enviadoBy,
});

const calcularValor = (tcBase: number, spreadPips: number): number =>
  Math.round((tcBase + spreadPips / 10000) * 1000000) / 1000000;

export const TipoCambioRepository = {

  async listarBase(): Promise<TCBaseResponse[]> {
    const result = await dynamo.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "#tipo = :tipo AND SK = :sk",
        ExpressionAttributeNames: { "#tipo": "tipo" },
        ExpressionAttributeValues: { ":tipo": "TC_BASE", ":sk": "ACTIVO" },
      })
    );
    if (!result.Items || result.Items.length === 0) return [];
    return (result.Items as TCBase[]).map(mapTCBaseToResponse);
  },

  async obtenerBaseActivo(parMoneda: ParMoneda): Promise<TCBase | null> {
    const result = await dynamo.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `TC_BASE#${parMoneda}`, SK: "ACTIVO" },
      })
    );
    if (!result.Item) return null;
    return result.Item as TCBase;
  },

  async actualizarBase(
    parMoneda: ParMoneda,
    valorCompra: number,
    valorVenta: number,
    motivoEdicion: string,
    usuario: string
  ): Promise<TCBaseUpdateResult> {
    const actual = await this.obtenerBaseActivo(parMoneda);
    if (!actual) return { error: "NO_ENCONTRADO" };

    const now = new Date().toISOString();

    // 1. Actualizar TC Base activo
    await dynamo.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `TC_BASE#${parMoneda}`, SK: "ACTIVO" },
        UpdateExpression:
          "SET valorCompra = :vc, valorVenta = :vv, esEdicionManual = :manual, " +
          "ultimaActualizacion = :ua, updatedAt = :updatedAt, updatedBy = :updatedBy",
        ExpressionAttributeValues: {
          ":vc": valorCompra,
          ":vv": valorVenta,
          ":manual": true,
          ":ua": now,
          ":updatedAt": now,
          ":updatedBy": usuario,
        },
      })
    );

    // 2. Crear registro de auditoría
    const auditoria: TCBaseAuditoria = {
      pk: `TC_BASE#${parMoneda}`,
      sk: `AUDITORIA#${now}`,
      tipo: "TC_BASE_AUDITORIA",
      parMoneda,
      valorCompraAnterior: actual.valorCompra,
      valorCompraNuevo: valorCompra,
      valorVentaAnterior: actual.valorVenta,
      valorVentaNuevo: valorVenta,
      esEdicionManual: true,
      motivoEdicion,
      updatedAt: now,
      updatedBy: usuario,
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: auditoria }));

    return {
      data: {
        ...mapTCBaseToResponse(actual),
        valorCompra,
        valorVenta,
        esEdicionManual: true,
        ultimaActualizacion: now,
        updatedAt: now,
        updatedBy: usuario,
      },
    };
  },

  async obtenerAuditoria(parMoneda: ParMoneda): Promise<TCBaseAuditoriaResponse[]> {
    const result = await dynamo.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": `TC_BASE#${parMoneda}`,
          ":sk": "AUDITORIA#",
        },
      })
    );
    if (!result.Items || result.Items.length === 0) return [];
    return (result.Items as TCBaseAuditoria[])
      .sort((a, b) => b.sk.localeCompare(a.sk)) // DESC
      .map(mapAuditoriaToResponse);
  },

  async listarVentanilla(parMoneda: ParMoneda): Promise<TCVentanillaResponse[]> {
    const result = await dynamo.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": `TC_VENTANILLA#${parMoneda}`,
          ":sk": "SEGMENTO#",
        },
      })
    );
    if (!result.Items || result.Items.length === 0) return [];
    return (result.Items as TCVentanilla[]).map(mapVentanillaToResponse);
  },

  async enviarVentanilla(
    parMoneda: ParMoneda,
    segmentos: TCVentanillaSegmentoRequest[],
    usuario: string
  ): Promise<TCVentanillaEnviarResult> {
    const tcBase = await this.obtenerBaseActivo(parMoneda);
    if (!tcBase) return { error: "TC_BASE_NO_ENCONTRADO" };

    const now = new Date().toISOString();

    const items: TCVentanilla[] = segmentos.map((seg) => ({
      pk: `TC_VENTANILLA#${parMoneda}`,
      sk: `SEGMENTO#${seg.segmento}`,
      tipo: "TC_VENTANILLA",
      parMoneda,
      segmento: seg.segmento,
      tcBaseCompraRef: tcBase.valorCompra,
      tcBaseVentaRef: tcBase.valorVenta,
      spreadCompraPips: seg.spreadCompraPips,
      spreadVentaPips: seg.spreadVentaPips,
      valorCompra: calcularValor(tcBase.valorCompra, seg.spreadCompraPips),
      valorVenta: calcularValor(tcBase.valorVenta, seg.spreadVentaPips),
      enviadoAt: now,
      enviadoBy: usuario,
    }));

    await dynamo.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE]: items.map((item) => ({ PutRequest: { Item: item } })),
        },
      })
    );

    return { data: items.map(mapVentanillaToResponse) };
  },
};
```

---

## Task 4: src/handlers/tipoCambio.handler.ts
Crear con exactamente este contenido:

```typescript
import { APIGatewayProxyHandler } from "aws-lambda";
import { TipoCambioRepository } from "../repositories/tipoCambio.repository";
import { TCBaseUpdateSchema, TCVentanillaEnviarSchema } from "../validators/schemas";
import { ok, created, badRequest, notFound, serverError } from "../utils/response.util";
import { getUsuario } from "../utils/audit.util";
import { ParMoneda } from "../models/tipoCambio.model";

const PARES_VALIDOS: ParMoneda[] = ["USD_PEN", "EUR_PEN"];

const validarParMoneda = (par: string | undefined): ParMoneda | null => {
  if (!par || !PARES_VALIDOS.includes(par as ParMoneda)) return null;
  return par as ParMoneda;
};

export const obtenerBase: APIGatewayProxyHandler = async () => {
  try {
    const data = await TipoCambioRepository.listarBase();
    return ok({ data, total: data.length });
  } catch (error) {
    return serverError(error);
  }
};

export const editarBase: APIGatewayProxyHandler = async (event) => {
  try {
    const parMoneda = validarParMoneda(event.pathParameters?.parMoneda);
    if (!parMoneda) {
      return badRequest("FX-TC-001", `parMoneda inválido. Valores permitidos: ${PARES_VALIDOS.join(", ")}`);
    }

    let body: unknown;
    try {
      body = JSON.parse(event.body ?? "{}");
    } catch {
      return badRequest("FX-TC-002", "Body inválido, se esperaba JSON");
    }

    const parsed = TCBaseUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("FX-TC-002", parsed.error.errors[0].message);
    }

    const usuario = getUsuario(event);
    const result = await TipoCambioRepository.actualizarBase(
      parMoneda,
      parsed.data.valorCompra,
      parsed.data.valorVenta,
      parsed.data.motivoEdicion,
      usuario
    );

    if (result.error === "NO_ENCONTRADO") {
      return notFound("FX-TC-003", `TC Base ${parMoneda} no encontrado`);
    }
    return ok(result.data!);
  } catch (error) {
    return serverError(error);
  }
};

export const auditoriaBase: APIGatewayProxyHandler = async (event) => {
  try {
    const parMoneda = validarParMoneda(event.pathParameters?.parMoneda);
    if (!parMoneda) {
      return badRequest("FX-TC-001", `parMoneda inválido. Valores permitidos: ${PARES_VALIDOS.join(", ")}`);
    }

    const data = await TipoCambioRepository.obtenerAuditoria(parMoneda);
    return ok({ parMoneda, data, total: data.length });
  } catch (error) {
    return serverError(error);
  }
};

export const obtenerVentanilla: APIGatewayProxyHandler = async (event) => {
  try {
    const parMoneda = validarParMoneda(event.pathParameters?.parMoneda);
    if (!parMoneda) {
      return badRequest("FX-TC-001", `parMoneda inválido. Valores permitidos: ${PARES_VALIDOS.join(", ")}`);
    }

    const data = await TipoCambioRepository.listarVentanilla(parMoneda);
    return ok({ parMoneda, data, total: data.length });
  } catch (error) {
    return serverError(error);
  }
};

export const enviarVentanilla: APIGatewayProxyHandler = async (event) => {
  try {
    const parMoneda = validarParMoneda(event.pathParameters?.parMoneda);
    if (!parMoneda) {
      return badRequest("FX-TC-001", `parMoneda inválido. Valores permitidos: ${PARES_VALIDOS.join(", ")}`);
    }

    let body: unknown;
    try {
      body = JSON.parse(event.body ?? "{}");
    } catch {
      return badRequest("FX-TC-004", "Body inválido, se esperaba JSON");
    }

    const parsed = TCVentanillaEnviarSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("FX-TC-004", parsed.error.errors[0].message);
    }

    const usuario = getUsuario(event);
    const result = await TipoCambioRepository.enviarVentanilla(
      parMoneda,
      parsed.data.segmentos,
      usuario
    );

    if (result.error === "TC_BASE_NO_ENCONTRADO") {
      return notFound("FX-TC-003", `TC Base ${parMoneda} no encontrado`);
    }
    return created({ parMoneda, data: result.data, total: result.data!.length });
  } catch (error) {
    return serverError(error);
  }
};
```

---

## Task 5: tests/unit/tipoCambio.validator.test.ts
Crear con exactamente este contenido:

```typescript
import { TCBaseUpdateSchema, TCVentanillaEnviarSchema } from "../../src/validators/schemas";

describe("TCBaseUpdateSchema", () => {
  const bodyValido = { valorCompra: 3.368, valorVenta: 3.370, motivoEdicion: "Contingencia Datatec" };

  describe("casos válidos", () => {
    it("acepta valores correctos", () => {
      expect(TCBaseUpdateSchema.safeParse(bodyValido).success).toBe(true);
    });
    it("acepta valorVenta = valorCompra", () => {
      expect(TCBaseUpdateSchema.safeParse({ ...bodyValido, valorVenta: 3.368 }).success).toBe(true);
    });
  });

  describe("validación valorCompra", () => {
    it("rechaza negativo", () => {
      const r = TCBaseUpdateSchema.safeParse({ ...bodyValido, valorCompra: -1 });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("Valor compra debe ser > 0");
    });
    it("rechaza cero", () => {
      expect(TCBaseUpdateSchema.safeParse({ ...bodyValido, valorCompra: 0 }).success).toBe(false);
    });
    it("rechaza string", () => {
      const r = TCBaseUpdateSchema.safeParse({ ...bodyValido, valorCompra: "3.368" });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("Valor compra debe ser un número");
    });
  });

  describe("validación valorVenta >= valorCompra", () => {
    it("rechaza valorVenta < valorCompra", () => {
      const r = TCBaseUpdateSchema.safeParse({ ...bodyValido, valorCompra: 3.370, valorVenta: 3.368 });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("Valor venta debe ser >= valor compra");
    });
  });

  describe("validación motivoEdicion", () => {
    it("rechaza vacío", () => {
      const r = TCBaseUpdateSchema.safeParse({ ...bodyValido, motivoEdicion: "" });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("motivoEdicion no puede estar vacío");
    });
    it("rechaza ausente", () => {
      const { motivoEdicion: _, ...sin } = bodyValido;
      const r = TCBaseUpdateSchema.safeParse(sin);
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("motivoEdicion es requerido");
    });
  });
});

describe("TCVentanillaEnviarSchema", () => {
  const seg4 = [
    { segmento: "EMPLEADO",    spreadCompraPips: -5,   spreadVentaPips: 5   },
    { segmento: "PREMIUM",     spreadCompraPips: -55,  spreadVentaPips: 55  },
    { segmento: "PREFERENCIAL",spreadCompraPips: -180, spreadVentaPips: 180 },
    { segmento: "PIZARRA",     spreadCompraPips: -220, spreadVentaPips: 220 },
  ];

  describe("casos válidos", () => {
    it("acepta 4 segmentos correctos con spreads negativos", () => {
      expect(TCVentanillaEnviarSchema.safeParse({ segmentos: seg4 }).success).toBe(true);
    });
    it("acepta spreads positivos y cero", () => {
      const seg4pos = seg4.map((s) => ({ ...s, spreadCompraPips: 0, spreadVentaPips: 100 }));
      expect(TCVentanillaEnviarSchema.safeParse({ segmentos: seg4pos }).success).toBe(true);
    });
  });

  describe("validación cantidad de segmentos", () => {
    it("rechaza menos de 4 segmentos", () => {
      const r = TCVentanillaEnviarSchema.safeParse({ segmentos: seg4.slice(0, 3) });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toBe("Deben enviarse exactamente 4 segmentos");
    });
    it("rechaza más de 4 segmentos", () => {
      const r = TCVentanillaEnviarSchema.safeParse({ segmentos: [...seg4, { segmento: "EMPLEADO", spreadCompraPips: 0, spreadVentaPips: 0 }] });
      expect(r.success).toBe(false);
    });
    it("rechaza array vacío", () => {
      expect(TCVentanillaEnviarSchema.safeParse({ segmentos: [] }).success).toBe(false);
    });
  });

  describe("validación segmentos completos", () => {
    it("rechaza si falta un segmento obligatorio", () => {
      const sinPizarra = seg4.map((s) =>
        s.segmento === "PIZARRA" ? { ...s, segmento: "EMPLEADO" } : s
      );
      const r = TCVentanillaEnviarSchema.safeParse({ segmentos: sinPizarra });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.errors[0].message).toContain("todos los segmentos");
    });
  });

  describe("validación spreads", () => {
    it("rechaza spreadCompraPips decimal", () => {
      const segInvalido = seg4.map((s, i) => i === 0 ? { ...s, spreadCompraPips: 10.5 } : s);
      const r = TCVentanillaEnviarSchema.safeParse({ segmentos: segInvalido });
      expect(r.success).toBe(false);
    });
    it("rechaza spreadVentaPips como string", () => {
      const segInvalido = seg4.map((s, i) => i === 0 ? { ...s, spreadVentaPips: "5" } : s);
      expect(TCVentanillaEnviarSchema.safeParse({ segmentos: segInvalido }).success).toBe(false);
    });
  });
});
```

---

## Task 6: tests/unit/tipoCambio.repository.test.ts
Crear con exactamente este contenido:

```typescript
import { TipoCambioRepository } from "../../src/repositories/tipoCambio.repository";
import { dynamo } from "../../src/repositories/dynamodb.client";

jest.mock("../../src/repositories/dynamodb.client", () => ({
  dynamo: { send: jest.fn() },
  TABLE: "tablero-test",
}));

const mockSend = dynamo.send as jest.Mock;

const tcBaseUSD: any = {
  pk: "TC_BASE#USD_PEN", sk: "ACTIVO", tipo: "TC_BASE",
  parMoneda: "USD_PEN", monedaOrigen: "USD", monedaDestino: "PEN",
  fuente: "DATATEC",
  fuenteCompra: "TIPO CAMBIO DATATEC COMPRA", valorCompra: 3.368,
  fuenteVenta: "TIPO CAMBIO DATATEC VENTA",   valorVenta: 3.370,
  ultimaActualizacion: "2026-02-05T08:00:00Z",
  estadoVentana: "CERRADO", esEdicionManual: false,
  updatedAt: "2026-02-05T08:00:00Z", updatedBy: "SISTEMA",
};

const auditoriaItem: any = {
  pk: "TC_BASE#USD_PEN", sk: "AUDITORIA#2026-06-03T10:00:00Z",
  tipo: "TC_BASE_AUDITORIA", parMoneda: "USD_PEN",
  valorCompraAnterior: 3.360, valorCompraNuevo: 3.368,
  valorVentaAnterior: 3.362, valorVentaNuevo: 3.370,
  esEdicionManual: true, motivoEdicion: "Contingencia",
  updatedAt: "2026-06-03T10:00:00Z", updatedBy: "ANA.TORRES",
};

describe("TipoCambioRepository", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("listarBase()", () => {
    it("retorna lista mapeada sin pk/sk/tipo", async () => {
      mockSend.mockResolvedValueOnce({ Items: [tcBaseUSD] });
      const r = await TipoCambioRepository.listarBase();
      expect(r[0].parMoneda).toBe("USD_PEN");
      expect(r[0]).not.toHaveProperty("pk");
      expect(r[0]).not.toHaveProperty("sk");
      expect(r[0]).not.toHaveProperty("tipo");
    });
    it("retorna vacío sin items", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      expect(await TipoCambioRepository.listarBase()).toEqual([]);
    });
    it("filtra por tipo=TC_BASE y SK=ACTIVO", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      await TipoCambioRepository.listarBase();
      const arg = mockSend.mock.calls[0][0].input;
      expect(arg.ExpressionAttributeValues[":tipo"]).toBe("TC_BASE");
      expect(arg.ExpressionAttributeValues[":sk"]).toBe("ACTIVO");
    });
  });

  describe("obtenerBaseActivo()", () => {
    it("retorna TCBase cuando existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: tcBaseUSD });
      const r = await TipoCambioRepository.obtenerBaseActivo("USD_PEN");
      expect(r?.parMoneda).toBe("USD_PEN");
    });
    it("retorna null cuando no existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      expect(await TipoCambioRepository.obtenerBaseActivo("USD_PEN")).toBeNull();
    });
    it("construye PK y SK correctamente", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      await TipoCambioRepository.obtenerBaseActivo("USD_PEN");
      const arg = mockSend.mock.calls[0][0].input;
      expect(arg.Key.PK).toBe("TC_BASE#USD_PEN");
      expect(arg.Key.SK).toBe("ACTIVO");
    });
  });

  describe("actualizarBase()", () => {
    it("retorna NO_ENCONTRADO si no existe", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      const r = await TipoCambioRepository.actualizarBase("USD_PEN", 3.370, 3.375, "Test", "SISTEMA");
      expect(r.error).toBe("NO_ENCONTRADO");
    });

    it("ejecuta UpdateCommand + PutCommand (auditoría)", async () => {
      mockSend
        .mockResolvedValueOnce({ Item: tcBaseUSD }) // GetCommand
        .mockResolvedValueOnce({})                  // UpdateCommand
        .mockResolvedValueOnce({});                 // PutCommand auditoria
      await TipoCambioRepository.actualizarBase("USD_PEN", 3.370, 3.375, "Motivo", "ANA.TORRES");
      expect(mockSend).toHaveBeenCalledTimes(3);
    });

    it("retorna datos actualizados con esEdicionManual=true", async () => {
      mockSend
        .mockResolvedValueOnce({ Item: tcBaseUSD })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});
      const r = await TipoCambioRepository.actualizarBase("USD_PEN", 3.370, 3.375, "Motivo", "ANA.TORRES");
      expect(r.data?.valorCompra).toBe(3.370);
      expect(r.data?.valorVenta).toBe(3.375);
      expect(r.data?.esEdicionManual).toBe(true);
      expect(r.data?.updatedBy).toBe("ANA.TORRES");
    });

    it("auditoría registra valores anteriores y nuevos", async () => {
      mockSend
        .mockResolvedValueOnce({ Item: tcBaseUSD })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});
      await TipoCambioRepository.actualizarBase("USD_PEN", 3.370, 3.375, "Motivo", "SISTEMA");
      const putArg = mockSend.mock.calls[2][0].input;
      expect(putArg.Item.valorCompraAnterior).toBe(3.368);
      expect(putArg.Item.valorCompraNuevo).toBe(3.370);
      expect(putArg.Item.motivoEdicion).toBe("Motivo");
      expect(putArg.Item.sk).toMatch(/^AUDITORIA#/);
    });
  });

  describe("obtenerAuditoria()", () => {
    it("retorna historial mapeado y ordenado DESC", async () => {
      const aud2: any = { ...auditoriaItem, sk: "AUDITORIA#2026-06-01T08:00:00Z" };
      mockSend.mockResolvedValueOnce({ Items: [aud2, auditoriaItem] });
      const r = await TipoCambioRepository.obtenerAuditoria("USD_PEN");
      expect(r[0].timestamp).toBe("2026-06-03T10:00:00Z"); // más reciente primero
      expect(r[1].timestamp).toBe("2026-06-01T08:00:00Z");
    });
    it("retorna vacío sin auditorías", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      expect(await TipoCambioRepository.obtenerAuditoria("USD_PEN")).toEqual([]);
    });
    it("usa QueryCommand con begins_with AUDITORIA#", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      await TipoCambioRepository.obtenerAuditoria("USD_PEN");
      const arg = mockSend.mock.calls[0][0].input;
      expect(arg.ExpressionAttributeValues[":pk"]).toBe("TC_BASE#USD_PEN");
      expect(arg.ExpressionAttributeValues[":sk"]).toBe("AUDITORIA#");
    });
  });

  describe("listarVentanilla()", () => {
    const ventItem: any = {
      pk: "TC_VENTANILLA#USD_PEN", sk: "SEGMENTO#EMPLEADO", tipo: "TC_VENTANILLA",
      parMoneda: "USD_PEN", segmento: "EMPLEADO",
      tcBaseCompraRef: 3.368, tcBaseVentaRef: 3.370,
      spreadCompraPips: -5, spreadVentaPips: 5,
      valorCompra: 3.3675, valorVenta: 3.3705,
      enviadoAt: "2026-06-03T10:00:00Z", enviadoBy: "ANA.TORRES",
    };
    it("retorna registros mapeados", async () => {
      mockSend.mockResolvedValueOnce({ Items: [ventItem] });
      const r = await TipoCambioRepository.listarVentanilla("USD_PEN");
      expect(r[0].segmento).toBe("EMPLEADO");
      expect(r[0]).not.toHaveProperty("pk");
    });
    it("usa QueryCommand con PK=TC_VENTANILLA#USD_PEN", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      await TipoCambioRepository.listarVentanilla("USD_PEN");
      expect(mockSend.mock.calls[0][0].input.ExpressionAttributeValues[":pk"]).toBe("TC_VENTANILLA#USD_PEN");
    });
  });

  describe("enviarVentanilla()", () => {
    const seg4 = [
      { segmento: "EMPLEADO",    spreadCompraPips: -5,   spreadVentaPips: 5   },
      { segmento: "PREMIUM",     spreadCompraPips: -55,  spreadVentaPips: 55  },
      { segmento: "PREFERENCIAL",spreadCompraPips: -180, spreadVentaPips: 180 },
      { segmento: "PIZARRA",     spreadCompraPips: -220, spreadVentaPips: 220 },
    ];

    it("retorna TC_BASE_NO_ENCONTRADO si no hay TC Base activo", async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      const r = await TipoCambioRepository.enviarVentanilla("USD_PEN", seg4 as any, "SISTEMA");
      expect(r.error).toBe("TC_BASE_NO_ENCONTRADO");
    });

    it("calcula valorCompra y valorVenta correctamente", async () => {
      mockSend.mockResolvedValueOnce({ Item: tcBaseUSD }).mockResolvedValueOnce({});
      const r = await TipoCambioRepository.enviarVentanilla("USD_PEN", seg4 as any, "ANA.TORRES");
      const empleado = r.data?.find((s) => s.segmento === "EMPLEADO");
      // 3.368 + (-5/10000) = 3.3675
      expect(empleado?.valorCompra).toBe(3.3675);
      // 3.370 + (5/10000) = 3.3705
      expect(empleado?.valorVenta).toBe(3.3705);
    });

    it("guarda tcBaseCompraRef y tcBaseVentaRef del TC Base actual", async () => {
      mockSend.mockResolvedValueOnce({ Item: tcBaseUSD }).mockResolvedValueOnce({});
      const r = await TipoCambioRepository.enviarVentanilla("USD_PEN", seg4 as any, "SISTEMA");
      expect(r.data?.[0].tcBaseCompraRef).toBe(3.368);
      expect(r.data?.[0].tcBaseVentaRef).toBe(3.370);
    });

    it("llama BatchWriteCommand con 4 items", async () => {
      mockSend.mockResolvedValueOnce({ Item: tcBaseUSD }).mockResolvedValueOnce({});
      await TipoCambioRepository.enviarVentanilla("USD_PEN", seg4 as any, "SISTEMA");
      const batchArg = mockSend.mock.calls[1][0].input;
      expect(batchArg.RequestItems["tablero-test"]).toHaveLength(4);
    });
  });
});
```

---

## Task 7: tests/unit/tipoCambio.handler.test.ts
Crear con exactamente este contenido:

```typescript
import { APIGatewayProxyEvent } from "aws-lambda";
import { obtenerBase, editarBase, auditoriaBase, obtenerVentanilla, enviarVentanilla } from "../../src/handlers/tipoCambio.handler";
import { TipoCambioRepository } from "../../src/repositories/tipoCambio.repository";

jest.mock("../../src/repositories/tipoCambio.repository");
const mockRepo = TipoCambioRepository as jest.Mocked<typeof TipoCambioRepository>;

const mockEvent = (o: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent =>
  ({ pathParameters: null, body: null, requestContext: { authorizer: null } as any,
     headers: {}, multiValueHeaders: {}, httpMethod: "GET", isBase64Encoded: false,
     path: "/", queryStringParameters: null, multiValueQueryStringParameters: null,
     stageVariables: null, resource: "/", ...o } as APIGatewayProxyEvent);

const tcBaseResponse = {
  parMoneda: "USD_PEN", monedaOrigen: "USD", monedaDestino: "PEN",
  fuente: "DATATEC", fuenteCompra: "COMPRA", valorCompra: 3.368,
  fuenteVenta: "VENTA", valorVenta: 3.370,
  ultimaActualizacion: "2026-02-05T08:00:00Z",
  estadoVentana: "CERRADO", esEdicionManual: false,
  updatedAt: "2026-02-05T08:00:00Z", updatedBy: "SISTEMA",
};

const auditoriaResponse = {
  timestamp: "2026-06-03T10:00:00Z",
  valorCompraAnterior: 3.368, valorCompraNuevo: 3.370,
  valorVentaAnterior: 3.370, valorVentaNuevo: 3.375,
  esEdicionManual: true, motivoEdicion: "Contingencia",
  updatedBy: "ANA.TORRES",
};

const ventResponse = {
  segmento: "EMPLEADO", tcBaseCompraRef: 3.368, tcBaseVentaRef: 3.370,
  spreadCompraPips: -5, spreadVentaPips: 5,
  valorCompra: 3.3675, valorVenta: 3.3705,
  enviadoAt: "2026-06-03T10:00:00Z", enviadoBy: "ANA.TORRES",
};

const seg4Body = JSON.stringify({
  segmentos: [
    { segmento: "EMPLEADO",    spreadCompraPips: -5,   spreadVentaPips: 5   },
    { segmento: "PREMIUM",     spreadCompraPips: -55,  spreadVentaPips: 55  },
    { segmento: "PREFERENCIAL",spreadCompraPips: -180, spreadVentaPips: 180 },
    { segmento: "PIZARRA",     spreadCompraPips: -220, spreadVentaPips: 220 },
  ],
});

describe("tipoCambio.handler", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("obtenerBase()", () => {
    it("retorna 200 con TC Base", async () => {
      mockRepo.listarBase.mockResolvedValueOnce([tcBaseResponse]);
      const res = await obtenerBase(mockEvent(), {} as any, () => {});
      expect(res!.statusCode).toBe(200); expect(JSON.parse(res!.body).total).toBe(1);
    });
    it("retorna 500 ante error", async () => {
      mockRepo.listarBase.mockRejectedValueOnce(new Error("err"));
      expect((await obtenerBase(mockEvent(), {} as any, () => {}))!.statusCode).toBe(500);
    });
  });

  describe("editarBase()", () => {
    const bodyValido = JSON.stringify({ valorCompra: 3.370, valorVenta: 3.375, motivoEdicion: "Contingencia" });
    it("retorna 200 actualizado", async () => {
      mockRepo.actualizarBase.mockResolvedValueOnce({ data: { ...tcBaseResponse, valorCompra: 3.370 } });
      const res = await editarBase(mockEvent({ pathParameters: { parMoneda: "USD_PEN" }, body: bodyValido }), {} as any, () => {});
      expect(res!.statusCode).toBe(200);
    });
    it("retorna 400 FX-TC-001 parMoneda inválido", async () => {
      const res = await editarBase(mockEvent({ pathParameters: { parMoneda: "GBP_PEN" }, body: bodyValido }), {} as any, () => {});
      expect(res!.statusCode).toBe(400); expect(JSON.parse(res!.body).codigo).toBe("FX-TC-001");
    });
    it("retorna 400 FX-TC-002 valorVenta < valorCompra", async () => {
      const res = await editarBase(mockEvent({ pathParameters: { parMoneda: "USD_PEN" }, body: JSON.stringify({ valorCompra: 3.375, valorVenta: 3.368, motivoEdicion: "test" }) }), {} as any, () => {});
      expect(res!.statusCode).toBe(400); expect(JSON.parse(res!.body).codigo).toBe("FX-TC-002");
    });
    it("retorna 400 FX-TC-002 motivoEdicion vacío", async () => {
      const res = await editarBase(mockEvent({ pathParameters: { parMoneda: "USD_PEN" }, body: JSON.stringify({ valorCompra: 3.368, valorVenta: 3.370, motivoEdicion: "" }) }), {} as any, () => {});
      expect(res!.statusCode).toBe(400); expect(JSON.parse(res!.body).codigo).toBe("FX-TC-002");
    });
    it("retorna 404 FX-TC-003 no existe", async () => {
      mockRepo.actualizarBase.mockResolvedValueOnce({ error: "NO_ENCONTRADO" });
      const res = await editarBase(mockEvent({ pathParameters: { parMoneda: "USD_PEN" }, body: bodyValido }), {} as any, () => {});
      expect(res!.statusCode).toBe(404); expect(JSON.parse(res!.body).codigo).toBe("FX-TC-003");
    });
    it("retorna 500 ante error", async () => {
      mockRepo.actualizarBase.mockRejectedValueOnce(new Error("err"));
      const res = await editarBase(mockEvent({ pathParameters: { parMoneda: "USD_PEN" }, body: bodyValido }), {} as any, () => {});
      expect(res!.statusCode).toBe(500);
    });
  });

  describe("auditoriaBase()", () => {
    it("retorna 200 con historial", async () => {
      mockRepo.obtenerAuditoria.mockResolvedValueOnce([auditoriaResponse]);
      const res = await auditoriaBase(mockEvent({ pathParameters: { parMoneda: "USD_PEN" } }), {} as any, () => {});
      expect(res!.statusCode).toBe(200);
      const b = JSON.parse(res!.body); expect(b.parMoneda).toBe("USD_PEN"); expect(b.total).toBe(1);
    });
    it("retorna 400 FX-TC-001 parMoneda inválido", async () => {
      const res = await auditoriaBase(mockEvent({ pathParameters: { parMoneda: "INVALIDO" } }), {} as any, () => {});
      expect(res!.statusCode).toBe(400); expect(JSON.parse(res!.body).codigo).toBe("FX-TC-001");
    });
    it("retorna 500 ante error", async () => {
      mockRepo.obtenerAuditoria.mockRejectedValueOnce(new Error("err"));
      const res = await auditoriaBase(mockEvent({ pathParameters: { parMoneda: "USD_PEN" } }), {} as any, () => {});
      expect(res!.statusCode).toBe(500);
    });
  });

  describe("obtenerVentanilla()", () => {
    it("retorna 200 con segmentos", async () => {
      mockRepo.listarVentanilla.mockResolvedValueOnce([ventResponse]);
      const res = await obtenerVentanilla(mockEvent({ pathParameters: { parMoneda: "USD_PEN" } }), {} as any, () => {});
      expect(res!.statusCode).toBe(200); expect(JSON.parse(res!.body).parMoneda).toBe("USD_PEN");
    });
    it("retorna 400 FX-TC-001 parMoneda inválido", async () => {
      const res = await obtenerVentanilla(mockEvent({ pathParameters: { parMoneda: "INVALIDO" } }), {} as any, () => {});
      expect(res!.statusCode).toBe(400); expect(JSON.parse(res!.body).codigo).toBe("FX-TC-001");
    });
    it("retorna 500 ante error", async () => {
      mockRepo.listarVentanilla.mockRejectedValueOnce(new Error("err"));
      const res = await obtenerVentanilla(mockEvent({ pathParameters: { parMoneda: "USD_PEN" } }), {} as any, () => {});
      expect(res!.statusCode).toBe(500);
    });
  });

  describe("enviarVentanilla()", () => {
    it("retorna 201 con 4 segmentos", async () => {
      mockRepo.enviarVentanilla.mockResolvedValueOnce({ data: [ventResponse, ventResponse, ventResponse, ventResponse] });
      const res = await enviarVentanilla(mockEvent({ pathParameters: { parMoneda: "USD_PEN" }, body: seg4Body }), {} as any, () => {});
      expect(res!.statusCode).toBe(201); expect(JSON.parse(res!.body).total).toBe(4);
    });
    it("retorna 400 FX-TC-001 parMoneda inválido", async () => {
      const res = await enviarVentanilla(mockEvent({ pathParameters: { parMoneda: "INVALIDO" }, body: seg4Body }), {} as any, () => {});
      expect(res!.statusCode).toBe(400); expect(JSON.parse(res!.body).codigo).toBe("FX-TC-001");
    });
    it("retorna 400 FX-TC-004 menos de 4 segmentos", async () => {
      const body3 = JSON.stringify({ segmentos: [{ segmento: "EMPLEADO", spreadCompraPips: 0, spreadVentaPips: 0 }, { segmento: "PREMIUM", spreadCompraPips: 0, spreadVentaPips: 0 }, { segmento: "PREFERENCIAL", spreadCompraPips: 0, spreadVentaPips: 0 }] });
      const res = await enviarVentanilla(mockEvent({ pathParameters: { parMoneda: "USD_PEN" }, body: body3 }), {} as any, () => {});
      expect(res!.statusCode).toBe(400); expect(JSON.parse(res!.body).codigo).toBe("FX-TC-004");
    });
    it("retorna 400 FX-TC-004 spreadCompraPips decimal", async () => {
      const bodyDecimal = JSON.stringify({ segmentos: [{ segmento: "EMPLEADO", spreadCompraPips: 10.5, spreadVentaPips: 5 }, { segmento: "PREMIUM", spreadCompraPips: 0, spreadVentaPips: 0 }, { segmento: "PREFERENCIAL", spreadCompraPips: 0, spreadVentaPips: 0 }, { segmento: "PIZARRA", spreadCompraPips: 0, spreadVentaPips: 0 }] });
      const res = await enviarVentanilla(mockEvent({ pathParameters: { parMoneda: "USD_PEN" }, body: bodyDecimal }), {} as any, () => {});
      expect(res!.statusCode).toBe(400); expect(JSON.parse(res!.body).codigo).toBe("FX-TC-004");
    });
    it("retorna 404 FX-TC-003 TC Base no encontrado", async () => {
      mockRepo.enviarVentanilla.mockResolvedValueOnce({ error: "TC_BASE_NO_ENCONTRADO" });
      const res = await enviarVentanilla(mockEvent({ pathParameters: { parMoneda: "USD_PEN" }, body: seg4Body }), {} as any, () => {});
      expect(res!.statusCode).toBe(404); expect(JSON.parse(res!.body).codigo).toBe("FX-TC-003");
    });
    it("retorna 500 ante error", async () => {
      mockRepo.enviarVentanilla.mockRejectedValueOnce(new Error("err"));
      const res = await enviarVentanilla(mockEvent({ pathParameters: { parMoneda: "USD_PEN" }, body: seg4Body }), {} as any, () => {});
      expect(res!.statusCode).toBe(500);
    });
  });
});
```

---

## Task 8: Verificar serverless.yml
Agregar o descomentar estas 5 funciones:

```yaml
obtenerTCBase:
  handler: src/handlers/tipoCambio.handler.obtenerBase
  events:
    - http:
        path: /tipo-cambio/base
        method: GET
        cors: true

editarTCBase:
  handler: src/handlers/tipoCambio.handler.editarBase
  events:
    - http:
        path: /tipo-cambio/base/{parMoneda}
        method: PUT
        cors: true

auditoriaTCBase:
  handler: src/handlers/tipoCambio.handler.auditoriaBase
  events:
    - http:
        path: /tipo-cambio/base/{parMoneda}/auditoria
        method: GET
        cors: true

obtenerTCVentanilla:
  handler: src/handlers/tipoCambio.handler.obtenerVentanilla
  events:
    - http:
        path: /tipo-cambio/ventanilla/{parMoneda}
        method: GET
        cors: true

enviarTCVentanilla:
  handler: src/handlers/tipoCambio.handler.enviarVentanilla
  events:
    - http:
        path: /tipo-cambio/ventanilla/{parMoneda}
        method: POST
        cors: true
```

---

## Criterios de aceptación

```
□ npx tsc --noEmit                                      → 0 errores
□ npx jest tests/unit/tipoCambio                        → todos pasan
□ GET /tipo-cambio/base                                 → 200 con TC Base activos
□ PUT /tipo-cambio/base/USD_PEN                         → 200 + auditoría creada
□ PUT valorVenta < valorCompra                          → 400 FX-TC-002
□ PUT motivoEdicion vacío                               → 400 FX-TC-002
□ PUT parMoneda=GBP_PEN                                 → 400 FX-TC-001
□ GET /tipo-cambio/base/USD_PEN/auditoria               → 200 ordenado DESC
□ GET /tipo-cambio/ventanilla/USD_PEN                   → 200 con 4 segmentos
□ POST /tipo-cambio/ventanilla/USD_PEN 4 segmentos      → 201
□ POST solo 3 segmentos                                 → 400 FX-TC-004
□ POST spreadCompraPips decimal                         → 400 FX-TC-004
□ POST TC Base no existe                                → 404 FX-TC-003
□ valorCompra = tcBase + spreadCompra/10000
□ pk, sk, tipo nunca en response
```
