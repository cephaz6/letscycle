import type { BadgeProps } from '@letscycle/ui';
import type { TransactionStatus } from '@letscycle/api-client';

export const STATUS_LABEL: Record<TransactionStatus, string> = {
  initiated: 'Awaiting seller',
  paymentAuthorised: 'Confirm pickup',
  paymentCaptured: 'In escrow',
  inEscrow: 'In escrow',
  completed: 'Completed',
  disputed: 'Disputed',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
};

export function statusVariant(status: TransactionStatus): BadgeProps['variant'] {
  switch (status) {
    case 'completed':
      return 'success';
    case 'paymentAuthorised':
    case 'paymentCaptured':
    case 'inEscrow':
      return 'primary';
    case 'initiated':
      return 'warning';
    default:
      return 'muted';
  }
}

export const STEPS = ['Ordered', 'Seller confirmed', 'Picked up', 'Complete'] as const;

/** 1-based index of the step currently in progress (0 = off the happy path). */
export function currentStep(status: TransactionStatus): number {
  switch (status) {
    case 'initiated':
      return 1;
    case 'paymentAuthorised':
      return 2;
    case 'paymentCaptured':
    case 'inEscrow':
      return 3;
    case 'completed':
      return 4;
    default:
      return 0;
  }
}
