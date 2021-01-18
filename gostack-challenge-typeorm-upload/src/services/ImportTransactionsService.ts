import fs from 'fs';
import path from 'path';
import parse from 'csv-parse/lib/sync';
import { getRepository, getCustomRepository, In } from 'typeorm';

import TransactionsRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

import uploadConfig from '../config/upload';

interface Request {
  fileName: string;
}

interface CSVColumn {
  [index: string]: string;
}

interface CSVTransaction {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class ImportTransactionsService {
  async execute({ fileName }: Request): Promise<Transaction[]> {
    const filePath = path.join(uploadConfig.directory, fileName);

    const fileContent = await fs.promises.readFile(filePath);
    await fs.promises.unlink(filePath);
    const csv = parse(fileContent);

    const columns = csv as string[][];
    const keys = csv.shift();

    const mappedCsv: CSVColumn[] = [];

    keys.forEach((column: string, columnIndex: number) => {
      columns.forEach((row: string[], index: number) => {
        if (!mappedCsv[index]) mappedCsv[index] = {};
        mappedCsv[index][column.trim()] = row[columnIndex].trim();
      });
    });

    const csvTransactions: CSVTransaction[] = [];
    const categories: string[] = [];

    for (let i = 0; i < mappedCsv.length; i += 1) {
      const transaction = mappedCsv[i];
      csvTransactions.push({
        title: transaction.title,
        value: Number(transaction.value),
        type: transaction.type as 'income' | 'outcome',
        category: transaction.category,
      });
      categories.push(transaction.category);
    }

    const categoryRepository = getRepository(Category);
    const existentCategories = await categoryRepository.find({
      where: { title: In(categories) },
    });

    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );

    const missingCategoriesTitles = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const missingCategories = missingCategoriesTitles.map(categoryTitle => {
      return categoryRepository.create({
        title: categoryTitle,
      });
    });

    const savedCategories = await categoryRepository.save(missingCategories);
    const allCategories = [...existentCategories, ...savedCategories];

    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const createdTransactions = csvTransactions.map(transaction => {
      return transactionsRepository.create({
        title: transaction.title,
        value: transaction.value,
        type: transaction.type,
        category_id: allCategories.find(
          category => category.title === transaction.category,
        )?.id,
      });
    });

    await transactionsRepository.save(createdTransactions);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
