import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { formatFullDate, startOfDay } from '../cycleEngine';
import { digitsFromDate, formatDateMask, parseMaskedDate } from '../dateInputMask';
import { AppTheme, useTheme } from '../theme';
import { noWebOutline } from '../webInputStyle';

interface Props {
  start: Date;
  end: Date;
  onChange: (start: Date, end: Date) => void;
}

export default function CustomRangeBar({ start, end, onChange }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [editing, setEditing] = useState<'start' | 'end' | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState(false);

  const openEditor = (field: 'start' | 'end') => {
    setText(formatDateMask(digitsFromDate(field === 'start' ? start : end)));
    setError(false);
    setEditing(field);
  };

  const handleTextChange = (value: string) => {
    setText(formatDateMask(value));
    setError(false);
  };

  const handleDone = () => {
    const parsed = parseMaskedDate(text);
    if (!parsed) {
      setError(true);
      return;
    }
    const day = startOfDay(parsed);
    if (editing === 'start') {
      onChange(day, end);
    } else {
      onChange(start, day);
    }
    setEditing(null);
  };

  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.dateButton} onPress={() => openEditor('start')}>
        <Text style={styles.dateLabel}>FROM</Text>
        <Text style={styles.dateValue}>{formatFullDate(start)}</Text>
      </TouchableOpacity>
      <Text style={styles.arrow}>→</Text>
      <TouchableOpacity style={styles.dateButton} onPress={() => openEditor('end')}>
        <Text style={styles.dateLabel}>TO</Text>
        <Text style={styles.dateValue}>{formatFullDate(end)}</Text>
      </TouchableOpacity>

      {editing && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setEditing(null)}>
          <Pressable style={styles.backdrop} onPress={() => setEditing(null)}>
            <Pressable style={styles.sheet} onPress={() => {}} onStartShouldSetResponder={() => true}>
              <Text style={styles.sheetTitle}>{editing === 'start' ? 'From date' : 'To date'}</Text>
              <Text style={styles.sheetHint}>Enter as MM/DD/YYYY</Text>
              <TextInput
                style={[styles.dateInput, error && styles.dateInputError, noWebOutline]}
                value={text}
                onChangeText={handleTextChange}
                placeholder="MM/DD/YYYY"
                placeholderTextColor={theme.textMuted}
                keyboardType="number-pad"
                maxLength={10}
                autoFocus
                onSubmitEditing={handleDone}
              />
              {error && <Text style={styles.errorText}>Enter a valid date (MM/DD/YYYY)</Text>}
              <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  dateButton: {
    flex: 1,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dateLabel: { fontSize: 10, fontWeight: '700', color: theme.textMuted, letterSpacing: 0.5 },
  dateValue: { fontSize: 13, fontWeight: '600', color: theme.text, marginTop: 2 },
  arrow: { marginHorizontal: 8, color: theme.textMuted },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,44,89,0.35)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: { backgroundColor: theme.card, borderRadius: 16, padding: 20 },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: theme.text, marginBottom: 4 },
  sheetHint: { fontSize: 12, color: theme.textMuted, marginBottom: 14 },
  dateInput: {
    backgroundColor: theme.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
    textAlign: 'center',
    letterSpacing: 1,
  },
  dateInputError: { borderColor: theme.danger },
  errorText: { color: theme.danger, fontSize: 12, marginTop: 8 },
  doneButton: {
    marginTop: 16,
    backgroundColor: theme.navy,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  doneButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
