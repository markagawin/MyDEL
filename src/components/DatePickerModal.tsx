import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { sameDay, startOfDay } from '../cycleEngine';
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

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfWeekMonday(d: Date): Date {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
}

export default function DatePickerModal({ visible, value, maxDate, onChange, onClose }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => startOfMonth(value));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    if (visible) {
      setText(formatDateMask(digitsFromDate(value)));
      setCursor(startOfMonth(value));
      setSelectedDate(value);
      setError(null);
    }
  }, [visible, value]);

  const gridDays = useMemo(() => {
    const gridStart = startOfWeekMonday(startOfMonth(cursor));
    return Array.from(
      { length: 42 },
      (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)
    );
  }, [cursor]);

  const isBeyondMax = (d: Date) => !!maxDate && startOfDay(d) > startOfDay(maxDate);

  const handleTextChange = (v: string) => {
    const masked = formatDateMask(v);
    setText(masked);
    setError(null);
    const parsed = parseMaskedDate(masked);
    if (parsed) {
      setSelectedDate(parsed);
      setCursor(startOfMonth(parsed));
    }
  };

  const handleDayPress = (day: Date) => {
    if (isBeyondMax(day)) return;
    setSelectedDate(day);
    setText(formatDateMask(digitsFromDate(day)));
    setError(null);
  };

  const handleDone = () => {
    const parsed = selectedDate ?? parseMaskedDate(text);
    if (!parsed) {
      setError('Enter a valid date (MM/DD/YYYY)');
      return;
    }
    if (isBeyondMax(parsed)) {
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

  const today = useMemo(() => new Date(), [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>Entry date</Text>
          <Text style={styles.hint}>Type it, or pick from the calendar below</Text>
          <TextInput
            style={[styles.input, !!error && styles.inputError, noWebOutline]}
            value={text}
            onChangeText={handleTextChange}
            placeholder="MM/DD/YYYY"
            placeholderTextColor={theme.textMuted}
            keyboardType="number-pad"
            maxLength={10}
            onSubmitEditing={handleDone}
          />
          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.monthNav}>
            <TouchableOpacity
              accessibilityLabel="Previous month"
              style={styles.navButton}
              onPress={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
            >
              <Text style={styles.navButtonText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
            </Text>
            <TouchableOpacity
              accessibilityLabel="Next month"
              style={styles.navButton}
              onPress={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
            >
              <Text style={styles.navButtonText}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((w, i) => (
              <Text key={i} style={styles.weekdayLabel}>
                {w}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {gridDays.map((d) => {
              const inMonth = d.getMonth() === cursor.getMonth();
              const disabled = !inMonth || isBeyondMax(d);
              const isToday = sameDay(d, today);
              const isSelected = selectedDate !== null && sameDay(d, selectedDate);
              return (
                <Pressable
                  key={d.getTime()}
                  disabled={disabled}
                  onPress={() => handleDayPress(d)}
                  style={[
                    styles.cell,
                    !inMonth && styles.cellOutside,
                    isBeyondMax(d) && inMonth && styles.cellDisabled,
                    isToday && !isSelected && styles.cellToday,
                    isSelected && styles.cellSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.cellDay,
                      !inMonth && styles.cellDayOutside,
                      isToday && !isSelected && styles.cellDayToday,
                      isSelected && styles.cellDaySelected,
                    ]}
                  >
                    {d.getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

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
    monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16,
      marginBottom: 8,
      gap: 18,
    },
    navButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navButtonText: { fontSize: 16, fontWeight: '700', color: theme.navy },
    monthLabel: { fontSize: 13.5, fontWeight: '700', color: theme.text, minWidth: 130, textAlign: 'center' },
    weekdayRow: { flexDirection: 'row', marginBottom: 2 },
    weekdayLabel: {
      flex: 1,
      textAlign: 'center',
      fontSize: 10.5,
      fontWeight: '700',
      color: theme.textMuted,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      marginBottom: 2,
    },
    cellOutside: { opacity: 0.3 },
    cellDisabled: { opacity: 0.3 },
    cellToday: { borderWidth: 1.5, borderColor: theme.navy },
    cellSelected: { backgroundColor: theme.navy },
    cellDay: { fontSize: 13, fontWeight: '600', color: theme.text },
    cellDayOutside: { color: theme.textMuted },
    cellDayToday: { color: theme.navy, fontWeight: '700' },
    cellDaySelected: { color: '#FFFFFF', fontWeight: '700' },
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
