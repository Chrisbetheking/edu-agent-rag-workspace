import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AskChatDto {
  @IsString()
  @MaxLength(4000)
  question!: string;

  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  topK?: number;
}
