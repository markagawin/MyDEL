import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Borrower, Transaction } from '../types';
import { formatPeso } from '../currency';
import { formatFullDate, formatTimeOfDay } from '../cycleEngine';
import {
  borrowActionOf,
  computeTotalBorrowed,
  isBorrowTransaction,
} from '../borrow';
import { AppTheme, useTheme } from '../theme';

interface Props {
  visible: boolean;
  transactions: Transaction[];
  borrowers: Borrower[];
  onClose: () => void;
}

export default function BorrowSummaryModal({ visible, transactions, borrowers, onClose }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalBorrowed = useMemo(() => computeTotalBorrowed(transactions), [transactions]);

  const borrowTransactions = useMemo(
    () => transactions.filter(isBorrowTransaction),
    [transactions]
  );

  const rows = useMemo(() => {
    const byLender = new Map<string, Transaction[]>();
    for (const tx of borrowTransactions) {
      if (!tx.borrowerId) continue;
      if (!byLender.has(tx.borrowerId)) byLender.set(tx.borrowerId, []);
      byLender.get(tx.borrowerId)!.push(tx);
    }
    return borrowers
      .filter((b) => byLender.has(b.id))
      .map((b) => {
        const entries = (byLender.get(b.id) ?? []).sort(
          (a, c) => new Date(c.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        const balance = entries.reduce(
          (sum, t) => sum + (borrowActionOf(t) === 'paid_back' ? -t.amount : t.amount),
          0
        );
        return { lender: b, entries, balance };
      })
      .sort((a, b2) => b2.balance - a.balance);
  }, [borrowers, borrowTransactions]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityLabel="Close borrow summary" onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Borrow</Text>
          <View style={styles.closeButton} />
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Borrowed</Text>
          <Text style={styles.totalValue}>{formatPeso(totalBorrowed)}</Text>
        </View>

        {rows.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No borrowing logged yet.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            {rows.map(({ lender, entries, balance }) => {
              const isExpanded = expandedId === lender.id;
              return (
                <TouchableOpacity
                  key={lender.id}
                  style={styles.personRow}
                  onPress={() => setExpandedId(isExpanded ? null : lender.id)}
                >
                  <View style={styles.personTop}>
                    <View>
                      <Text style={styles.personName}>{lender.name}</Text>
                      <Text style={styles.personHint}>
                        {balance > 0 ? 'You still owe' : balance < 0 ? 'They owe you' : 'Settled up'}
                      </Text>
                    </View>
                    <View style={styles.personRight}>
                      <Text style={styles.personBalance}>{formatPeso(balance)}</Text>
                      <Text style={styles.personChevron}>{isExpanded ? '▾' : '▸'}</Text>
                    </View>
                  </View>

                  {isExpanded && (
                    <View style={styles.entryList}>
                      {entries.map((tx) => {
                        const isPaidBack = borrowActionOf(tx) === 'paid_back';
                        return (
                          <View key={tx.id} style={styles.entryRow}>
                            <View style={styles.entryMiddle}>
                              <Text style={styles.entryLabel}>{isPaidBack ? 'Paid Back' : 'Borrowed'}</Text>
                              {tx.note ? <Text style={styles.entryNote}>{tx.note}</Text> : null}
                              <Text style={styles.entryTime}>
                                {formatFullDate(new Date(tx.timestamp))} ·{' '}
                                {formatTimeOfDay(new Date(tx.timestamp))}
                              </Text>
                            </View>
                            <Text
                              style={[styles.entryAmount, isPaidBack && styles.entryAmountRepaid]}
                            >
                              {isPaidBack ? '− ' : '+ '}
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
    personRow: {
      backgroundColor: theme.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 14,
      marginBottom: 10,
    },
    personTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    personName: { fontSize: 14.5, fontWeight: '700', color: theme.text },
    personHint: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
    personRight: { alignItems: 'flex-end' },
    personBalance: { fontSize: 15, fontWeight: '700', color: theme.text },
    personChevron: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
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
    entryAmountRepaid: { color: theme.success },
  });
