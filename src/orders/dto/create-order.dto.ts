import { OrderStatus } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
} from 'class-validator';

export class CreateOrderDto {
  @IsNumber()
  @IsPositive()
  totalAmount: number;
  @IsNumber()
  @IsPositive()
  totalItems: number;
  @IsEnum(OrderStatus, {
    message: `Status must be one of the following values: ${Object.values(
      OrderStatus,
    ).join(', ')}`,
  })
  @IsOptional()
  status: OrderStatus = OrderStatus.PENDING;
  @IsBoolean()
  @IsOptional()
  paid: boolean = false;
}
