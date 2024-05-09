import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { OrderStatus, PrismaClient } from '@prisma/client';
import { firstValueFrom } from 'rxjs';
import { NATS_SERVICE } from '../config';
import { ChangeOrderStatusDto, PaginationOrderDto, PaidOrderDto } from './dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderWithProducts } from './interfaces/order-with-products.interface';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(OrdersService.name);

  constructor(@Inject(NATS_SERVICE) private readonly client: ClientProxy) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to the database');
  }

  async create(createOrderDto: CreateOrderDto) {
    try {
      const productsIds = createOrderDto.items.map((item) => item.productId);
      // Confirm that the products exist
      const products = await firstValueFrom(
        this.client.send({ cmd: 'validate_products' }, productsIds),
      );

      const totalAmount = createOrderDto.items.reduce((acc, item) => {
        const price = products.find(
          (product) => product.id === item.productId,
        ).price;
        return price * item.quantity + acc;
      }, 0);

      const totalItems = createOrderDto.items.reduce((acc, item) => {
        return acc + item.quantity;
      }, 0);
      const order = await this.order.create({
        data: {
          totalAmount,
          totalItems,
          OrderItem: {
            createMany: {
              data: createOrderDto.items.map((item) => {
                return {
                  quantity: item.quantity,
                  productId: item.productId,
                  price: products.find(
                    (product) => product.id === item.productId,
                  ).price,
                };
              }),
            },
          },
        },
        include: {
          OrderItem: {
            select: {
              quantity: true,
              price: true,
              productId: true,
            },
          },
        },
      });
      return {
        ...order,
        OrderItem: order.OrderItem.map((item) => {
          return {
            ...item,
            name: products.find((product) => product.id === item.productId)
              .name,
          };
        }),
      };
    } catch (error) {
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error validating products',
      });
    }
  }

  async findAll(paginationOrderDto: PaginationOrderDto) {
    const totalPages = await this.order.count({
      where: {
        status: paginationOrderDto.status,
      },
    });
    const currentPage = paginationOrderDto.page || 1;
    const perPage = paginationOrderDto.limit || 10;
    return {
      data: await this.order.findMany({
        where: {
          status: paginationOrderDto.status,
        },
        skip: (currentPage - 1) * perPage,
        take: perPage,
      }),
      meta: {
        total: totalPages,
        page: currentPage,
        lastPage: Math.ceil(totalPages / perPage),
      },
    };
  }

  async findOne(id: string) {
    const order = await this.order.findFirst({
      where: { id },
      include: {
        OrderItem: {
          select: {
            quantity: true,
            price: true,
            productId: true,
          },
        },
      },
    });
    if (!order) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: 'Order not found',
      });
    }
    const productsIds = order.OrderItem.map((item) => item.productId);
    const products = await firstValueFrom(
      this.client.send({ cmd: 'validate_products' }, productsIds),
    );
    return {
      ...order,
      OrderItem: order.OrderItem.map((item) => {
        return {
          ...item,
          name: products.find((product) => product.id === item.productId).name,
        };
      }),
    };
  }

  async changeOrderStatus(changeOrderStatusDto: ChangeOrderStatusDto) {
    const { id, status } = changeOrderStatusDto;
    const order = await this.findOne(id);
    if (order.status === status) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Order already in this status',
      });
    }
    return this.order.update({
      where: { id },
      data: { status },
    });
  }

  async createPaymentSession(order: OrderWithProducts) {
    const paymentSession = await firstValueFrom(
      this.client.send('create.payment.session', {
        orderId: order.id,
        currency: 'usd',
        items: order.OrderItem.map((item) => {
          return {
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          };
        }),
      }),
    );
    return paymentSession;
  }

  async paidOrder(paidOrderDto: PaidOrderDto) {
    await this.order.update({
      where: { id: paidOrderDto.orderId },
      data: {
        status: OrderStatus.PAID,
        paid: true,
        paidAt: new Date(),
        stripeChargeId: paidOrderDto.stripePaymentId,
        OrderReceipt: {
          create: {
            receiptUrl: paidOrderDto.receipUrl,
          },
        },
      },
    });
    this.logger.log(`Order ${paidOrderDto.orderId} paid`);
  }
}
