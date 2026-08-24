import { Transaction } from './types';

export const SAVINGS_CATEGORY_KEY = 'savings';

export function isSavingsTransaction(tx: Transaction): boolean {
  return tx.category === SAVINGS_CATEGORY_KEY;
}

/** Undefined savingsAction (entries logged before this feature existed) means 'deposit'. */
export function savingsActionOf(tx: Transaction): 'deposit' | 'withdrawal' {
  return tx.savingsAction ?? 'deposit';
}

/** Positive for a deposit, negative for a withdrawal. Only meaningful for savings transactions. */
export function savingsSignedAmount(tx: Transaction): number {
  return savingsActionOf(tx) === 'withdrawal' ? -tx.amount : tx.amount;
}

/** Lifetime running balance: every deposit adds, every withdrawal subtracts, across all cycles ever. */
export function computeTotalSaved(transactions: Transaction[]): number {
  return transactions.filter(isSavingsTransaction).reduce((sum, t) => sum + savingsSignedAmount(t), 0);
}
