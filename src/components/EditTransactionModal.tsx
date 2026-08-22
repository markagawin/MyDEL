import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CategoryMeta } from '../categories';
import { CategoryKey, Transaction } from '../types';
import { AppTheme, useTheme } from '../theme';

interface Props {
  transaction: Transaction | null;
  categories: CategoryMeta[];
  onSave: (id: string, input: { amount: number; category: CategoryKey; note?: string }) => void;
  onClose: () => void;
}

export default function EditTransactionModal({ transaction, categories, onSave, onClose }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [amountText, setAmountText] = useState('');
  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (transaction) {
      setAmountText(String(transaction.amount));
      setCategory(transaction.category);
      setNote(transaction.note ?? '');
    }
  }, [transaction]);

  const amountValue = parseFloat(amountText);
  const canSave = !Number.isNaN(amountValue) && amountValue > 0 && category !== null;

  const handleSave = () => {
    if (!canSave || category === null || !transaction) return;
    onSave(transaction.id, { amount: amountValue, category, note: note.trim() || undefined });
    onClose();
  };

  return (
    <Modal visible={transaction !== null} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}} onStartShouldSetResponder={() => true}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Edit Entry</Text>

            <Text style={styles.fieldLabel}>AMOUNT</Text>
            <View style={styles.amountWrap}>
              <Text style={styles.pesoSign}>₱</Text>
              <TextInput
                style={styles.amountInput}
                value={amountText}
                onChangeText={(v) => setAmountText(v.replace(/[^0-9.]/g, ''))}
                placeholder="0.00"
                placeholderTextColor={theme.textMuted}
                keyboardType="decimal-pad"
                maxLength={10}
              />
            </View>

            <Text style={styles.fieldLabel}>CATEGORY</Text>
            <View style={styles.grid}>
              {categories.map((cat) => {
                const selected = category === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    onPress={() => setCategory(cat.key)}
                    style={[
                      styles.tile,
                      selected && { backgroundColor: cat.color, borderColor: cat.color },
                    ]}
                  >
                    <Text style={styles.tileIcon}>{cat.icon}</Text>
                    <Text
                      style={[styles.tileLabel, selected && styles.tileLabelSelected]}
                      numberOfLines={1}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>NOTE (OPTIONAL)</Text>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Lunch with team"
              placeholderTextColor={theme.textMuted}
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
                disabled={!canSave}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
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
    sheet: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 20,
      maxHeight: '85%',
    },
    title: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 14 },
    fieldLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textMuted,
      letterSpacing: 0.5,
      marginBottom: 8,
      marginTop: 4,
    },
    amountWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 10,
      paddingHorizontal: 14,
      marginBottom: 14,
    },
    pesoSign: { fontSize: 18, fontWeight: '700', color: theme.navy, marginRight: 6 },
    amountInput: { flex: 1, fontSize: 18, fontWeight: '700', color: theme.text },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    tile: {
      width: '23.5%',
      aspectRatio: 1,
      backgroundColor: theme.background,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    tileIcon: { fontSize: 20, marginBottom: 2 },
    tileLabel: { fontSize: 9.5, fontWeight: '600', color: theme.text, textAlign: 'center' },
    tileLabelSelected: { color: '#FFFFFF' },
    noteInput: {
      backgroundColor: theme.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      color: theme.text,
      marginBottom: 18,
    },
    buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
    cancelButton: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10 },
    cancelButtonText: { color: theme.textMuted, fontWeight: '700', fontSize: 14 },
    saveButton: {
      backgroundColor: theme.navy,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 10,
    },
    saveButtonDisabled: { backgroundColor: theme.disabled },
    saveButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  });
