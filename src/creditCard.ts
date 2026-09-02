import { Transaction } from './types';

export const CREDIT_CARD_CATEGORY_KEY = 'creditCard';

/** A purchase charged to the card — excluded from paycheck/spend totals until it's paid. */
export function isCreditPurchase(tx: Transaction): boolean {
  return tx.paymentMethod === 'credit';
}

/** A payment made toward the card balance itself (its own category, not tied to any purchase). */
export function isCreditCardPayment(tx: Transaction): boolean {
  return tx.category === CREDIT_CARD_CATEGORY_KEY;
}

/** Lifetime balance owed: every credit purchase adds, every payment subtracts, across all cycles. */
export function computeCreditCardBalance(transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => {
    if (isCreditPurchase(t)) return sum + t.amount;
    if (isCreditCardPayment(t)) return sum - t.amount;
    return sum;
  }, 0);
}
