import React, { useMemo } from 'react';
import { Modal, SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Transaction } from '../types';
import { formatPeso } from '../currency';
import { formatFullDate, formatTimeOfDay } from '../cycleEngine';
import { computeTotalSaved, isSavingsTransaction, savingsActionOf } from '../savings';
import { AppTheme, useTheme } from '../theme';

interface Props {
  visible: boolean;
  transactions: Transaction[];
  onClose: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

export default function SavingsSummaryModal({ visible, transactions, onClose }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const savingsTransactions = useMemo(
    () => transactions.filter(isSavingsTransaction),
    [transactions]
  );

  const totalSaved = useMemo(() => computeTotalSaved(transactions), [transactions]);

  const sections = useMemo(() => {
    const groups = new Map<string, { title: string; sortKey: number; data: Transaction[] }>();
    for (const tx of savingsTransactions) {
      const date = new Date(tx.timestamp);
      const key = monthKey(tx.timestamp);
      if (!groups.has(key)) {
        groups.set(key, {
          title: `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`,
          sortKey: new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
          data: [],
        });
      }
      groups.get(key)!.data.push(tx);
    }
    return Array.from(groups.values())
      .sort((a, b) => b.sortKey - a.sortKey)
      .map((g) => ({
        title: g.title,
        data: g.data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
      }));
  }, [savingsTransactions]);

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

        {sections.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No savings deposits or withdrawals logged yet.</Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            renderSectionHeader={({ section }) => (
              <Text style={styles.sectionHeader}>{section.title}</Text>
            )}
            renderItem={({ item }) => {
              const isWithdrawal = savingsActionOf(item) === 'withdrawal';
              return (
                <View style={styles.row}>
                  <View style={styles.rowMiddle}>
                    <Text style={styles.rowLabel}>{isWithdrawal ? 'Withdrawal' : 'Deposit'}</Text>
                    {item.note ? <Text style={styles.rowNote}>{item.note}</Text> : null}
                    <Text style={styles.rowTime}>
                      {formatFullDate(new Date(item.timestamp))} · {formatTimeOfDay(new Date(item.timestamp))}
                    </Text>
                  </View>
                  <Text style={[styles.rowAmount, isWithdrawal && styles.rowAmountWithdrawal]}>
                    {isWithdrawal ? '− ' : '+ '}
                    {formatPeso(item.amount)}
                  </Text>
                </View>
              );
            }}
          />
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
    sectionHeader: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textMuted,
      marginTop: 14,
      marginBottom: 6,
      textTransform: 'uppercase',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 14,
      marginBottom: 8,
    },
    rowMiddle: { flex: 1 },
    rowLabel: { fontSize: 14, fontWeight: '700', color: theme.text },
    rowNote: { fontSize: 12.5, color: theme.textMuted, marginTop: 2 },
    rowTime: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
    rowAmount: { fontSize: 15, fontWeight: '700', color: theme.text },
    rowAmountWithdrawal: { color: theme.success },
  });
