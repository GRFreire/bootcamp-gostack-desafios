import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();

    const balance = transactions.reduce<Balance>(
      (accumulator, transaction) => {
        return {
          income:
            accumulator.income +
            (transaction.type === 'income' ? transaction.value : 0),
          outcome:
            accumulator.outcome +
            (transaction.type === 'outcome' ? transaction.value : 0),
          total:
            accumulator.total +
            (transaction.type === 'income'
              ? transaction.value
              : -transaction.value),
        };
      },
      {
        income: 0,
        outcome: 0,
        total: 0,
      },
    );

    return balance;
  }
}

export default TransactionsRepository;
