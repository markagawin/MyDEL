import { BorrowAction, Transaction } from './types';

export const BORROW_CATEGORY_KEY = 'borrow';

export function isBorrowTransaction(tx: Transaction): boolean {
  return tx.category === BORROW_CATEGORY_KEY;
}

/** Undefined borrowAction (shouldn't normally happen, but mirrors lendingActionOf) means 'borrow'. */
export function borrowActionOf(tx: Transaction): BorrowAction {
  return tx.borrowAction ?? 'borrow';
}

/** True for the money-coming-in half of a borrow transaction - real cash, but not income and
 * not spending, so callers exclude it from spend totals the same way a credit purchase is
 * excluded (deferred there; here it's already in hand, just owed back). */
export function isBorrowIncoming(tx: Transaction): boolean {
  return isBorrowTransaction(tx) && borrowActionOf(tx) === 'borrow';
}

/** True for actually paying someone back - real cash leaving your hand, so it counts as spent
 * the same way a credit card payment does. */
export function isBorrowPayback(tx: Transaction): boolean {
  return isBorrowTransaction(tx) && borrowActionOf(tx) === 'paid_back';
}

/** Positive for money borrowed in (increases what you owe), negative for paying it back. */
export function borrowSignedAmount(tx: Transaction): number {
  return borrowActionOf(tx) === 'paid_back' ? -tx.amount : tx.amount;
}

/** Lifetime total currently owed, across everyone you've borrowed from. */
export function computeTotalBorrowed(transactions: Transaction[]): number {
  return transactions.filter(isBorrowTransaction).reduce((sum, t) => sum + borrowSignedAmount(t), 0);
}

/** Per-person running balance: positive means you still owe them that much. People with no
 * borrow transactions at all are simply absent, not zeroed. */
export function computeBorrowedByPerson(transactions: Transaction[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const t of transactions) {
    if (!isBorrowTransaction(t) || !t.borrowerId) continue;
    result[t.borrowerId] = (result[t.borrowerId] ?? 0) + borrowSignedAmount(t);
  }
  return result;
}
