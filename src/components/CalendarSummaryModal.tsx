import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Transaction } from '../types';
import { CategoryMeta, UNKNOWN_CATEGORY } from '../categories';
import { formatPeso, formatPesoCompact } from '../currency';
import { formatFullDate, formatTimeOfDay, toIsoDateOnly } from '../cycleEngine';
import { AppTheme, useTheme } from '../theme';

interface Props {
  visible: boolean;
  transactions: Transaction[];
  categoryMap: Record<string, CategoryMeta>;
  onClose: () => void;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function startOfWeekMonday(d: Date): Date {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
}

export default function CalendarSummaryModal({ visible, transactions, categoryMap, onClose }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const today = useMemo(() => new Date(), [visible]);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const totalsByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of transactions) {
      const key = toIsoDateOnly(new Date(tx.timestamp));
      map.set(key, (map.get(key) ?? 0) + tx.amount);
    }
    return map;
  }, [transactions]);

  const gridDays = useMemo(() => {
    const gridStart = startOfWeekMonday(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
    return Array.from(
      { length: 42 },
      (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)
    );
  }, [cursor]);

  const monthTotal = useMemo(() => {
    let sum = 0;
    for (const d of gridDays) {
      if (d.getMonth() !== cursor.getMonth() || d.getFullYear() !== cursor.getFullYear()) continue;
      sum += totalsByDay.get(toIsoDateOnly(d)) ?? 0;
    }
    return sum;
  }, [gridDays, totalsByDay, cursor]);

  const goToPrevMonth = () => {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
    setSelectedDate(null);
  };
  const goToNextMonth = () => {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
    setSelectedDate(null);
  };
  const goToToday = () => {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(null);
  };

  const isToday = (d: Date) => sameDay(d, today);

  const selectedDayTransactions = useMemo(() => {
    if (!selectedDate) return [];
    return transactions
      .filter((t) => sameDay(new Date(t.timestamp), selectedDate))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [transactions, selectedDate]);

  const selectedDayTotal = useMemo(
    () => selectedDayTransactions.reduce((sum, t) => sum + t.amount, 0),
    [selectedDayTransactions]
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityLabel="Close calendar" onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Calendar</Text>
          <TouchableOpacity accessibilityLabel="Jump to today" onPress={goToToday} style={styles.todayButton}>
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.monthNav}>
          <TouchableOpacity accessibilityLabel="Previous month" onPress={goToPrevMonth} style={styles.navButton}>
            <Text style={styles.navButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>
            {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
          </Text>
          <TouchableOpacity accessibilityLabel="Next month" onPress={goToNextMonth} style={styles.navButton}>
            <Text style={styles.navButtonText}>›</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((w) => (
              <Text key={w} style={styles.weekdayLabel}>
                {w}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {gridDays.map((d) => {
              const inMonth = d.getMonth() === cursor.getMonth();
              const amount = totalsByDay.get(toIsoDateOnly(d)) ?? 0;
              const todayCell = isToday(d);
              const selectedCell = selectedDate !== null && sameDay(d, selectedDate);
              return (
                <Pressable
                  key={d.getTime()}
                  disabled={!inMonth}
                  onPress={() => setSelectedDate((prev) => (prev && sameDay(prev, d) ? null : d))}
                  style={[
                    styles.cell,
                    !inMonth && styles.cellOutside,
                    todayCell && styles.cellToday,
                    selectedCell && styles.cellSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.cellDay,
                      !inMonth && styles.cellDayOutside,
                      todayCell && styles.cellDayToday,
                    ]}
                  >
                    {d.getDate()}
                  </Text>
                  {inMonth && amount > 0 && (
                    <Text
                      style={[styles.cellAmount, todayCell && styles.cellAmountToday]}
                      numberOfLines={1}
                    >
                      {formatPesoCompact(amount)}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          {selectedDate && (
            <View style={styles.dayDetailCard}>
              <View style={styles.dayDetailHeader}>
                <Text style={styles.dayDetailTitle}>{formatFullDate(selectedDate)}</Text>
                <TouchableOpacity
                  accessibilityLabel="Close day breakdown"
                  onPress={() => setSelectedDate(null)}
                  style={styles.dayDetailCloseButton}
                >
                  <Text style={styles.dayDetailCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {selectedDayTransactions.length === 0 ? (
                <Text style={styles.dayDetailEmpty}>No spending logged on this day.</Text>
              ) : (
                selectedDayTransactions.map((tx) => {
                  const meta = categoryMap[tx.category] ?? UNKNOWN_CATEGORY;
                  return (
                    <View key={tx.id} style={styles.dayDetailRow}>
                      <View style={[styles.dayDetailBadge, { backgroundColor: meta.color }]}>
                        <Text style={styles.dayDetailBadgeIcon}>{meta.icon}</Text>
                      </View>
                      <View style={styles.dayDetailMiddle}>
                        <Text style={styles.dayDetailCategory}>{meta.label}</Text>
                        {tx.note ? (
                          <Text style={styles.dayDetailNote} numberOfLines={1}>
                            {tx.note}
                          </Text>
                        ) : null}
                        <Text style={styles.dayDetailTime}>
                          {formatTimeOfDay(new Date(tx.timestamp))}
                        </Text>
                      </View>
                      <Text style={styles.dayDetailAmount}>{formatPeso(tx.amount)}</Text>
                    </View>
                  );
                })
              )}

              {selectedDayTransactions.length > 0 && (
                <View style={styles.dayDetailTotalRow}>
                  <Text style={styles.dayDetailTotalLabel}>Total for this day</Text>
                  <Text style={styles.dayDetailTotalValue}>{formatPeso(selectedDayTotal)}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>
              Total spent — {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
            </Text>
            <Text style={styles.summaryValue}>{formatPeso(monthTotal)}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 4,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeButtonText: { fontSize: 16, color: theme.textMuted, fontWeight: '700' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: theme.navy },
    todayButton: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: theme.surfaceMuted,
    },
    todayButtonText: { fontSize: 12.5, fontWeight: '700', color: theme.navy },
    monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      gap: 20,
    },
    navButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navButtonText: { fontSize: 18, fontWeight: '700', color: theme.navy },
    monthLabel: { fontSize: 16, fontWeight: '800', color: theme.text, minWidth: 160, textAlign: 'center' },
    body: { flex: 1 },
    bodyContent: { paddingHorizontal: 16, paddingBottom: 20 },
    weekdayRow: { flexDirection: 'row', marginBottom: 6 },
    weekdayLabel: {
      flex: 1,
      textAlign: 'center',
      fontSize: 11.5,
      fontWeight: '700',
      color: theme.textMuted,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: {
      width: `${100 / 7}%`,
      aspectRatio: 0.85,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 4,
      borderRadius: 10,
      marginBottom: 2,
    },
    cellOutside: { opacity: 0.4 },
    cellToday: { backgroundColor: theme.navy },
    cellSelected: { borderWidth: 2, borderColor: theme.navy },
    cellDay: { fontSize: 13.5, fontWeight: '700', color: theme.text },
    cellDayOutside: { color: theme.textMuted },
    cellDayToday: { color: '#FFFFFF' },
    cellAmount: { fontSize: 9.5, fontWeight: '700', color: theme.danger, marginTop: 2 },
    cellAmountToday: { color: '#FFFFFF' },
    dayDetailCard: {
      backgroundColor: theme.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      marginTop: 16,
    },
    dayDetailHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    dayDetailTitle: { fontSize: 14.5, fontWeight: '800', color: theme.navy },
    dayDetailCloseButton: { padding: 4 },
    dayDetailCloseText: { fontSize: 14, color: theme.textMuted, fontWeight: '700' },
    dayDetailEmpty: { fontSize: 13, color: theme.textMuted },
    dayDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    dayDetailBadge: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    dayDetailBadgeIcon: { fontSize: 16 },
    dayDetailMiddle: { flex: 1 },
    dayDetailCategory: { fontSize: 13.5, fontWeight: '700', color: theme.text },
    dayDetailNote: { fontSize: 12, color: theme.textMuted, marginTop: 1 },
    dayDetailTime: { fontSize: 11, color: theme.textMuted, marginTop: 1 },
    dayDetailAmount: { fontSize: 14, fontWeight: '700', color: theme.text },
    dayDetailTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 10,
      marginTop: 4,
      borderTopWidth: 1.5,
      borderTopColor: theme.border,
    },
    dayDetailTotalLabel: { fontSize: 12.5, fontWeight: '700', color: theme.textMuted },
    dayDetailTotalValue: { fontSize: 15, fontWeight: '800', color: theme.navy },
    summaryCard: {
      backgroundColor: theme.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      marginTop: 16,
      alignItems: 'center',
    },
    summaryLabel: { fontSize: 12.5, color: theme.textMuted, marginBottom: 4 },
    summaryValue: { fontSize: 22, fontWeight: '800', color: theme.text },
  });
