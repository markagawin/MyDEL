import React, { useMemo } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CycleRange, Transaction } from '../types';
import { formatPeso } from '../currency';
import { computePastCycleRemainings, computeTotalLeftover } from '../cycleFinance';
import { AppTheme, useTheme } from '../theme';

interface Props {
  visible: boolean;
  transactions: Transaction[];
  currentCycleRange: CycleRange;
  paychecks: Record<string, number>;
  onClose: () => void;
}

export default function LeftoverSummaryModal({
  visible,
  transactions,
  currentCycleRange,
  paychecks,
  onClose,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const rows = useMemo(
    () => computePastCycleRemainings(transactions, paychecks, currentCycleRange),
    [transactions, paychecks, currentCycleRange]
  );
  const total = useMemo(() => computeTotalLeftover(rows), [rows]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityLabel="Close leftover budget" onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Leftover Budget</Text>
          <View style={styles.closeButton} />
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Leftover</Text>
          <Text style={[styles.totalValue, total < 0 && styles.totalValueNegative]}>
            {formatPeso(total)}
          </Text>
          <Text style={styles.totalHint}>
            {rows.length === 0
              ? 'No ended pay cycles with a paycheck set yet'
              : `Unspent across ${rows.length} past pay ${rows.length === 1 ? 'cycle' : 'cycles'}`}
          </Text>
        </View>

        <Text style={styles.explainer}>
          Money you didn't spend in a past cycle doesn't carry into the next one's paycheck — it's
          just sitting there. This adds it all up so you can treat it as extra budget on top of
          your current cycle. Only counts cycles that have ended and had a paycheck set; a cycle
          you went over shows as a negative.
        </Text>

        {rows.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              Once a pay cycle ends with a paycheck set, it'll show up here.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0 }}>
            {rows.map((row) => (
              <View key={row.identifier} style={styles.row}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={[styles.rowAmount, row.remaining < 0 && styles.rowAmountNegative]}>
                  {row.remaining < 0 ? '− ' : ''}
                  {formatPeso(Math.abs(row.remaining))}
                </Text>
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
    totalValueNegative: { color: '#FF9B9B' },
    totalHint: { color: '#9FB2D6', fontSize: 11.5, marginTop: 6, textAlign: 'center' },
    explainer: {
      fontSize: 12,
      color: theme.textMuted,
      lineHeight: 17,
      paddingHorizontal: 20,
      marginTop: 14,
      marginBottom: 6,
    },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyText: { color: theme.textMuted, fontSize: 14, textAlign: 'center' },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 10,
    },
    rowLabel: { fontSize: 13.5, fontWeight: '600', color: theme.text },
    rowAmount: { fontSize: 14.5, fontWeight: '700', color: theme.success },
    rowAmountNegative: { color: theme.danger },
  });
