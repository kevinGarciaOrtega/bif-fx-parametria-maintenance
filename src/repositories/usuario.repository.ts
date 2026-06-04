import { dynamoDb } from './dynamodb.client';
import { Usuario } from '../models/usuario.model';

const TABLE_NAME = process.env.TABLE_USUARIO ?? 'bif-fx-usuario';

export const usuarioRepository = {
  // TODO: implement CRUD
};
