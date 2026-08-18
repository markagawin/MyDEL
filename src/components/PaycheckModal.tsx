import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppTheme, useTheme } from '../theme';

interface Props {
  visible: boolean;
  currentAmount: number | null;
  onSave: (amount: number | null) => void;
  onClose: () => void;
}

export default function PaycheckModal({ visible, currentAmount, onSave, onClose }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [text, setText] = useState('');

  useEffect(() => {
    if (visible) {
      setText(currentAmount !== null ? String(currentAmount) : '');
    }
  }, [visible, currentAmount]);

  const handleSave = () => {
    const value = parseFloat(text);
    if (!Number.isNaN(value) && value > 0) {
      onSave(value);
    }
    onClose();
  };

  const handleClear = () => {
    onSave(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>Paycheck for this period</Text>
          <Text style={styles.subtitle}>
            Enter the amount you received so MyDEL can show what's left as you spend.
          </Text>
          <View style={styles.inputWrap}>
            <Text style={styles.pesoSign}>₱</Text>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={(v) => setText(v.replace(/[^0-9.]/g, ''))}
              placeholder="0.00"
              placeholderTextColor={theme.textMuted}
              keyboardType="decimal-pad"
              autoFocus
            />
          </View>
          <View style={styles.buttonRow}>
            {currentAmount !== null && (
              <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,44,89,0.35)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: { backgroundColor: theme.card, borderRadius: 16, padding: 20 },
  title: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 6 },
  subtitle: { fontSize: 12.5, color: theme.textMuted, marginBottom: 16 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  pesoSign: { fontSize: 20, fontWeight: '700', color: theme.navy, marginRight: 6 },
  input: { flex: 1, fontSize: 20, fontWeight: '700', color: theme.text },
  buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  clearButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  clearButtonText: { color: theme.danger, fontWeight: '700', fontSize: 14 },
  saveButton: {
    backgroundColor: theme.navy,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  saveButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
