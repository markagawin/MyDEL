import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppTheme, useTheme } from '../theme';

export type ViewMode = 'cycle' | 'custom';

interface Props {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export default function ViewModeToggle({ mode, onChange }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={[styles.button, mode === 'cycle' && styles.buttonActive]}
        onPress={() => onChange('cycle')}
      >
        <Text style={[styles.text, mode === 'cycle' && styles.textActive]}>By Period</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, mode === 'custom' && styles.buttonActive]}
        onPress={() => onChange('custom')}
      >
        <Text style={[styles.text, mode === 'custom' && styles.textActive]}>Custom Range</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: theme.background,
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9,
  },
  buttonActive: {
    backgroundColor: theme.card,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  text: { fontSize: 12.5, fontWeight: '600', color: theme.textMuted },
  textActive: { color: theme.navy },
});
