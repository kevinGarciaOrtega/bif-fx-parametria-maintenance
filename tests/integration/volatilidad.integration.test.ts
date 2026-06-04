/**
 * Tests de integración con DynamoDB Local.
 * Prerequisito: ejecutar `docker-compose up -d` en dynamo-local/ y luego `npm run dynamo:setup`.
 */

describe('Volatilidad – Integración DynamoDB Local', () => {
  it.todo('GET /volatilidad/{moneda} retorna 404 si no existe');
  it.todo('POST /volatilidad crea un registro correctamente');
  it.todo('PUT /volatilidad/{moneda}/{fecha} actualiza el registro');
  it.todo('DELETE /volatilidad/{moneda}/{fecha} desactiva el registro');
});
