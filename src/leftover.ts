import { LeftoverAction, LeftoverWithdrawal } from './types';

/** Undefined action (entries logged before 'return' existed) means 'withdrawal'. */
export function leftoverActionOf(entry: LeftoverWithdrawal): LeftoverAction {
  return entry.action ?? 'withdrawal';
}

/** Positive for a withdrawal (money taken out of the pool), negative for a return (money put
 * back in). */
export function leftoverSignedAmount(entry: LeftoverWithdrawal): number {
  return leftoverActionOf(entry) === 'return' ? -entry.amount : entry.amount;
}
