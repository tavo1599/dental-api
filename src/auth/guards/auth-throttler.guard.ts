import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * ThrottlerGuard con el mensaje en espanol. El mensaje por defecto de la libreria
 * es "ThrottlerException: Too Many Requests", que es justo lo que el frontend
 * muestra al usuario en el toast de error.
 */
@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  protected async getErrorMessage(): Promise<string> {
    return 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.';
  }
}
