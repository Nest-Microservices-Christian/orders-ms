import { OrderStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsPositive } from 'class-validator';

export class PaginationDto {
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  page: number;
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  limit: number;
}

export class PaginationOrderDto extends PaginationDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
