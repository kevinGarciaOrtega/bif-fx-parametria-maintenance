import { dynamoDb } from './dynamodb.client';
import { SpreadLiquidez } from '../models/spreadLiquidez.model';

const TABLE_NAME = process.env.TABLE_SPREAD_LIQUIDEZ ?? 'bif-fx-spread-liquidez';

export const spreadLiquidezRepository = {
  // TODO: implement CRUD
};
