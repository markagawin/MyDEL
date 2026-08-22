import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BackupData } from '../types';
import { AppTheme, useTheme } from '../theme';
import { noWebOutline } from '../webInputStyle';

interface Props {
  visible: boolean;
  onImport: (data: BackupData) => Promise<void>;
  onClose: () => void;
}

function pickWebFile(onText: (text: string) => void) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onText(String(reader.result ?? ''));
    reader.readAsText(file);
  };
  input.click();
}

export default function ImportBackupModal({ visible, onImport, onClose }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (visible) {
      setText('');
      setError(null);
      setImporting(false);
    }
  }, [visible]);

  const handleRestore = async () => {
    setError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setError("That doesn't look like valid backup JSON.");
      return;
    }
    if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as BackupData).transactions)) {
      setError("This file doesn't look like a MyDEL backup.");
      return;
    }
    setImporting(true);
    try {
      await onImport(parsed as BackupData);
      onClose();
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>Restore Backup</Text>
          <Text style={styles.hint}>
            Paste the contents of a MyDEL backup file below
            {Platform.OS === 'web' ? ', or choose the file directly' : ''}.
          </Text>

          {Platform.OS === 'web' && (
            <TouchableOpacity style={styles.fileButton} onPress={() => pickWebFile(setText)}>
              <Text style={styles.fileButtonText}>Choose File…</Text>
            </TouchableOpacity>
          )}

          <TextInput
            style={[styles.textArea, noWebOutline]}
            value={text}
            onChangeText={setText}
            placeholder="{ ... }"
            placeholderTextColor={theme.textMuted}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Text style={styles.warning}>
            Restoring replaces all current data on this device with the backup's contents.
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.restoreButton, (!text.trim() || importing) && styles.restoreButtonDisabled]}
              disabled={!text.trim() || importing}
              onPress={handleRestore}
            >
              <Text style={styles.restoreButtonText}>{importing ? 'Restoring…' : 'Restore'}</Text>
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
    sheet: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 20,
    },
    title: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 6 },
    hint: { fontSize: 12.5, color: theme.textMuted, marginBottom: 14 },
    fileButton: {
      alignSelf: 'flex-start',
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
      marginBottom: 12,
    },
    fileButtonText: { fontSize: 13, fontWeight: '700', color: theme.navy },
    textArea: {
      backgroundColor: theme.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 12.5,
      color: theme.text,
      minHeight: 140,
      marginBottom: 10,
    },
    errorText: { fontSize: 12.5, color: theme.danger, marginBottom: 10 },
    warning: { fontSize: 11.5, color: theme.textMuted, marginBottom: 18 },
    buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
    cancelButton: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10 },
    cancelButtonText: { color: theme.textMuted, fontWeight: '700', fontSize: 14 },
    restoreButton: {
      backgroundColor: theme.navy,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 10,
    },
    restoreButtonDisabled: { backgroundColor: theme.disabled },
    restoreButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  });
