import React, { useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppData } from '../AppDataContext';
import { UNKNOWN_CATEGORY } from '../categories';
import { formatPeso } from '../currency';
import { endOfDay, formatFullDate, formatTimeOfDay, startOfDay } from '../cycleEngine';
import { getAvailableCycles } from '../cycleList';
import { Transaction } from '../types';
import { AppTheme, useTheme } from '../theme';
import CyclePickerModal from '../components/CyclePickerModal';
import CustomRangeBar from '../components/CustomRangeBar';
import ViewModeToggle, { ViewMode } from '../components/ViewModeToggle';
import ConfirmModal from '../components/ConfirmModal';

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function HistoryScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { transactions, currentCycleIdentifier, currentCycleRange, categoryMap, deleteTransaction } =
    useAppData();
  const [selectedCycle, setSelectedCycle] = useState<string>(currentCycleIdentifier);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('cycle');
  const [customStart, setCustomStart] = useState<Date>(currentCycleRange.start);
  const [customEnd, setCustomEnd] = useState<Date>(new Date());

  const cycleOptions = useMemo(
    () => getAvailableCycles(transactions, currentCycleRange),
    [transactions, currentCycleRange]
  );

  const activeOption = cycleOptions.find((o) => o.identifier === selectedCycle) ?? cycleOptions[0];
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);

  const sections = useMemo(() => {
    const filtered =
      viewMode === 'cycle'
        ? transactions.filter((t) => t.cycleIdentifier === selectedCycle)
        : transactions.filter((t) => {
            const time = new Date(t.timestamp).getTime();
            return (
              time >= startOfDay(customStart).getTime() && time <= endOfDay(customEnd).getTime()
            );
          });
    const groups = new Map<string, { title: string; sortKey: number; data: Transaction[] }>();
    for (const tx of filtered) {
      const date = new Date(tx.timestamp);
      const key = dayKey(tx.timestamp);
      if (!groups.has(key)) {
        groups.set(key, { title: formatFullDate(date), sortKey: date.getTime(), data: [] });
      }
      groups.get(key)!.data.push(tx);
    }
    return Array.from(groups.values())
      .sort((a, b) => b.sortKey - a.sortKey)
      .map((g) => ({
        title: g.title,
        data: g.data.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ),
      }));
  }, [transactions, selectedCycle, viewMode, customStart, customEnd]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>History</Text>
        <ViewModeToggle mode={viewMode} onChange={setViewMode} />
        {viewMode === 'cycle' ? (
          <TouchableOpacity style={styles.filterButton} onPress={() => setPickerVisible(true)}>
            <Text style={styles.filterText}>{activeOption?.label ?? 'Select period'}</Text>
            <Text style={styles.filterChevron}>▾</Text>
          </TouchableOpacity>
        ) : (
          <CustomRangeBar
            start={customStart}
            end={customEnd}
            onChange={(s, e) => {
              setCustomStart(s);
              setCustomEnd(e);
            }}
          />
        )}
      </View>

      {sections.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No transactions logged in this range yet.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => {
            const meta = categoryMap[item.category] ?? UNKNOWN_CATEGORY;
            return (
              <Swipeable
                renderRightActions={() => (
                  <TouchableOpacity
                    style={styles.deleteAction}
                    onPress={() => deleteTransaction(item.id)}
                  >
                    <Text style={styles.deleteActionText}>Delete</Text>
                  </TouchableOpacity>
                )}
              >
                <View style={styles.row}>
                  <View style={[styles.badge, { backgroundColor: meta.color }]}>
                    <Text style={styles.badgeIcon}>{meta.icon}</Text>
                  </View>
                  <View style={styles.rowMiddle}>
                    <Text style={styles.rowCategory}>{meta.label}</Text>
                    {item.note ? <Text style={styles.rowNote}>{item.note}</Text> : null}
                    <Text style={styles.rowTime}>{formatTimeOfDay(new Date(item.timestamp))}</Text>
                  </View>
                  <Text style={styles.rowAmount}>{formatPeso(item.amount)}</Text>
                  <TouchableOpacity
                    accessibilityLabel="Delete entry"
                    style={styles.rowDeleteButton}
                    onPress={() => setPendingDelete(item)}
                  >
                    <Text style={styles.rowDeleteIcon}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </Swipeable>
            );
          }}
        />
      )}

      <CyclePickerModal
        visible={pickerVisible}
        options={cycleOptions}
        selectedIdentifier={selectedCycle}
        onSelect={setSelectedCycle}
        onClose={() => setPickerVisible(false)}
      />

      <ConfirmModal
        visible={pendingDelete !== null}
        title="Delete entry?"
        message={
          pendingDelete
            ? `${(categoryMap[pendingDelete.category] ?? UNKNOWN_CATEGORY).label} — ${formatPeso(pendingDelete.amount)}`
            : undefined
        }
        confirmLabel="Delete"
        onConfirm={() => {
          if (pendingDelete) deleteTransaction(pendingDelete.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: theme.navy, marginBottom: 10 },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterText: { fontSize: 13, fontWeight: '600', color: theme.text, marginRight: 6 },
  filterChevron: { fontSize: 12, color: theme.textMuted },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { color: theme.textMuted, fontSize: 14, textAlign: 'center' },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textMuted,
    marginTop: 14,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    marginBottom: 8,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  badgeIcon: { fontSize: 18 },
  rowMiddle: { flex: 1 },
  rowCategory: { fontSize: 14, fontWeight: '700', color: theme.text },
  rowNote: { fontSize: 12.5, color: theme.textMuted, marginTop: 2 },
  rowTime: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  rowAmount: { fontSize: 15, fontWeight: '700', color: theme.text },
  rowDeleteButton: {
    marginLeft: 10,
    padding: 6,
  },
  rowDeleteIcon: { fontSize: 16 },
  deleteAction: {
    backgroundColor: theme.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 84,
    borderRadius: 14,
    marginBottom: 8,
    marginLeft: 8,
  },
  deleteActionText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
});
