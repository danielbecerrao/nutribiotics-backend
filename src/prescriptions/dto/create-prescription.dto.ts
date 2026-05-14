import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PrescriptionItemDto } from './prescription-item.dto';

export class CreatePrescriptionDto {
  @ApiProperty({
    example: 'patient_cuid',
  })
  @IsString()
  @IsNotEmpty()
  patientId!: string;

  @ApiPropertyOptional({
    maxLength: 1000,
    example: 'Tratamiento inicial.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({
    type: [PrescriptionItemDto],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemDto)
  items!: PrescriptionItemDto[];
}
