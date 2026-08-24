import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatFullDate, startOfDay } from '../cycleEngine';
import { AppTheme, useTheme } from '../theme';
import DatePickerModal from './DatePickerModal';

interface Props {
  start: Date;
  end: Date;
  onChange: (start: Date, end: Date) => void;
}

export default function CustomRangeBar({ start, end, onChange }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [editing, setEditing] = useState<'start' | 'end' | null>(null);

  const handlePick = (day: Date) => {
    const picked = startOfDay(day);
    if (editing === 'start') {
      onChange(picked, end);
    } else {
      onChange(start, picked);
    }
    setEditing(null);
  };

  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.dateButton} onPress={() => setEditing('start')}>
        <Text style={styles.dateLabel}>FROM</Text>
        <Text style={styles.dateValue}>{formatFullDate(start)}</Text>
      </TouchableOpacity>
      <Text style={styles.arrow}>→</Text>
      <TouchableOpacity style={styles.dateButton} onPress={() => setEditing('end')}>
        <Text style={styles.dateLabel}>TO</Text>
        <Text style={styles.dateValue}>{formatFullDate(end)}</Text>
      </TouchableOpacity>

      <DatePickerModal
        visible={editing !== null}
        value={editing === 'start' ? start : end}
        onChange={handlePick}
        onClose={() => setEditing(null)}
      />
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
});
