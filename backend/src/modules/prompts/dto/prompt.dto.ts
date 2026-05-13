import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePromptDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @MaxLength(12000)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;
}

export class UpdatePromptDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12000)
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;
}
