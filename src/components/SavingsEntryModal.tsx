import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SavingsAction, SavingsGoal } from '../types';
import { formatPeso } from '../currency';
import { formatFullDate, sameDay } from '../cycleEngine';
import { AppTheme, useTheme } from '../theme';
import { noWebOutline } from '../webInputStyle';
import AddSavingsGoalModal from './AddSavingsGoalModal';
import DatePickerModal from './DatePickerModal';

export interface SavingsEntrySubmission {
  action: SavingsAction;
  goalId: string | null;
  amount: number;
  note: string;
  date: Date;
}

interface Props {
  visible: boolean;
  savingsGoals: SavingsGoal[];
  currentTotalSaved: number;
  onAddGoal: (name: string) => string;
  onSubmit: (data: SavingsEntrySubmission) => void;
  onClose: () => void;
}

export default function SavingsEntryModal({
  visible,
  savingsGoals,
  currentTotalSaved,
  onAddGoal,
  onSubmit,
  onClose,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [action, setAction] = useState<SavingsAction>('deposit');
  const [goalId, setGoalId] = useState<string | null>(null);
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [entryDate, setEntryDate] = useState(() => new Date());
  const [addGoalModalVisible, setAddGoalModalVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setAction('deposit');
      setGoalId(null);
      setAmountText('');
      setNote('');
      setEntryDate(new Date());
      setAddGoalModalVisible(false);
      setDatePickerVisible(false);
    }
  }, [visible]);

  const amountValue = parseFloat(amountText);
  const hasValidAmount = !Number.isNaN(amountValue) && amountValue > 0;
  const canSubmit = hasValidAmount;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ action, goalId, amount: amountValue, note, date: entryDate });
  };

  const title = action === 'withdrawal' ? 'Withdraw' : 'Deposit';

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={() => {}} onStartShouldSetResponder={() => true}>
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity accessibilityLabel="Close" onPress={onClose} style={styles.headerButton}>
                <Text style={styles.headerButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.balanceLine}>💰 Total saved so far: {formatPeso(currentTotalSaved)}</Text>

            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleOption, action === 'deposit' && styles.toggleOptionActive]}
                onPress={() => setAction('deposit')}
              >
                <Text style={[styles.toggleText, action === 'deposit' && styles.toggleTextActive]}>
                  Deposit
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleOption, action === 'withdrawal' && styles.toggleOptionActive]}
                onPress={() => setAction('withdrawal')}
              >
                <Text
                  style={[styles.toggleText, action === 'withdrawal' && styles.toggleTextActive]}
                >
                  Withdrawal
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>GOAL (OPTIONAL)</Text>
            <View style={styles.chipRow}>
              {savingsGoals.map((g) => {
                const selected = goalId === g.id;
                return (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setGoalId(selected ? null : g.id)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {g.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[styles.chip, styles.addChip]}
                onPress={() => setAddGoalModalVisible(true)}
              >
                <Text style={styles.addChipText}>+ Add Goal</Text>
              </TouchableOpacity>
            </View>

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
                placeholder="e.g. Bonus"
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
              <Text style={styles.actionButtonText}>Log Entry</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <AddSavingsGoalModal
        visible={addGoalModalVisible}
        onSave={(name) => setGoalId(onAddGoal(name))}
        onClose={() => setAddGoalModalVisible(false)}
      />

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
      marginBottom: 14,
    },
    toggleRow: {
      flexDirection: 'row',
      backgroundColor: theme.surfaceMuted,
      borderRadius: 12,
      padding: 3,
      marginBottom: 16,
    },
    toggleOption: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 9,
      alignItems: 'center',
    },
    toggleOptionActive: { backgroundColor: theme.navy },
    toggleText: { fontSize: 13, fontWeight: '600', color: theme.textMuted },
    toggleTextActive: { color: '#FFFFFF' },
    fieldLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textMuted,
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    chip: {
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.background,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    chipSelected: { backgroundColor: theme.navy, borderColor: theme.navy },
    chipText: { fontSize: 13, fontWeight: '600', color: theme.text },
    chipTextSelected: { color: '#FFFFFF' },
    addChip: { borderStyle: 'dashed' },
    addChipText: { fontSize: 13, fontWeight: '600', color: theme.textMuted },
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
