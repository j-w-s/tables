import { Status } from './Status';
import { Transaction } from './Transaction';

export interface Data {
  Statuses: Status[];
  Transactions: Transaction[];
}