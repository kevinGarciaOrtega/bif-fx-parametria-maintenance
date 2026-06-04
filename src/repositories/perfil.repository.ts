import { dynamoDb } from './dynamodb.client';
import { Perfil } from '../models/perfil.model';

const TABLE_NAME = process.env.TABLE_PERFIL ?? 'bif-fx-perfil';

export const perfilRepository = {
  // TODO: implement CRUD
};
