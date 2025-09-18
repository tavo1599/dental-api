import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../audit.service';
import { AUDITED_ACTION_KEY } from '../decorators/audited-action.decorator';
import { User } from '../../users/entities/user.entity';         // <-- Importa User
import { Tenant } from '../../tenants/entities/tenant.entity';   // <-- Importa Tenant

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const action = this.reflector.get<string>(AUDITED_ACTION_KEY, context.getHandler());
    if (!action) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const { user, params, body } = request;

    return next.handle().pipe(
      tap(() => {
        if (user && user.sub && user.tenantId) {
          this.auditService.logAction({
            action,
            // --- INICIO DE LA CORRECCIÓN ---
            user: { id: user.sub } as User,           // Le decimos a TS que trate esto como un User
            tenant: { id: user.tenantId } as Tenant, // Le decimos a TS que trate esto como un Tenant
            // --- FIN DE LA CORRECCIÓN ---
            details: { params, body },
          });
        }
      }),
    );
  }
}