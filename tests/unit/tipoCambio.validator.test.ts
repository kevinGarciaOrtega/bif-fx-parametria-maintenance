import { createTipoCambioSchema } from '../../src/validators/schemas';

describe('TipoCambio – Validador (Zod)', () => {
  it('acepta un payload válido', () => {
    const input = {
      moneda: 'USD',
      fecha: '2026-01-01',
      hora: '10:00',
      compra: 3.85,
      venta: 3.90,
      fuente: 'SBS',
      creadoPor: 'admin',
    };
    expect(() => createTipoCambioSchema.parse(input)).not.toThrow();
  });

  it('rechaza compra negativa', () => {
    const input = {
      moneda: 'USD',
      fecha: '2026-01-01',
      hora: '10:00',
      compra: -1,
      venta: 3.90,
      fuente: 'SBS',
      creadoPor: 'admin',
    };
    expect(() => createTipoCambioSchema.parse(input)).toThrow();
  });
});
