import { IsString, IsNumber, Min } from 'class-validator';

export class CreateMilestoneDto {
  @IsString()
  title: string;

  @IsNumber()
  @Min(0)
  amount: number;
}
