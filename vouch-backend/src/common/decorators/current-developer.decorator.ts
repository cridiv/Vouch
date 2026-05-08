import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentDeveloper = createParamDecorator(
  (_, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().developer,
);
