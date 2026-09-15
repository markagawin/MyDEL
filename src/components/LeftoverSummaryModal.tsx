import React, { useMemo, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CycleRange, LeftoverWithdrawal, Transaction } from '../types';
import { formatPeso } from '../currency';
import { formatFullDate, formatTimeOfDay } from '../cycleEngine';
import { computePastCycleRemainings, computeTotalLeftover } from '../cycleFinance';
import { leftoverActionOf, leftoverSignedAmount } from '../leftover';
import { AppTheme, useTheme } from '../theme';
import LeftoverWithdrawModal, { LeftoverWithdrawSubmission } from './LeftoverWithdrawModal';
import Toast from './Toast';

interface Props {
  visible: boolean;
  transactions: Transaction[];
  currentCycleRange: CycleRange;
  paychecks: Record<string, number>;
  leftoverWithdrawals: LeftoverWithdrawal[];
  onAddWithdrawal: (amount: number, note?: string, date?: Date) => string;
  onAddReturn: (amount: number, note?: string, date?: Date) => string;
  onRemoveWithdrawal: (id: string) => void;
  onClose: () => void;
}

export default function LeftoverSummaryModal({
  visible,
  transactions,
  currentCycleRange,
  paychecks,
  leftoverWithdrawals,
  onAddWithdrawal,
  onAddReturn,
  onRemoveWithdrawal,
  onClose,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [entryModalMode, setEntryModalMode] = useState<'withdraw' | 'return' | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastUndoId, setToastUndoId] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rows = useMemo(
    () => computePastCycleRemainings(transactions, paychecks, currentCycleRange, leftoverWithdrawals),
    [transactions, paychecks, currentCycleRange, leftoverWithdrawals]
  );
  const grossTotal = useMemo(() => computeTotalLeftover(rows), [rows]);
  const netWithdrawn = useMemo(
    () => leftoverWithdrawals.reduce((sum, w) => sum + leftoverSignedAmount(w), 0),
    [leftoverWithdrawals]
  );
  const total = grossTotal - netWithdrawn;

  const sortedWithdrawals = useMemo(
    () =>
      [...leftoverWithdrawals].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    [leftoverWithdrawals]
  );

  const showToast = (message: string, undoId: string | null) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    setToastUndoId(undoId);
    setToastVisible(true);
    toastTimeoutRef.current = setTimeout(() => {
      setToastVisible(false);
      setToastUndoId(null);
    }, 2200);
  };

  const handleEntrySubmit = (data: LeftoverWithdrawSubmission) => {
    if (entryModalMode === 'return') {
      const newId = onAddReturn(data.amount, data.note, data.date);
      setEntryModalMode(null);
      showToast(`${formatPeso(data.amount)} returned to leftover budget`, newId);
    } else {
      const newId = onAddWithdrawal(data.amount, data.note, data.date);
      setEntryModalMode(null);
      showToast(`${formatPeso(data.amount)} withdrawn from leftover budget`, newId);
    }
  };

  const handleUndo = () => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    if (toastUndoId) onRemoveWithdrawal(toastUndoId);
    setToastVisible(false);
    setToastUndoId(null);
  };

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
          <View style={styles.actionButtonRow}>
            <TouchableOpacity
              style={styles.withdrawButton}
              onPress={() => setEntryModalMode('withdraw')}
            >
              <Text style={styles.withdrawButtonText}>Withdraw</Text>
            </TouchableOpacity>
            {netWithdrawn > 0 && (
              <TouchableOpacity
                style={styles.withdrawButton}
                onPress={() => setEntryModalMode('return')}
              >
                <Text style={styles.withdrawButtonText}>Return</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={styles.explainer}>
          Money you didn't spend in a past cycle doesn't carry into the next one's paycheck — it's
          just sitting there. This adds it all up so you can treat it as extra budget on top of
          your current cycle. Only counts cycles that have ended and had a paycheck set; a cycle
          you went over shows as a negative. Withdraw from it when you actually spend some, or
          return money you took out but didn't end up needing.
        </Text>

        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0 }}>
          {sortedWithdrawals.length > 0 && (
            <>
              <Text style={styles.sectionHeading}>ACTIVITY</Text>
              {sortedWithdrawals.map((w) => {
                const isReturn = leftoverActionOf(w) === 'return';
                return (
                  <View key={w.id} style={styles.row}>
                    <View style={styles.rowMiddle}>
                      <Text style={styles.rowLabel}>
                        {w.note?.trim() || (isReturn ? 'Return' : 'Withdrawal')}
                      </Text>
                      <Text style={styles.rowTime}>
                        {formatFullDate(new Date(w.timestamp))} · {formatTimeOfDay(new Date(w.timestamp))}
                      </Text>
                    </View>
                    <Text style={isReturn ? styles.rowAmount : styles.rowAmountNegative}>
                      {isReturn ? '+ ' : '− '}
                      {formatPeso(w.amount)}
                    </Text>
                    <TouchableOpacity
                      accessibilityLabel={isReturn ? 'Delete return' : 'Delete withdrawal'}
                      style={styles.deleteButton}
                      onPress={() => onRemoveWithdrawal(w.id)}
                    >
                      <Text style={styles.deleteIcon}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </>
          )}

          {rows.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                Once a pay cycle ends with a paycheck set, it'll show up here.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionHeading}>PAST CYCLES</Text>
              {rows.map((row) => (
                <View key={row.identifier} style={styles.row}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <Text style={[styles.rowAmount, row.remaining < 0 && styles.rowAmountNegative]}>
                    {row.remaining < 0 ? '− ' : ''}
                    {formatPeso(Math.abs(row.remaining))}
                  </Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <LeftoverWithdrawModal
        visible={entryModalMode !== null}
        mode={entryModalMode ?? 'withdraw'}
        availableToWithdraw={total}
        totalWithdrawnSoFar={netWithdrawn}
        onSubmit={handleEntrySubmit}
        onClose={() => setEntryModalMode(null)}
      />

      <Toast visible={toastVisible} message={toastMessage} onUndo={handleUndo} />
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
    actionButtonRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
    },
    withdrawButton: {
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 24,
    },
    withdrawButtonText: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '700' },
    explainer: {
      fontSize: 12,
      color: theme.textMuted,
      lineHeight: 17,
      paddingHorizontal: 20,
      marginTop: 14,
      marginBottom: 6,
    },
    emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyText: { color: theme.textMuted, fontSize: 14, textAlign: 'center' },
    sectionHeading: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textMuted,
      letterSpacing: 0.5,
      marginTop: 8,
      marginBottom: 8,
    },
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
    rowMiddle: { flex: 1, marginRight: 8 },
    rowLabel: { fontSize: 13.5, fontWeight: '600', color: theme.text },
    rowTime: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
    rowAmount: { fontSize: 14.5, fontWeight: '700', color: theme.success },
    rowAmountNegative: { fontSize: 14.5, fontWeight: '700', color: theme.danger },
    deleteButton: { marginLeft: 12, padding: 4 },
    deleteIcon: { fontSize: 15 },
  });
