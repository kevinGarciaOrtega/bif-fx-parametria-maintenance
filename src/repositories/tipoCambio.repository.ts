import { dynamoDb } from './dynamodb.client';
import { TipoCambio } from '../models/tipoCambio.model';

const TABLE_NAME = process.env.TABLE_TIPO_CAMBIO ?? 'bif-fx-tipo-cambio';

export const tipoCambioRepository = {
  // TODO: implement CRUD
};
