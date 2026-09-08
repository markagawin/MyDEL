import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CycleRange, Transaction } from '../types';
import { CategoryMeta } from '../categories';
import { formatPeso } from '../currency';
import { endOfDay, parseCycleIdentifier, startOfDay } from '../cycleEngine';
import { getAvailableCycles } from '../cycleList';
import { isSavingsTransaction, savingsSignedAmount } from '../savings';
import { isCreditPurchase } from '../creditCard';
import { isLendingTransaction, lendingActionOf, lendingSignedAmount } from '../lending';
import { borrowActionOf, isBorrowTransaction, borrowSignedAmount } from '../borrow';
import { AppTheme, useTheme } from '../theme';

interface Props {
  visible: boolean;
  transactions: Transaction[];
  currentCycleRange: CycleRange;
  paychecks: Record<string, number>;
  categories: CategoryMeta[];
  onClose: () => void;
}

interface CategoryAmount {
  meta: CategoryMeta;
  amount: number;
}

interface TransferAmount {
  icon: string;
  label: string;
  amount: number;
}

interface CycleRow {
  identifier: string;
  label: string;
  isCurrent: boolean;
  paycheck: number | null;
  spent: number;
  remaining: number | null;
  breakdown: CategoryAmount[];
  transfers: TransferAmount[];
}

