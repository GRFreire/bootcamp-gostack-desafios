import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

interface CreateTransactionDTO {
  title: string;
  value: number;
  type: 'income' | 'outcome';
}

class TransactionsRepository {
  private transactions: Transaction[];

  constructor() {
    this.transactions = [];
  }

  public all(): Transaction[] {
    return this.transactions;
  }

  public getBalance(): Balance {
    const balance = this.transactions.reduce<Balance>(
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

  public create({ title, value, type }: CreateTransactionDTO): Transaction {
    const transaction = new Transaction({ title, value, type });

    this.transactions.push(transaction);

    return transaction;
  }
}

export default TransactionsRepository;
