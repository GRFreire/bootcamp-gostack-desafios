import { getRepository, getCustomRepository } from 'typeorm';

import AppError from '../errors/AppError';

import TransactionsRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category: categoryName,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    if (type === 'outcome') {
      const currentBalance = await transactionsRepository.getBalance();

      if (currentBalance.total < value) {
        throw new AppError('Not enough money to do this transaction');
      }
    }

    let categoryId: string | null = null;

    const categoryAlreadyExists = await categoriesRepository.findOne({
      where: { title: categoryName },
    });

    if (categoryAlreadyExists) {
      categoryId = categoryAlreadyExists.id;
    } else {
      const category = categoriesRepository.create({
        title: categoryName,
      });

      await categoriesRepository.save(category);

      categoryId = category.id;
    }

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category_id: categoryId,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
