import { dynamoDb } from './dynamodb.client';
import { Segmento } from '../models/segmento.model';

const TABLE_NAME = process.env.TABLE_SEGMENTO ?? 'bif-fx-segmento';

export const segmentoRepository = {
  // TODO: implement CRUD
};
