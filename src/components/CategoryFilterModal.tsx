import React, { useMemo } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CategoryMeta } from '../categories';
import { AppTheme, useTheme } from '../theme';

interface Props {
  visible: boolean;
  categories: CategoryMeta[];
  selectedKeys: Set<string>;
  onChange: (keys: Set<string>) => void;
  onClose: () => void;
}

export default function CategoryFilterModal({
  visible,
  categories,
  selectedKeys,
  onChange,
  onClose,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const allSelected = selectedKeys.size === 0;

  const toggle = (key: string) => {
    const next = new Set(selectedKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onChange(next);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>Filter by Category</Text>
          <Pressable
            style={[styles.row, allSelected && styles.rowActive]}
            onPress={() => onChange(new Set())}
          >
            <Text style={[styles.rowLabel, allSelected && styles.rowLabelActive]}>
              All Categories
            </Text>
            <View style={[styles.checkbox, allSelected && styles.checkboxSelected]}>
              {allSelected && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
          </Pressable>
          <FlatList
            data={categories}
            keyExtractor={(item) => item.key}
            style={{ maxHeight: 320 }}
            renderItem={({ item }) => {
              const active = selectedKeys.has(item.key);
              return (
                <Pressable
                  style={[styles.row, active && styles.rowActive]}
                  onPress={() => toggle(item.key)}
                >
                  <View style={styles.rowLeft}>
                    <View style={[styles.badge, { backgroundColor: item.color }]}>
                      <Text style={styles.badgeIcon}>{item.icon}</Text>
                    </View>
                    <Text style={[styles.rowLabel, active && styles.rowLabelActive]}>
                      {item.label}
                    </Text>
                  </View>
                  <View style={[styles.checkbox, active && styles.checkboxSelected]}>
                    {active && <Text style={styles.checkboxMark}>✓</Text>}
                  </View>
                </Pressable>
              );
            }}
          />
          <TouchableOpacity style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
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
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  rowActive: { backgroundColor: theme.background },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  badgeIcon: { fontSize: 14 },
  rowLabel: { fontSize: 15, color: theme.text, fontWeight: '500' },
  rowLabelActive: { color: theme.navy, fontWeight: '700' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: { backgroundColor: theme.navy, borderColor: theme.navy },
  checkboxMark: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  doneButton: {
    marginTop: 12,
    backgroundColor: theme.navy,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  doneButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
