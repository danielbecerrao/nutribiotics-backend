import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class PrescriptionItemDto {
  @ApiProperty({
    maxLength: 120,
    example: 'Amoxicilina 500mg',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    maxLength: 120,
    example: '1 cada 8 horas',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  dosage?: string;

  @ApiPropertyOptional({
    minimum: 1,
    example: 21,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({
    maxLength: 500,
    example: 'Tomar despues de comer.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  instructions?: string;
}
