import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaClient } from '@prisma/client';
import { PaginationOrderDto } from './dto';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(OrdersService.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to the database');
  }

  create(createOrderDto: CreateOrderDto) {
    return this.order.create({
      data: createOrderDto,
    });
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
    });
    if (!order) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: 'Order not found',
      });
    }
    return order;
  }
}
