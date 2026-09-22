import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Inyecta la sede sobre la que trabaja la peticion, resuelta por
 * BranchContextGuard.
 *
 *   null  = todas las sedes (vista consolidada del admin)
 *   string = una sede concreta
 *
 * Uso:  findAll(@Req() req, @CurrentBranch() branchId: string | null)
 */
export const CurrentBranch = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    return request.branchId ?? null;
  },
);
