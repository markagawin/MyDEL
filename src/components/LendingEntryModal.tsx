import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Borrower, LendingAction } from '../types';
import { formatFullDate, sameDay } from '../cycleEngine';
import { AppTheme, useTheme } from '../theme';
import { noWebOutline } from '../webInputStyle';
import AddBorrowerModal from './AddBorrowerModal';
import DatePickerModal from './DatePickerModal';

export interface LendingEntrySubmission {
  borrowerId: string;
  lendingAction: LendingAction;
  amount: number;
  note: string;
  date: Date;
}

interface Props {
  visible: boolean;
  borrowers: Borrower[];
  onAddBorrower: (name: string) => string;
  onSubmit: (data: LendingEntrySubmission) => void;
  onClose: () => void;
}

type Step = 1 | 2 | 3 | 4;
const TOTAL_STEPS = 4;

export default function LendingEntryModal({
  visible,
  borrowers,
  onAddBorrower,
  onSubmit,
  onClose,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [step, setStep] = useState<Step>(1);
  const [borrowerId, setBorrowerId] = useState<string | null>(null);
  const [lendingAction, setLendingAction] = useState<LendingAction>('lend');
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [entryDate, setEntryDate] = useState(() => new Date());
  const [addBorrowerModalVisible, setAddBorrowerModalVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const amountInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setStep(1);
      setBorrowerId(null);
      setLendingAction('lend');
      setAmountText('');
      setNote('');
      setEntryDate(new Date());
      setAddBorrowerModalVisible(false);
      setDatePickerVisible(false);
    }
  }, [visible]);

  const amountValue = parseFloat(amountText);
  const hasValidAmount = !Number.isNaN(amountValue) && amountValue > 0;
  const borrowerName = borrowers.find((b) => b.id === borrowerId)?.name;

  const goToPerson = (id: string) => {
    setBorrowerId(id);
    setStep(2);
  };

  const goToAmount = (action: LendingAction) => {
    setLendingAction(action);
    setStep(3);
    setTimeout(() => amountInputRef.current?.focus(), 50);
  };

  const handleSubmit = () => {
    if (!borrowerId || !hasValidAmount) return;
    onSubmit({ borrowerId, lendingAction, amount: amountValue, note, date: entryDate });
  };

  const goBack = () => setStep((s) => (s > 1 ? ((s - 1) as Step) : s));

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={() => {}} onStartShouldSetResponder={() => true}>
            <View style={styles.header}>
              {step > 1 ? (
                <TouchableOpacity accessibilityLabel="Back" onPress={goBack} style={styles.headerButton}>
                  <Text style={styles.headerButtonText}>‹</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.headerButton} />
              )}
              <View style={styles.stepDots}>
                {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                  <View
                    key={i}
                    style={[styles.stepDot, i + 1 === step && styles.stepDotActive]}
                  />
                ))}
              </View>
              <TouchableOpacity accessibilityLabel="Close" onPress={onClose} style={styles.headerButton}>
                <Text style={styles.headerButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {step === 1 && (
              <>
                <Text style={styles.title}>Who's this with?</Text>
                <View style={styles.chipRow}>
                  {borrowers.map((b) => (
                    <TouchableOpacity
                      key={b.id}
                      style={styles.chip}
                      onPress={() => goToPerson(b.id)}
                    >
                      <Text style={styles.chipText}>{b.name}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[styles.chip, styles.addChip]}
                    onPress={() => setAddBorrowerModalVisible(true)}
                  >
                    <Text style={styles.addChipText}>+ Add Person</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {step === 2 && (
              <>
                <Text style={styles.title}>Lend, or get repaid?</Text>
                {borrowerName ? <Text style={styles.subtitle}>{borrowerName}</Text> : null}
                <View style={styles.bigButtonRow}>
                  <TouchableOpacity style={styles.bigButton} onPress={() => goToAmount('lend')}>
                    <Text style={styles.bigButtonIcon}>🤝</Text>
                    <Text style={styles.bigButtonText}>Lend</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.bigButton} onPress={() => goToAmount('repaid')}>
                    <Text style={styles.bigButtonIcon}>💰</Text>
                    <Text style={styles.bigButtonText}>Repaid</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {step === 3 && (
              <>
                <Text style={styles.title}>
                  {lendingAction === 'repaid' ? 'How much were you repaid?' : 'How much did you lend?'}
                </Text>
                {borrowerName ? <Text style={styles.subtitle}>{borrowerName}</Text> : null}
                <View style={styles.amountWrap}>
                  <Text style={styles.pesoSign}>₱</Text>
                  <TextInput
                    ref={amountInputRef}
                    style={[styles.amountInput, noWebOutline]}
                    value={amountText}
                    onChangeText={(v) => setAmountText(v.replace(/[^0-9.]/g, ''))}
                    placeholder="0.00"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="decimal-pad"
                    maxLength={10}
                    onSubmitEditing={() => hasValidAmount && setStep(4)}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.actionButton, !hasValidAmount && styles.actionButtonDisabled]}
                  disabled={!hasValidAmount}
                  onPress={() => setStep(4)}
                >
                  <Text style={styles.actionButtonText}>Next</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 4 && (
              <>
                <Text style={styles.title}>Almost done</Text>
                <Text style={styles.fieldLabel}>NOTE (OPTIONAL)</Text>
                <View style={styles.noteWrap}>
                  <TextInput
                    style={[styles.noteInput, noWebOutline]}
                    value={note}
                    onChangeText={setNote}
                    placeholder="e.g. For gas money"
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
                <TouchableOpacity style={styles.actionButton} onPress={handleSubmit}>
                  <Text style={styles.actionButtonText}>Log Entry</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <AddBorrowerModal
        visible={addBorrowerModalVisible}
        onSave={(name) => goToPerson(onAddBorrower(name))}
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
    sheet: { backgroundColor: theme.card, borderRadius: 16, padding: 20, minHeight: 280 },
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
    stepDots: { flexDirection: 'row', gap: 6 },
    stepDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.border,
    },
    stepDotActive: { backgroundColor: theme.navy },
    title: { fontSize: 17, fontWeight: '800', color: theme.text, marginBottom: 4 },
    subtitle: { fontSize: 13, color: theme.textMuted, marginBottom: 16 },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 16,
    },
    chip: {
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.background,
      paddingHorizontal: 16,
      paddingVertical: 11,
    },
    chipText: { fontSize: 14, fontWeight: '600', color: theme.text },
    addChip: { borderStyle: 'dashed' },
    addChipText: { fontSize: 14, fontWeight: '600', color: theme.textMuted },
    bigButtonRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
    bigButton: {
      flex: 1,
      backgroundColor: theme.background,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: 16,
      paddingVertical: 24,
      alignItems: 'center',
    },
    bigButtonIcon: { fontSize: 30, marginBottom: 8 },
    bigButtonText: { fontSize: 15, fontWeight: '700', color: theme.text },
    amountWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.background,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 14,
      paddingHorizontal: 20,
      marginTop: 8,
      marginBottom: 20,
    },
    pesoSign: { fontSize: 24, fontWeight: '700', color: theme.navy, marginRight: 6 },
    amountInput: {
      fontSize: 30,
      fontWeight: '800',
      color: theme.text,
      minWidth: 100,
      textAlign: 'left',
    },
    fieldLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textMuted,
      letterSpacing: 0.5,
      marginBottom: 6,
      marginTop: 4,
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
