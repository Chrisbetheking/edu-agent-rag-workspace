import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEvalQuestionDto {
  @IsString()
  @MaxLength(1000)
  question!: string;

  @IsString()
  @MaxLength(240)
  expectedSource!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  expectedAnswer?: string;
}
