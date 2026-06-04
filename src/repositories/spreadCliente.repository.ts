import { dynamoDb } from './dynamodb.client';
import { SpreadCliente } from '../models/spreadCliente.model';

const TABLE_NAME = process.env.TABLE_SPREAD_CLIENTE ?? 'bif-fx-spread-cliente';

export const spreadClienteRepository = {
  // TODO: implement CRUD
};