export default function CycleHistoryModal({
  visible,
  transactions,
  currentCycleRange,
  paychecks,
  categories,
  onClose,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const rows = useMemo<CycleRow[]>(() => {
    const cycleOptions = getAvailableCycles(transactions, currentCycleRange);
    return cycleOptions.map((opt) => {
      // Group by the cycle's actual date range rather than trusting each transaction's stored
      // cycleIdentifier — that field can drift out of sync with its real date (e.g. after a
      // past payday-settings change), which would silently lump unrelated transactions into
      // the wrong cycle here.
      const cycleRange = parseCycleIdentifier(opt.identifier);
      const fromTime = startOfDay(cycleRange.start).getTime();
      const toTime = endOfDay(cycleRange.end).getTime();
      const cycleTxs = transactions.filter((t) => {
        const time = new Date(t.timestamp).getTime();
        return time >= fromTime && time <= toTime;
      });
      // Same net-outflow math the QuickLog banner uses for "Remaining of paycheck": a credit
      // purchase hasn't left your hand yet, savings/lending/borrowing are transfers whose sign
      // depends on direction, everything else is a plain expense.
      const outflow = cycleTxs
        .filter((t) => !isCreditPurchase(t))
        .reduce((sum, t) => {
          if (isSavingsTransaction(t)) return sum + savingsSignedAmount(t);
          if (isLendingTransaction(t)) return sum + lendingSignedAmount(t);
          if (isBorrowTransaction(t)) return sum - borrowSignedAmount(t);
          return sum + t.amount;
        }, 0);
      // Same category-spend totals Summary shows for the current cycle — savings, lending, and
      // borrowing are transfers, not spending, and a credit purchase hasn't left your hand yet.
      const categoryTotals = new Map<string, number>();
      for (const t of cycleTxs) {
        if (
          isSavingsTransaction(t) ||
          isCreditPurchase(t) ||
          isLendingTransaction(t) ||
          isBorrowTransaction(t)
        )
          continue;
        categoryTotals.set(t.category, (categoryTotals.get(t.category) ?? 0) + t.amount);
      }
      const breakdown = categories
        .map((meta) => ({ meta, amount: categoryTotals.get(meta.key) ?? 0 }))
        .filter((r) => r.amount > 0)
        .sort((a, b) => b.amount - a.amount);
      const spent = breakdown.reduce((sum, r) => sum + r.amount, 0);
      const paycheck = paychecks[opt.identifier] ?? null;
      const remaining = paycheck !== null ? paycheck - outflow : null;

      // Borrowing, lending, and credit purchases don't show up in the category breakdown above
      // (they're transfers or deferred spend, not real spending yet), so surface them here
      // instead whenever this cycle actually had any. A credit card *payment* is real cash
      // leaving your hand, so it still counts under its own category in the breakdown, same as
      // Summary already treats it — only the purchase side (still owed) needs surfacing here.
      let borrowed = 0;
      let paidBack = 0;
      let lent = 0;
      let repaid = 0;
      let chargedToCard = 0;
      for (const t of cycleTxs) {
        if (isBorrowTransaction(t)) {
          if (borrowActionOf(t) === 'paid_back') paidBack += t.amount;
          else borrowed += t.amount;
        } else if (isLendingTransaction(t)) {
          if (lendingActionOf(t) === 'repaid') repaid += t.amount;
          else lent += t.amount;
        } else if (isCreditPurchase(t)) {
          chargedToCard += t.amount;
        }
      }
      const transfers: TransferAmount[] = [];
      if (borrowed > 0) transfers.push({ icon: '📥', label: 'Borrowed', amount: borrowed });
      if (paidBack > 0) transfers.push({ icon: '💸', label: 'Paid back', amount: paidBack });
      if (lent > 0) transfers.push({ icon: '🤝', label: 'Lent', amount: lent });
      if (repaid > 0) transfers.push({ icon: '💵', label: 'Repaid', amount: repaid });
      if (chargedToCard > 0)
        transfers.push({ icon: '💳', label: 'Charged to card', amount: chargedToCard });

      return {
        identifier: opt.identifier,
        label: opt.label,
        isCurrent: opt.isCurrent,
        paycheck,
        spent,
        remaining,
        breakdown,
        transfers,
      };
    });
  }, [transactions, currentCycleRange, paychecks, categories]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityLabel="Close cycle history" onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cycle History</Text>
          <View style={styles.closeButton} />
        </View>

        {rows.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No pay cycles logged yet.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            {rows.map((row) => {
              const isExpanded = expandedId === row.identifier;
              const remainingPhrase =
                row.remaining === null
                  ? null
                  : row.remaining < 0
                    ? "You went over your paycheck by"
                    : row.isCurrent
                      ? "You have this much left so far"
                      : 'You had this much left over';
              return (
                <TouchableOpacity
                  key={row.identifier}
                  style={styles.card}
                  onPress={() => setExpandedId(isExpanded ? null : row.identifier)}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.cardLabel}>{row.label}</Text>
                      {row.isCurrent && (
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>Current</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.cardTopRight}>
                      {row.remaining !== null ? (
                        <Text
                          style={[
                            styles.remainingValue,
                            row.remaining < 0 && styles.remainingNegative,
                          ]}
                        >
                          {formatPeso(Math.abs(row.remaining))}
                        </Text>
                      ) : (
                        <Text style={styles.noPaycheckValue}>No paycheck set</Text>
                      )}
                      <Text style={styles.chevron}>{isExpanded ? '▾' : '▸'}</Text>
                    </View>
                  </View>
                  {remainingPhrase && <Text style={styles.cardSubLabel}>{remainingPhrase}</Text>}

                  <View style={styles.statRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Paycheck</Text>
                      <Text style={styles.statValue}>
                        {row.paycheck !== null ? formatPeso(row.paycheck) : '—'}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>You spent</Text>
                      <Text style={styles.statValue}>{formatPeso(row.spent)}</Text>
                    </View>
                  </View>

                  {/* Always visible (not behind the tap) — these are exactly the pieces that
                      make up "Remaining" beyond plain spending, so it stays understandable
                      without expanding. */}
                  {row.transfers.length > 0 && (
                    <View style={styles.transferList}>
                      {row.transfers.map((t) => (
                        <View key={t.label} style={styles.breakdownRow}>
                          <View style={styles.breakdownLeft}>
                            <Text style={styles.breakdownIcon}>{t.icon}</Text>
                            <Text style={styles.breakdownLabel}>{t.label}</Text>
                          </View>
                          <Text style={styles.breakdownAmount}>{formatPeso(t.amount)}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {isExpanded && (
                    <View style={styles.breakdownList}>
                      {row.breakdown.length === 0 ? (
                        <Text style={styles.breakdownEmpty}>Nothing spent this cycle yet.</Text>
                      ) : (
                        row.breakdown.map((r) => {
                          const pct = row.spent > 0 ? (r.amount / row.spent) * 100 : 0;
                          return (
                            <View key={r.meta.key} style={styles.breakdownRow}>
                              <View style={styles.breakdownLeft}>
                                <Text style={styles.breakdownIcon}>{r.meta.icon}</Text>
                                <Text style={styles.breakdownLabel}>{r.meta.label}</Text>
                              </View>
                              <View style={styles.breakdownRight}>
                                <Text style={styles.breakdownAmount}>{formatPeso(r.amount)}</Text>
                                <Text style={styles.breakdownPct}>{pct.toFixed(0)}%</Text>
                              </View>
                            </View>
                          );
                        })
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 4,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeButtonText: { fontSize: 16, color: theme.textMuted, fontWeight: '700' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: theme.navy },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyText: { color: theme.textMuted, fontSize: 14, textAlign: 'center' },
    card: {
      backgroundColor: theme.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 14,
      marginBottom: 10,
    },
    cardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
    cardLabel: { fontSize: 14, fontWeight: '700', color: theme.text },
    currentBadge: {
      backgroundColor: theme.navy,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    currentBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
    cardTopRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    remainingValue: { fontSize: 16, fontWeight: '800', color: theme.text },
    remainingNegative: { color: theme.danger },
    noPaycheckValue: { fontSize: 12.5, fontWeight: '600', color: theme.textMuted },
    chevron: { fontSize: 12, color: theme.textMuted },
    cardSubLabel: { fontSize: 12, color: theme.textMuted, marginTop: 2, marginBottom: 10 },
    statRow: { flexDirection: 'row', gap: 24 },
    statItem: {},
    statLabel: {
      fontSize: 11.5,
      fontWeight: '600',
      color: theme.textMuted,
      marginBottom: 2,
    },
    statValue: { fontSize: 13.5, fontWeight: '700', color: theme.text },
    transferList: {
      marginTop: 12,
      gap: 8,
    },
    breakdownList: {
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      gap: 10,
    },
    breakdownEmpty: { fontSize: 12.5, color: theme.textMuted },
    breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    breakdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    breakdownIcon: { fontSize: 15 },
    breakdownLabel: { fontSize: 13, fontWeight: '600', color: theme.text },
    breakdownRight: { alignItems: 'flex-end' },
    breakdownAmount: { fontSize: 13, fontWeight: '700', color: theme.text },
    breakdownPct: { fontSize: 10.5, color: theme.textMuted, marginTop: 1 },
  });
