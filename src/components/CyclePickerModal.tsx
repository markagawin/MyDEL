import React, { useMemo } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CycleOption } from '../cycleList';
import { AppTheme, useTheme } from '../theme';

interface Props {
  visible: boolean;
  options: CycleOption[];
  selectedIdentifier: string;
  onSelect: (identifier: string) => void;
  onClose: () => void;
}

export default function CyclePickerModal({
  visible,
  options,
  selectedIdentifier,
  onSelect,
  onClose,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>Select Period</Text>
          <FlatList
            data={options}
            keyExtractor={(item) => item.identifier}
            style={{ maxHeight: 360 }}
            renderItem={({ item }) => {
              const active = item.identifier === selectedIdentifier;
              return (
                <Pressable
                  style={[styles.row, active && styles.rowActive]}
                  onPress={() => {
                    onSelect(item.identifier);
                    onClose();
                  }}
                >
                  <Text style={[styles.rowLabel, active && styles.rowLabelActive]}>
                    {item.label}
                  </Text>
                  {item.isCurrent && <Text style={styles.currentTag}>Current</Text>}
                </Pressable>
              );
            }}
          />
        </Pressable>
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
  sheet: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
  },
  title: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  rowActive: { backgroundColor: theme.background },
  rowLabel: { fontSize: 15, color: theme.text, fontWeight: '500' },
  rowLabelActive: { color: theme.navy, fontWeight: '700' },
  currentTag: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.success,
    backgroundColor: theme.successSurface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
