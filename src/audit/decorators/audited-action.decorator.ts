import { SetMetadata } from '@nestjs/common';
export const AUDITED_ACTION_KEY = 'audited_action';
export const AuditedAction = (action: string) => SetMetadata(AUDITED_ACTION_KEY, action);