import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer does not exists');
    }

    const registeredProducts = await this.productsRepository.findAllById(
      products,
    );

    if (products.length !== registeredProducts.length) {
      throw new AppError('Product does not exist');
    }

    const parsedProducts = registeredProducts.map(registeredProduct => {
      const findProduct = products.find(
        product => product.id === registeredProduct.id,
      );

      if (!findProduct) {
        throw new AppError('Product does not exist');
      }

      const finalQuantity = registeredProduct.quantity - findProduct.quantity;

      if (finalQuantity < 0) {
        throw new AppError('Not enough products');
      }

      return {
        product_id: registeredProduct.id,
        price: registeredProduct.price,
        quantity: findProduct.quantity,
        finalQuantity,
      };
    });

    await this.productsRepository.updateQuantity(
      parsedProducts.map(product => ({
        id: product.product_id,
        quantity: product.finalQuantity,
      })),
    );

    const order = await this.ordersRepository.create({
      customer,
      products: parsedProducts,
    });

    return order;
  }
}

export default CreateOrderService;
