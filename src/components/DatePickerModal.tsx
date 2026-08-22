import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { startOfDay } from '../cycleEngine';
import { digitsFromDate, formatDateMask, parseMaskedDate } from '../dateInputMask';
import { AppTheme, useTheme } from '../theme';
import { noWebOutline } from '../webInputStyle';

interface Props {
  visible: boolean;
  value: Date;
  maxDate?: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
}

export default function DatePickerModal({ visible, value, maxDate, onChange, onClose }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setText(formatDateMask(digitsFromDate(value)));
      setError(null);
    }
  }, [visible, value]);

  const handleTextChange = (v: string) => {
    setText(formatDateMask(v));
    setError(null);
  };

  const handleDone = () => {
    const parsed = parseMaskedDate(text);
    if (!parsed) {
      setError('Enter a valid date (MM/DD/YYYY)');
      return;
    }
    if (maxDate && startOfDay(parsed) > startOfDay(maxDate)) {
      setError("Can't log a future date");
      return;
    }
    // Keep the existing time-of-day (either "now" from the default, or whatever was last
    // picked) — only the calendar day changes here.
    const combined = new Date(
      parsed.getFullYear(),
      parsed.getMonth(),
      parsed.getDate(),
      value.getHours(),
      value.getMinutes(),
      value.getSeconds(),
      value.getMilliseconds()
    );
    onChange(combined);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>Entry date</Text>
          <Text style={styles.hint}>Enter as MM/DD/YYYY</Text>
          <TextInput
            style={[styles.input, !!error && styles.inputError, noWebOutline]}
            value={text}
            onChangeText={handleTextChange}
            placeholder="MM/DD/YYYY"
            placeholderTextColor={theme.textMuted}
            keyboardType="number-pad"
            maxLength={10}
            autoFocus
            onSubmitEditing={handleDone}
          />
          {error && <Text style={styles.errorText}>{error}</Text>}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
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
    sheet: { backgroundColor: theme.card, borderRadius: 16, padding: 20 },
    title: { fontSize: 15, fontWeight: '700', color: theme.text, marginBottom: 4 },
    hint: { fontSize: 12, color: theme.textMuted, marginBottom: 14 },
    input: {
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
    inputError: { borderColor: theme.danger },
    errorText: { color: theme.danger, fontSize: 12, marginTop: 8 },
    buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
    cancelButton: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10 },
    cancelButtonText: { color: theme.textMuted, fontWeight: '700', fontSize: 14 },
    doneButton: {
      backgroundColor: theme.navy,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 20,
    },
    doneButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  });
