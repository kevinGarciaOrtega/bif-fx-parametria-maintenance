/**
 * Integration tests for Volatilidad endpoints.
 * These tests require DynamoDB Local running at http://localhost:8000.
 * If DynamoDB Local is not available, all tests are skipped gracefully.
 */

import {
  DynamoDBClient,
  ListTablesCommand,
  BatchWriteItemCommand,
  ScanCommand as ScanCommandRaw,
} from "@aws-sdk/client-dynamodb";
import * as path from "path";
import * as fs from "fs";

// ── Set env vars BEFORE importing the repository so the client picks them up ──
process.env.STAGE = "dev";
process.env.DYNAMO_TABLE = "tablero-dev";

// Import repository AFTER env vars are set
import { VolatilidadRepository } from "../../src/repositories/volatilidad.repository";

// ── DynamoDB Local client (used for setup/teardown) ──────────────────────────
const LOCAL_ENDPOINT = "http://localhost:8000";
const TABLE_NAME = "tablero-dev";

const localClient = new DynamoDBClient({
  endpoint: LOCAL_ENDPOINT,
  region: "us-east-1",
  credentials: { accessKeyId: "local", secretAccessKey: "local" },
  requestHandler: {
    requestTimeout: 2000,
  } as any,
});

// ── Availability flag ─────────────────────────────────────────────────────────
let isDynamoAvailable = false;

// ── Seed data ─────────────────────────────────────────────────────────────────
const seedPath = path.resolve(
  __dirname,
  "../../dynamo-local/seeds/01-volatilidad.json"
);
const seedData: Record<string, Array<{ PutRequest: { Item: Record<string, any> } }>> =
  JSON.parse(fs.readFileSync(seedPath, "utf-8"));

// ── Required fields in VolatilidadResponse ────────────────────────────────────
const REQUIRED_FIELDS = ["id", "nombre", "pips", "estadoActual", "updatedAt", "updatedBy"];
const FORBIDDEN_FIELDS = ["pk", "sk", "tipo", "PK", "SK"];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Delete all VOLATILIDAD items from the table */
async function clearVolatilidadItems(): Promise<void> {
  const result = await localClient.send(
    new ScanCommandRaw({
      TableName: TABLE_NAME,
      FilterExpression: "#tipo = :tipo",
      ExpressionAttributeNames: { "#tipo": "tipo" },
      ExpressionAttributeValues: { ":tipo": { S: "VOLATILIDAD" } },
    })
  );

  const items = result.Items ?? [];
  if (items.length === 0) return;

  const deleteRequests = items.map((item) => ({
    DeleteRequest: {
      Key: { PK: item.PK, SK: item.SK },
    },
  }));

  await localClient.send(
    new BatchWriteItemCommand({
      RequestItems: { [TABLE_NAME]: deleteRequests },
    })
  );
}

/** Insert seed data using BatchWriteItem */
async function insertSeedData(): Promise<void> {
  const requests = seedData[TABLE_NAME];
  await localClient.send(
    new BatchWriteItemCommand({
      RequestItems: { [TABLE_NAME]: requests },
    })
  );
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe("@integration Volatilidad endpoints", () => {
  beforeAll(async () => {
    try {
      await localClient.send(new ListTablesCommand({}));
      isDynamoAvailable = true;
    } catch {
      isDynamoAvailable = false;
      console.warn(
        "[integration] DynamoDB Local no disponible en http://localhost:8000 — todos los tests serán omitidos."
      );
    }
  }, 5000);

  beforeEach(async () => {
    if (!isDynamoAvailable) return;
    await clearVolatilidadItems();
    await insertSeedData();
  });

  // ── GET listarTodos() ──────────────────────────────────────────────────────

  describe("GET listarTodos()", () => {
    it("retorna los 2 registros del seed", async () => {
      if (!isDynamoAvailable) return;

      const result = await VolatilidadRepository.listarTodos();
      expect(result).toHaveLength(2);
    });

    it("los items tienen todos los campos requeridos", async () => {
      if (!isDynamoAvailable) return;

      const result = await VolatilidadRepository.listarTodos();
      for (const item of result) {
        for (const field of REQUIRED_FIELDS) {
          expect(item).toHaveProperty(field);
        }
      }
    });

    it("los items NO tienen pk, sk, tipo", async () => {
      if (!isDynamoAvailable) return;

      const result = await VolatilidadRepository.listarTodos();
      for (const item of result) {
        for (const field of FORBIDDEN_FIELDS) {
          expect(item).not.toHaveProperty(field);
        }
      }
    });
  });

  // ── PUT actualizar() ───────────────────────────────────────────────────────

  describe("PUT actualizar()", () => {
    it("actualiza pips y estadoActual correctamente en DynamoDB", async () => {
      if (!isDynamoAvailable) return;

      const updated = await VolatilidadRepository.actualizar("001", 999, true, "TEST.USER");

      expect(updated).not.toBeNull();
      expect(updated!.pips).toBe(999);
      expect(updated!.estadoActual).toBe(true);

      // Verify persisted in DynamoDB by fetching again
      const fetched = await VolatilidadRepository.obtenerPorId("001");
      expect(fetched!.pips).toBe(999);
      expect(fetched!.estadoActual).toBe(true);
    });

    it("el campo nombre no cambia después del update", async () => {
      if (!isDynamoAvailable) return;

      const before = await VolatilidadRepository.obtenerPorId("001");
      const originalNombre = before!.nombre;

      await VolatilidadRepository.actualizar("001", 500, false, "TEST.USER");

      const after = await VolatilidadRepository.obtenerPorId("001");
      expect(after!.nombre).toBe(originalNombre);
    });

    it("updatedAt cambia después del update", async () => {
      if (!isDynamoAvailable) return;

      const before = await VolatilidadRepository.obtenerPorId("001");
      const originalUpdatedAt = before!.updatedAt;

      // Small delay to ensure timestamp differs
      await new Promise((resolve) => setTimeout(resolve, 10));

      await VolatilidadRepository.actualizar("001", 150, true, "TEST.USER");

      const after = await VolatilidadRepository.obtenerPorId("001");
      expect(after!.updatedAt).not.toBe(originalUpdatedAt);
    });

    it("retorna 404 para id inexistente", async () => {
      if (!isDynamoAvailable) return;

      const result = await VolatilidadRepository.actualizar("999", 100, true, "TEST.USER");
      expect(result).toBeNull();
    });
  });
});
