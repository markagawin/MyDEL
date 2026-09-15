import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { formatPeso } from '../currency';
import { formatFullDate, sameDay } from '../cycleEngine';
import { AppTheme, useTheme } from '../theme';
import { noWebOutline } from '../webInputStyle';
import DatePickerModal from './DatePickerModal';

export interface LeftoverWithdrawSubmission {
  amount: number;
  note: string;
  date: Date;
}

interface Props {
  visible: boolean;
  mode: 'withdraw' | 'return';
  availableToWithdraw: number;
  totalWithdrawnSoFar: number;
  onSubmit: (data: LeftoverWithdrawSubmission) => void;
  onClose: () => void;
}

export default function LeftoverWithdrawModal({
  visible,
  mode,
  availableToWithdraw,
  totalWithdrawnSoFar,
  onSubmit,
  onClose,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [entryDate, setEntryDate] = useState(() => new Date());
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setAmountText('');
      setNote('');
      setEntryDate(new Date());
      setDatePickerVisible(false);
    }
  }, [visible]);

  const isReturn = mode === 'return';
  const amountValue = parseFloat(amountText);
  const hasValidAmount = !Number.isNaN(amountValue) && amountValue > 0;
  const exceedsWithdrawn = isReturn && hasValidAmount && amountValue > totalWithdrawnSoFar;
  const canSubmit = hasValidAmount && !exceedsWithdrawn;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ amount: amountValue, note, date: entryDate });
  };

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={() => {}} onStartShouldSetResponder={() => true}>
            <View style={styles.header}>
              <Text style={styles.title}>{isReturn ? 'Return' : 'Withdraw'}</Text>
              <TouchableOpacity accessibilityLabel="Close" onPress={onClose} style={styles.headerButton}>
                <Text style={styles.headerButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.balanceLine}>
              {isReturn
                ? `🧮 Withdrawn so far: ${formatPeso(totalWithdrawnSoFar)}`
                : `🧮 Available to withdraw: ${formatPeso(availableToWithdraw)}`}
            </Text>
            <Text style={styles.hint}>
              {isReturn
                ? "This reduces the current cycle's \"Remaining of paycheck\" in Quick Log."
                : "This tops up the current cycle's \"Remaining of paycheck\" in Quick Log."}
            </Text>
            {exceedsWithdrawn && (
              <Text style={styles.warning}>
                👇 Can't return more than you've withdrawn
              </Text>
            )}

            <Text style={styles.fieldLabel}>AMOUNT</Text>
            <View style={styles.amountWrap}>
              <Text style={styles.pesoSign}>₱</Text>
              <TextInput
                style={[styles.amountInput, noWebOutline]}
                value={amountText}
                onChangeText={(v) => setAmountText(v.replace(/[^0-9.]/g, ''))}
                placeholder="0.00"
                placeholderTextColor={theme.textMuted}
                keyboardType="decimal-pad"
                maxLength={10}
              />
            </View>

            <Text style={styles.fieldLabel}>NOTE (OPTIONAL)</Text>
            <View style={styles.noteWrap}>
              <TextInput
                style={[styles.noteInput, noWebOutline]}
                value={note}
                onChangeText={setNote}
                placeholder="e.g. Weekend trip"
                placeholderTextColor={theme.textMuted}
              />
            </View>

            <Text style={styles.fieldLabel}>DATE</Text>
            <TouchableOpacity style={styles.dateWrap} onPress={() => setDatePickerVisible(true)}>
              <Text style={styles.dateText}>
                {formatFullDate(entryDate)}
                {sameDay(entryDate, new Date()) ? ' (Today)' : ''}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, !canSubmit && styles.actionButtonDisabled]}
              disabled={!canSubmit}
              onPress={handleSubmit}
            >
              <Text style={styles.actionButtonText}>{isReturn ? 'Return' : 'Withdraw'}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <DatePickerModal
        visible={datePickerVisible}
        value={entryDate}
        maxDate={new Date()}
        onChange={setEntryDate}
        onClose={() => setDatePickerVisible(false)}
      />
    </>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(15,44,89,0.35)',
      justifyContent: 'center',
      padding: 24,
    },
    sheet: { backgroundColor: theme.card, borderRadius: 16, padding: 20 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    headerButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerButtonText: { fontSize: 16, color: theme.textMuted, fontWeight: '700' },
    title: { fontSize: 17, fontWeight: '800', color: theme.text },
    balanceLine: {
      fontSize: 12.5,
      fontWeight: '600',
      color: theme.textMuted,
      marginBottom: 4,
    },
    hint: {
      fontSize: 11.5,
      color: theme.textMuted,
      marginBottom: 14,
    },
    warning: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.danger,
      marginBottom: 14,
      marginTop: -6,
    },
    fieldLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textMuted,
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    amountWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.background,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    pesoSign: { fontSize: 20, fontWeight: '700', color: theme.navy, marginRight: 6 },
    amountInput: {
      flex: 1,
      fontSize: 22,
      fontWeight: '800',
      color: theme.text,
    },
    noteWrap: {
      backgroundColor: theme.surfaceMuted,
      borderRadius: 12,
      paddingHorizontal: 14,
      marginBottom: 16,
    },
    noteInput: { paddingVertical: 12, fontSize: 14, color: theme.text },
    dateWrap: {
      backgroundColor: theme.surfaceMuted,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
      marginBottom: 20,
    },
    dateText: { fontSize: 14, fontWeight: '600', color: theme.text },
    actionButton: {
      backgroundColor: theme.navy,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: 'center',
    },
    actionButtonDisabled: { backgroundColor: theme.disabled },
    actionButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  });
