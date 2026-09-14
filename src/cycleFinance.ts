import { CycleRange, Transaction } from './types';
import { endOfDay, parseCycleIdentifier, startOfDay } from './cycleEngine';
import { getAvailableCycles } from './cycleList';
import { isSavingsTransaction, savingsSignedAmount } from './savings';
import { isCreditPurchase } from './creditCard';
import { isLendingTransaction, lendingSignedAmount } from './lending';
import { borrowSignedAmount, isBorrowTransaction } from './borrow';

/** Net outflow for a set of transactions already scoped to one cycle: real spending, plus
 * savings/lending signed by direction, minus borrowing signed by direction (borrowing money adds
 * to what's left, paying it back subtracts) — a credit card purchase is deferred and excluded
 * until it's actually paid. Mirrors "Remaining of paycheck" in Quick Log. */
export function computeCycleOutflow(cycleTxs: Transaction[]): number {
  return cycleTxs
    .filter((t) => !isCreditPurchase(t))
    .reduce((sum, t) => {
      if (isSavingsTransaction(t)) return sum + savingsSignedAmount(t);
      if (isLendingTransaction(t)) return sum + lendingSignedAmount(t);
      if (isBorrowTransaction(t)) return sum - borrowSignedAmount(t);
      return sum + t.amount;
    }, 0);
}

export function computeCycleRemaining(cycleTxs: Transaction[], paycheck: number): number {
  return paycheck - computeCycleOutflow(cycleTxs);
}

export interface CycleRemainingRow {
  identifier: string;
  label: string;
  remaining: number;
}

/** Remaining for every cycle that has already ended and had a paycheck set — the current,
 * still-in-progress cycle is excluded since its remaining is already tracked live in Quick Log,
 * and a cycle with no paycheck has nothing defined to be "left over". Newest first. */
export function computePastCycleRemainings(
  transactions: Transaction[],
  paychecks: Record<string, number>,
  currentCycleRange: CycleRange
): CycleRemainingRow[] {
  const rows: CycleRemainingRow[] = [];
  for (const opt of getAvailableCycles(transactions, currentCycleRange)) {
    if (opt.isCurrent) continue;
    const paycheck = paychecks[opt.identifier];
    if (paycheck === undefined) continue;
    const cycleRange = parseCycleIdentifier(opt.identifier);
    const fromTime = startOfDay(cycleRange.start).getTime();
    const toTime = endOfDay(cycleRange.end).getTime();
    const cycleTxs = transactions.filter((t) => {
      const time = new Date(t.timestamp).getTime();
      return time >= fromTime && time <= toTime;
    });
    rows.push({
      identifier: opt.identifier,
      label: opt.label,
      remaining: computeCycleRemaining(cycleTxs, paycheck),
    });
  }
  return rows;
}

export function computeTotalLeftover(rows: CycleRemainingRow[]): number {
  return rows.reduce((sum, r) => sum + r.remaining, 0);
}

export interface CycleOutflowPoint {
  identifier: string;
  start: Date;
  outflow: number;
  isCurrent: boolean;
}

/** Total outflow for the most recent cycles (current cycle included), oldest first so it plots
 * left-to-right as a trend. */
export function computeCycleOutflowTrend(
  transactions: Transaction[],
  currentCycleRange: CycleRange,
  maxCycles: number = 6
): CycleOutflowPoint[] {
  const points = getAvailableCycles(transactions, currentCycleRange)
    .slice(0, maxCycles)
    .map((opt) => {
      const cycleRange = parseCycleIdentifier(opt.identifier);
      const fromTime = startOfDay(cycleRange.start).getTime();
      const toTime = endOfDay(cycleRange.end).getTime();
      const cycleTxs = transactions.filter((t) => {
        const time = new Date(t.timestamp).getTime();
        return time >= fromTime && time <= toTime;
      });
      return {
        identifier: opt.identifier,
        start: cycleRange.start,
        outflow: computeCycleOutflow(cycleTxs),
        isCurrent: opt.isCurrent,
      };
    });
  return points.reverse();
}
