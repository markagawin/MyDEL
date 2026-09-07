import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Borrower, BorrowAction } from '../types';
import { formatFullDate, sameDay } from '../cycleEngine';
import { AppTheme, useTheme } from '../theme';
import { noWebOutline } from '../webInputStyle';
import AddBorrowerModal from './AddBorrowerModal';
import DatePickerModal from './DatePickerModal';

export interface BorrowEntrySubmission {
  borrowerId: string;
  borrowAction: BorrowAction;
  amount: number;
  note: string;
  date: Date;
}

interface Props {
  visible: boolean;
  action: BorrowAction;
  borrowers: Borrower[];
  onAddBorrower: (name: string) => string;
  onSubmit: (data: BorrowEntrySubmission) => void;
  onClose: () => void;
}

export default function BorrowEntryModal({
  visible,
  action,
  borrowers,
  onAddBorrower,
  onSubmit,
  onClose,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [borrowerId, setBorrowerId] = useState<string | null>(null);
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [entryDate, setEntryDate] = useState(() => new Date());
  const [addBorrowerModalVisible, setAddBorrowerModalVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setBorrowerId(null);
      setAmountText('');
      setNote('');
      setEntryDate(new Date());
      setAddBorrowerModalVisible(false);
      setDatePickerVisible(false);
    }
  }, [visible]);

  const amountValue = parseFloat(amountText);
  const hasValidAmount = !Number.isNaN(amountValue) && amountValue > 0;
  const canSubmit = borrowerId !== null && hasValidAmount;

  const handleSubmit = () => {
    if (!canSubmit || !borrowerId) return;
    onSubmit({ borrowerId, borrowAction: action, amount: amountValue, note, date: entryDate });
  };

  const title = action === 'paid_back' ? 'Pay Back' : 'Borrow';

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

            <Text style={styles.fieldLabel}>PERSON</Text>
            <View style={styles.chipRow}>
              {borrowers.map((b) => {
                const selected = borrowerId === b.id;
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setBorrowerId(b.id)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {b.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[styles.chip, styles.addChip]}
                onPress={() => setAddBorrowerModalVisible(true)}
              >
                <Text style={styles.addChipText}>+ Add Person</Text>
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
                placeholder="e.g. For groceries"
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

      <AddBorrowerModal
        visible={addBorrowerModalVisible}
        onSave={(name) => setBorrowerId(onAddBorrower(name))}
        onClose={() => setAddBorrowerModalVisible(false)}
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
      marginBottom: 14,
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
