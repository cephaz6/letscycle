import type { BadgeProps } from '@letscycle/ui';
import type { TransactionStatus } from '@letscycle/api-client';

// Plain English over payment jargon: "escrow" means nothing to most people,
// and a status badge should say where the order is, not bark an instruction.
export const STATUS_LABEL: Record<TransactionStatus, string> = {
  initiated: 'Awaiting seller',
  paymentAuthorised: 'Awaiting pickup',
  paymentCaptured: 'Payment held',
  inEscrow: 'Payment held',
  completed: 'Completed',
  disputed: 'Disputed',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
};

/**
 * One sentence telling this party what happens next, so an order never leaves
 * someone wondering whose move it is or when money changes hands.
 */
export function nextStep(status: TransactionStatus, isSeller: boolean): string | null {
  switch (status) {
    case 'initiated':
      return isSeller
        ? 'Confirm the order to accept this buyer. Their payment is authorised, not taken.'
        : 'The seller needs to accept. Nothing has left your account — the payment is only authorised.';
    case 'paymentAuthorised':
      return isSeller
        ? 'Meet the buyer and hand the item over. You’re paid once you both confirm.'
        : 'Meet the seller and check the item. Confirming pickup is what releases your payment.';
    case 'paymentCaptured':
    case 'inEscrow':
      return isSeller
        ? 'Payment is captured and on its way to your payout account.'
        : 'Payment has been taken and is being released to the seller.';
    case 'completed':
      return 'All done — leave a review to help the next person.';
    case 'disputed':
      return 'We’re reviewing this dispute. The payment stays on hold until it’s resolved.';
    case 'cancelled':
      return 'This order was cancelled. No money changed hands.';
    case 'refunded':
      return 'This order was refunded.';
    default:
      return null;
  }
}

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
