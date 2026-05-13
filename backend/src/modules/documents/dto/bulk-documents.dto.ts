import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class BulkDocumentItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  fileName?: string;

  @IsString()
  @MaxLength(120000)
  text!: string;

  @IsOptional()
  tags?: string[] | string;
}

export class BulkDocumentsDto {
  @IsOptional()
  @IsIn(['auto', 'chunks'])
  mode?: 'auto' | 'chunks';

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => BulkDocumentItemDto)
  documents!: BulkDocumentItemDto[];
}
