import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;

  @IsOptional()
  tags?: string[] | string;
}
