import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CategoryKey } from '../types';
import { CategoryMeta } from '../categories';
import { formatPeso } from '../currency';
import { formatFullDate, sameDay } from '../cycleEngine';
import {
  BORROW_CATEGORY_KEY,
} from '../borrow';
import { LENDING_CATEGORY_KEY } from '../lending';
import { SAVINGS_CATEGORY_KEY } from '../savings';
import { CREDIT_CARD_CATEGORY_KEY } from '../creditCard';
import { AppTheme, useTheme } from '../theme';
import { noWebOutline } from '../webInputStyle';
import DatePickerModal from './DatePickerModal';

export type CreditCardAction = 'charge' | 'pay';

export interface CreditCardEntrySubmission {
  action: CreditCardAction;
  category: CategoryKey | null;
  amount: number;
  note: string;
  date: Date;
}

interface Props {
  visible: boolean;
  categories: CategoryMeta[];
  currentBalance: number;
  onSubmit: (data: CreditCardEntrySubmission) => void;
  onClose: () => void;
}

export default function CreditCardEntryModal({
  visible,
  categories,
  currentBalance,
  onSubmit,
  onClose,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [action, setAction] = useState<CreditCardAction>('charge');
  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [entryDate, setEntryDate] = useState(() => new Date());
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setAction('charge');
      setCategory(null);
      setAmountText('');
      setNote('');
      setEntryDate(new Date());
      setDatePickerVisible(false);
    }
  }, [visible]);

  // A purchase needs a real category (Food, Bills, etc.) — Savings, Borrow, Lending, and Credit
  // Card itself don't make sense as "what this purchase was for". A payment doesn't need one at
  // all; it's always its own Credit Card category under the hood.
  const purchaseCategories = useMemo(
    () =>
      categories.filter(
        (c) =>
          c.key !== SAVINGS_CATEGORY_KEY &&
          c.key !== CREDIT_CARD_CATEGORY_KEY &&
          c.key !== BORROW_CATEGORY_KEY &&
          c.key !== LENDING_CATEGORY_KEY
      ),
    [categories]
  );

  const amountValue = parseFloat(amountText);
  const hasValidAmount = !Number.isNaN(amountValue) && amountValue > 0;
  const canSubmit = hasValidAmount && (action === 'pay' || category !== null);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ action, category: action === 'pay' ? null : category, amount: amountValue, note, date: entryDate });
  };

  const title = action === 'pay' ? 'Pay Card' : 'Charge to Card';

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

            <Text style={styles.balanceLine}>💳 Owed so far: {formatPeso(currentBalance)}</Text>

            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleOption, action === 'charge' && styles.toggleOptionActive]}
                onPress={() => setAction('charge')}
              >
                <Text style={[styles.toggleText, action === 'charge' && styles.toggleTextActive]}>
                  Charge
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleOption, action === 'pay' && styles.toggleOptionActive]}
                onPress={() => setAction('pay')}
              >
                <Text style={[styles.toggleText, action === 'pay' && styles.toggleTextActive]}>
                  Pay Card
                </Text>
              </TouchableOpacity>
            </View>

            {action === 'charge' && (
              <>
                <Text style={styles.fieldLabel}>WHAT WAS THIS FOR?</Text>
                <View style={styles.chipRow}>
                  {purchaseCategories.map((c) => {
                    const selected = category === c.key;
                    return (
                      <TouchableOpacity
                        key={c.key}
                        style={[styles.chip, selected && styles.chipSelected]}
                        onPress={() => setCategory(c.key)}
                      >
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                          {c.icon} {c.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
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
                placeholder="e.g. Grocery run"
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
