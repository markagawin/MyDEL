import React, { useEffect, useState } from 'react';
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
import { CATEGORY_COLOR_CHOICES, CATEGORY_ICON_CHOICES } from '../categories';
import { theme } from '../theme';

interface Props {
  visible: boolean;
  categoryCount: number;
  onSave: (input: { label: string; icon: string; color: string }) => void;
  onClose: () => void;
}

const SOFT_CAP = 12;

export default function AddCategoryModal({ visible, categoryCount, onSave, onClose }: Props) {
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState(CATEGORY_ICON_CHOICES[0]);
  const [color, setColor] = useState(CATEGORY_COLOR_CHOICES[0]);

  useEffect(() => {
    if (visible) {
      setLabel('');
      setIcon(CATEGORY_ICON_CHOICES[0]);
      setColor(CATEGORY_COLOR_CHOICES[0]);
    }
  }, [visible]);

  const canSave = label.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({ label: label.trim(), icon, color });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>New Category</Text>

            {categoryCount >= SOFT_CAP && (
              <Text style={styles.softCapWarning}>
                You have {categoryCount} categories already — Quick Log's grid reads best with
                fewer than {SOFT_CAP}. You can still add more if you like.
              </Text>
            )}

            <Text style={styles.fieldLabel}>NAME</Text>
            <TextInput
              style={styles.nameInput}
              value={label}
              onChangeText={setLabel}
              placeholder="e.g. Rent"
              placeholderTextColor={theme.textMuted}
              autoFocus
              maxLength={24}
            />

            <Text style={styles.fieldLabel}>ICON</Text>
            <View style={styles.choiceGrid}>
              {CATEGORY_ICON_CHOICES.map((choice) => (
                <TouchableOpacity
                  key={choice}
                  style={[styles.iconChoice, icon === choice && styles.iconChoiceSelected]}
                  onPress={() => setIcon(choice)}
                >
                  <Text style={styles.iconChoiceText}>{choice}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>COLOR</Text>
            <View style={styles.choiceGrid}>
              {CATEGORY_COLOR_CHOICES.map((choice) => (
                <TouchableOpacity
                  key={choice}
                  style={[
                    styles.colorChoice,
                    { backgroundColor: choice },
                    color === choice && styles.colorChoiceSelected,
                  ]}
                  onPress={() => setColor(choice)}
                />
              ))}
            </View>

            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Preview</Text>
              <View style={[styles.previewTile, { borderColor: color }]}>
                <Text style={styles.previewIcon}>{icon}</Text>
                <Text style={styles.previewText} numberOfLines={1}>
                  {label.trim() || 'Category'}
                </Text>
              </View>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
                disabled={!canSave}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Add Category</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    maxHeight: '80%',
  },
  title: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 12 },
  softCapWarning: {
    fontSize: 12,
    color: theme.danger,
    backgroundColor: '#FCEBEB',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  nameInput: {
    backgroundColor: theme.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.text,
    marginBottom: 14,
  },
  choiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  iconChoice: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  iconChoiceSelected: { borderColor: theme.navy, backgroundColor: theme.background },
  iconChoiceText: { fontSize: 20 },
  colorChoice: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorChoiceSelected: { borderColor: theme.text },
  previewRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  previewLabel: { fontSize: 12, color: theme.textMuted, marginRight: 10 },
  previewTile: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  previewIcon: { fontSize: 16, marginRight: 6 },
  previewText: { fontSize: 13, fontWeight: '600', color: theme.text, maxWidth: 140 },
  buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelButton: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10 },
  cancelButtonText: { color: theme.textMuted, fontWeight: '700', fontSize: 14 },
  saveButton: {
    backgroundColor: theme.navy,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  saveButtonDisabled: { backgroundColor: '#B7C2D6' },
  saveButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
