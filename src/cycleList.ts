import { CycleRange, Transaction } from './types';
import { parseCycleIdentifier } from './cycleEngine';

export interface CycleOption {
  identifier: string;
  label: string;
  isCurrent: boolean;
  startTime: number;
}

/** The current cycle (as already resolved by AppDataContext) plus every distinct cycle present in transaction history, newest first. */
export function getAvailableCycles(
  transactions: Transaction[],
  current: CycleRange
): CycleOption[] {
  const seen = new Map<string, CycleOption>();
  seen.set(current.identifier, {
    identifier: current.identifier,
    label: current.label,
    isCurrent: true,
    startTime: current.start.getTime(),
  });

  for (const tx of transactions) {
    if (seen.has(tx.cycleIdentifier)) continue;
    const range = parseCycleIdentifier(tx.cycleIdentifier);
    seen.set(tx.cycleIdentifier, {
      identifier: tx.cycleIdentifier,
      label: range.label,
      isCurrent: tx.cycleIdentifier === current.identifier,
      startTime: range.start.getTime(),
    });
  }

  return Array.from(seen.values()).sort((a, b) => b.startTime - a.startTime);
}
