import { dynamoDb } from './dynamodb.client';
import { ParametroSistema } from '../models/parametroSistema.model';

const TABLE_NAME = process.env.TABLE_PARAMETRO_SISTEMA ?? 'bif-fx-parametro-sistema';

export const parametroSistemaRepository = {
  // TODO: implement CRUD
};
