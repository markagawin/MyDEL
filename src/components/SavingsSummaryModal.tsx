import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SavingsGoal, Transaction } from '../types';
import { formatPeso } from '../currency';
import { formatFullDate, formatTimeOfDay } from '../cycleEngine';
import { computeTotalSaved, isSavingsTransaction, savingsActionOf } from '../savings';
import { AppTheme, useTheme } from '../theme';

interface Props {
  visible: boolean;
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  onClose: () => void;
}

const GENERAL_GOAL_KEY = '__general__';

export default function SavingsSummaryModal({ visible, transactions, savingsGoals, onClose }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const totalSaved = useMemo(() => computeTotalSaved(transactions), [transactions]);

  const savingsTransactions = useMemo(
    () => transactions.filter(isSavingsTransaction),
    [transactions]
  );

  const rows = useMemo(() => {
    const byGoal = new Map<string, Transaction[]>();
    for (const tx of savingsTransactions) {
      const key = tx.savingsGoalId ?? GENERAL_GOAL_KEY;
      if (!byGoal.has(key)) byGoal.set(key, []);
      byGoal.get(key)!.push(tx);
    }

    const named = savingsGoals
      .filter((g) => byGoal.has(g.id))
      .map((g) => ({ key: g.id, name: g.name, entries: byGoal.get(g.id)! }));
    const general = byGoal.has(GENERAL_GOAL_KEY)
      ? [{ key: GENERAL_GOAL_KEY, name: 'General Savings', entries: byGoal.get(GENERAL_GOAL_KEY)! }]
      : [];

    return [...named, ...general]
      .map(({ key, name, entries }) => {
        const sorted = entries.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        const balance = sorted.reduce(
          (sum, t) => sum + (savingsActionOf(t) === 'withdrawal' ? -t.amount : t.amount),
          0
        );
        return { key, name, entries: sorted, balance };
      })
      .sort((a, b) => b.balance - a.balance);
  }, [savingsGoals, savingsTransactions]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityLabel="Close savings summary" onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Savings</Text>
          <View style={styles.closeButton} />
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Saved</Text>
          <Text style={styles.totalValue}>{formatPeso(totalSaved)}</Text>
        </View>

        {rows.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No savings deposits or withdrawals logged yet.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            {rows.map(({ key, name, entries, balance }) => {
              const isExpanded = expandedKey === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={styles.goalRow}
                  onPress={() => setExpandedKey(isExpanded ? null : key)}
                >
                  <View style={styles.goalTop}>
                    <Text style={styles.goalName}>{name}</Text>
                    <View style={styles.goalRight}>
                      <Text style={styles.goalBalance}>{formatPeso(balance)}</Text>
                      <Text style={styles.goalChevron}>{isExpanded ? '▾' : '▸'}</Text>
                    </View>
                  </View>

                  {isExpanded && (
                    <View style={styles.entryList}>
                      {entries.map((tx) => {
                        const isWithdrawal = savingsActionOf(tx) === 'withdrawal';
                        return (
                          <View key={tx.id} style={styles.entryRow}>
                            <View style={styles.entryMiddle}>
                              <Text style={styles.entryLabel}>
                                {isWithdrawal ? 'Withdrawal' : 'Deposit'}
                              </Text>
                              {tx.note ? <Text style={styles.entryNote}>{tx.note}</Text> : null}
                              <Text style={styles.entryTime}>
                                {formatFullDate(new Date(tx.timestamp))} ·{' '}
                                {formatTimeOfDay(new Date(tx.timestamp))}
                              </Text>
                            </View>
                            <Text
                              style={[styles.entryAmount, isWithdrawal && styles.entryAmountWithdrawal]}
                            >
                              {isWithdrawal ? '− ' : '+ '}
                              {formatPeso(tx.amount)}
                            </Text>
                          </View>
                        );
                      })}
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
    totalCard: {
      backgroundColor: theme.navy,
      borderRadius: 16,
      padding: 18,
      marginHorizontal: 20,
      marginTop: 12,
      alignItems: 'center',
    },
    totalLabel: { color: '#9FB2D6', fontSize: 12, fontWeight: '700', marginBottom: 4 },
    totalValue: { color: '#FFFFFF', fontSize: 28, fontWeight: '800' },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyText: { color: theme.textMuted, fontSize: 14, textAlign: 'center' },
    goalRow: {
      backgroundColor: theme.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 14,
      marginBottom: 10,
    },
    goalTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    goalName: { fontSize: 14.5, fontWeight: '700', color: theme.text },
    goalRight: { alignItems: 'flex-end' },
    goalBalance: { fontSize: 15, fontWeight: '700', color: theme.text },
    goalChevron: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
    entryList: {
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      gap: 8,
    },
    entryRow: { flexDirection: 'row', alignItems: 'center' },
    entryMiddle: { flex: 1 },
    entryLabel: { fontSize: 13, fontWeight: '700', color: theme.text },
    entryNote: { fontSize: 12, color: theme.textMuted, marginTop: 1 },
    entryTime: { fontSize: 10.5, color: theme.textMuted, marginTop: 2 },
    entryAmount: { fontSize: 13, fontWeight: '700', color: theme.text },
    entryAmountWithdrawal: { color: theme.success },
  });
