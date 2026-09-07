import React, { useMemo } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CycleRange, Transaction } from '../types';
import { formatPeso } from '../currency';
import { getAvailableCycles } from '../cycleList';
import { isSavingsTransaction, savingsSignedAmount } from '../savings';
import { isCreditPurchase } from '../creditCard';
import { isLendingTransaction, lendingSignedAmount } from '../lending';
import { isBorrowTransaction, borrowSignedAmount } from '../borrow';
import { AppTheme, useTheme } from '../theme';

interface Props {
  visible: boolean;
  transactions: Transaction[];
  currentCycleRange: CycleRange;
  paychecks: Record<string, number>;
  onClose: () => void;
}

interface CycleRow {
  identifier: string;
  label: string;
  isCurrent: boolean;
  paycheck: number | null;
  spent: number;
  remaining: number | null;
}

export default function CycleHistoryModal({
  visible,
  transactions,
  currentCycleRange,
  paychecks,
  onClose,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const rows = useMemo<CycleRow[]>(() => {
    const cycleOptions = getAvailableCycles(transactions, currentCycleRange);
    return cycleOptions.map((opt) => {
      const cycleTxs = transactions.filter((t) => t.cycleIdentifier === opt.identifier);
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
      // Same exclusions as "Total spent so far" — real spending only, no transfers.
      const spent = cycleTxs
        .filter(
          (t) =>
            !isSavingsTransaction(t) &&
            !isCreditPurchase(t) &&
            !isLendingTransaction(t) &&
            !isBorrowTransaction(t)
        )
        .reduce((sum, t) => sum + t.amount, 0);
      const paycheck = paychecks[opt.identifier] ?? null;
      const remaining = paycheck !== null ? paycheck - outflow : null;
      return {
        identifier: opt.identifier,
        label: opt.label,
        isCurrent: opt.isCurrent,
        paycheck,
        spent,
        remaining,
      };
    });
  }, [transactions, currentCycleRange, paychecks]);

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
            {rows.map((row) => (
              <View key={row.identifier} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardLabel}>{row.label}</Text>
                    {row.isCurrent && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>Current</Text>
                      </View>
                    )}
                  </View>
                  {row.remaining !== null ? (
                    <Text
                      style={[styles.remainingValue, row.remaining < 0 && styles.remainingNegative]}
                    >
                      {formatPeso(row.remaining)}
                    </Text>
                  ) : (
                    <Text style={styles.noPaycheckValue}>No paycheck set</Text>
                  )}
                </View>
                <Text style={styles.cardSubLabel}>
                  {row.remaining !== null
                    ? row.remaining < 0
                      ? 'Over the paycheck'
                      : row.isCurrent
                        ? 'Remaining so far'
                        : 'Left at cycle end'
                    : ' '}
                </Text>
                <View style={styles.statRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>PAYCHECK</Text>
                    <Text style={styles.statValue}>
                      {row.paycheck !== null ? formatPeso(row.paycheck) : '—'}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>SPENT</Text>
                    <Text style={styles.statValue}>{formatPeso(row.spent)}</Text>
                  </View>
                </View>
              </View>
            ))}
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
    remainingValue: { fontSize: 16, fontWeight: '800', color: theme.text },
    remainingNegative: { color: theme.danger },
    noPaycheckValue: { fontSize: 12.5, fontWeight: '600', color: theme.textMuted },
    cardSubLabel: { fontSize: 11, color: theme.textMuted, marginTop: 2, marginBottom: 10 },
    statRow: { flexDirection: 'row', gap: 24 },
    statItem: {},
    statLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.textMuted,
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    statValue: { fontSize: 13.5, fontWeight: '700', color: theme.text },
  });
