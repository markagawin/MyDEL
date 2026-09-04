import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SavingsGoal, Transaction } from '../types';
import { formatPeso } from '../currency';
import { formatFullDate, formatTimeOfDay } from '../cycleEngine';
import { computeTotalSaved, isSavingsTransaction, savingsActionOf } from '../savings';
import { AppTheme, useTheme } from '../theme';
import { webPanYOnly } from '../webInputStyle';
import AddSavingsGoalModal from './AddSavingsGoalModal';

interface Props {
  visible: boolean;
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  onAddSavingsGoal: (name: string) => string;
  onClose: () => void;
}

interface Section {
  title: string;
  data: Transaction[];
}

interface Page {
  key: string;
  label: string;
  balance: number;
  sections: Section[];
}

const GENERAL_GOAL_KEY = '__general__';
const ADD_SLOT_KEY = '__add__';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function buildSections(entries: Transaction[]): Section[] {
  const groups = new Map<string, { title: string; sortKey: number; data: Transaction[] }>();
  for (const tx of entries) {
    const date = new Date(tx.timestamp);
    const key = monthKey(tx.timestamp);
    if (!groups.has(key)) {
      groups.set(key, {
        title: `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`,
        sortKey: new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
        data: [],
      });
    }
    groups.get(key)!.data.push(tx);
  }
  return Array.from(groups.values())
    .sort((a, b) => b.sortKey - a.sortKey)
    .map((g) => ({
      title: g.title,
      data: g.data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    }));
}

function balanceOf(entries: Transaction[]): number {
  return entries.reduce((sum, t) => sum + (savingsActionOf(t) === 'withdrawal' ? -t.amount : t.amount), 0);
}

export default function SavingsSummaryModal({
  visible,
  transactions,
  savingsGoals,
  onAddSavingsGoal,
  onClose,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [addGoalModalVisible, setAddGoalModalVisible] = useState(false);
  const pendingFocusGoalIdRef = useRef<string | null>(null);

  const savingsTransactions = useMemo(
    () => transactions.filter(isSavingsTransaction),
    [transactions]
  );

  // Page 0 is everything combined (the original flat view), followed by one page per goal
  // (even ones with no entries yet, so a freshly created goal is visible right away) and a
  // trailing "General Savings" page for untagged entries. When there's only one such bucket,
  // the combined view would show exactly the same numbers as that one bucket - skip it rather
  // than show a duplicate page. A final "add new" slot always comes after the data pages.
  const pages = useMemo((): Page[] => {
    const byGoal = new Map<string, Transaction[]>();
    for (const tx of savingsTransactions) {
      const key = tx.savingsGoalId ?? GENERAL_GOAL_KEY;
      if (!byGoal.has(key)) byGoal.set(key, []);
      byGoal.get(key)!.push(tx);
    }

    const allPage: Page = {
      key: 'all',
      label: 'Total Saved',
      balance: computeTotalSaved(transactions),
      sections: buildSections(savingsTransactions),
    };

    const named = savingsGoals.map((g) => ({ key: g.id, label: g.name, entries: byGoal.get(g.id) ?? [] }));
    const general = byGoal.has(GENERAL_GOAL_KEY)
      ? [{ key: GENERAL_GOAL_KEY, label: 'General Savings', entries: byGoal.get(GENERAL_GOAL_KEY)! }]
      : [];

    const goalPages = [...named, ...general]
      .map(({ key, label, entries }) => ({
        key,
        label,
        balance: balanceOf(entries),
        sections: buildSections(entries),
      }))
      .sort((a, b) => b.balance - a.balance);

    return goalPages.length === 1 ? goalPages : [allPage, ...goalPages];
  }, [transactions, savingsGoals, savingsTransactions]);

  // The swipeable track always ends in one extra "+ Add New Savings" slot after the data pages.
  const slotCount = pages.length + 1;
  const addSlotIndex = pages.length;

  const [page, setPage] = useState(0);
  const pageIndex = Math.min(page, Math.max(0, slotCount - 1));

  const trackWidthRef = useRef(0);
  const [trackWidth, setTrackWidthState] = useState(0);
  const setTrackWidth = (width: number) => {
    trackWidthRef.current = width;
    setTrackWidthState(width);
  };
  const translateX = useRef(new Animated.Value(0)).current;
  const hasPositionedRef = useRef(false);

  // Reset to the first page whenever the modal is reopened, so it doesn't reopen on
  // whatever goal happened to be showing last time.
  useEffect(() => {
    if (visible) {
      setPage(0);
      hasPositionedRef.current = false;
    }
  }, [visible]);

  // After creating a goal from inside this modal, swipe straight to its (still empty) page
  // once it shows up in `pages`, instead of leaving the user on the "+ Add New" slot.
  useEffect(() => {
    const pendingId = pendingFocusGoalIdRef.current;
    if (!pendingId) return;
    const index = pages.findIndex((p) => p.key === pendingId);
    if (index !== -1) {
      setPage(index);
      pendingFocusGoalIdRef.current = null;
    }
  }, [pages]);

  useEffect(() => {
    if (trackWidth === 0) return;
    const toValue = -pageIndex * trackWidth;
    if (!hasPositionedRef.current) {
      hasPositionedRef.current = true;
      translateX.setValue(toValue);
      return;
    }
    Animated.timing(translateX, { toValue, duration: 260, useNativeDriver: false }).start();
  }, [pageIndex, trackWidth]);

  const settleTo = (target: number) => {
    Animated.timing(translateX, {
      toValue: -target * trackWidthRef.current,
      duration: 220,
      useNativeDriver: false,
    }).start();
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > Math.abs(gesture.dy) && Math.abs(gesture.dx) > 5,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          translateX.stopAnimation();
          translateX.setOffset(-pageIndex * trackWidthRef.current);
          translateX.setValue(0);
        },
        onPanResponderMove: Animated.event([null, { dx: translateX }], { useNativeDriver: false }),
        onPanResponderRelease: (_, gesture) => {
          translateX.flattenOffset();
          const width = trackWidthRef.current || 1;
          const passedDistance = Math.abs(gesture.dx) > width * 0.12;
          const passedVelocity = Math.abs(gesture.vx) > 0.3;
          let target = pageIndex;
          if (passedDistance || passedVelocity) {
            const direction = passedVelocity ? gesture.vx : gesture.dx;
            target = Math.max(0, Math.min(slotCount - 1, pageIndex + (direction < 0 ? 1 : -1)));
          }
          settleTo(target);
          if (target !== pageIndex) setPage(target);
        },
        onPanResponderTerminate: () => {
          translateX.flattenOffset();
          settleTo(pageIndex);
        },
      }),
    [pageIndex, slotCount]
  );

  const handleAddGoal = (name: string) => {
    const id = onAddSavingsGoal(name);
    pendingFocusGoalIdRef.current = id;
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityLabel="Close savings summary" onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Savings</Text>
          <TouchableOpacity
            accessibilityLabel="Add new savings"
            onPress={() => setAddGoalModalVisible(true)}
            style={styles.closeButton}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        <View
          style={[styles.carouselClip, webPanYOnly]}
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
          {...panResponder.panHandlers}
        >
          <Animated.View
            style={[
              styles.carouselTrack,
              { width: trackWidth * slotCount, transform: [{ translateX }] },
            ]}
          >
            {pages.map((p) => (
              <View key={p.key} style={{ width: trackWidth }}>
                <View style={styles.totalCard}>
                  <Text style={styles.totalLabel}>{p.label}</Text>
                  <Text style={styles.totalValue}>{formatPeso(p.balance)}</Text>
                </View>

                {p.sections.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>Nothing logged for this goal yet.</Text>
                  </View>
                ) : (
                  <SectionList
                    sections={p.sections}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                    renderSectionHeader={({ section }) => (
                      <Text style={styles.sectionHeader}>{section.title}</Text>
                    )}
                    renderItem={({ item }) => {
                      const isWithdrawal = savingsActionOf(item) === 'withdrawal';
                      return (
                        <View style={styles.row}>
                          <View style={styles.rowMiddle}>
                            <Text style={styles.rowLabel}>
                              {isWithdrawal ? 'Withdrawal' : 'Deposit'}
                            </Text>
                            {item.note ? <Text style={styles.rowNote}>{item.note}</Text> : null}
                            <Text style={styles.rowTime}>
                              {formatFullDate(new Date(item.timestamp))} ·{' '}
                              {formatTimeOfDay(new Date(item.timestamp))}
                            </Text>
                          </View>
                          <Text style={[styles.rowAmount, isWithdrawal && styles.rowAmountWithdrawal]}>
                            {isWithdrawal ? '− ' : '+ '}
                            {formatPeso(item.amount)}
                          </Text>
                        </View>
                      );
                    }}
                  />
                )}
              </View>
            ))}

            <View key={ADD_SLOT_KEY} style={{ width: trackWidth }}>
              <TouchableOpacity
                style={styles.addSlotCard}
                onPress={() => setAddGoalModalVisible(true)}
              >
                <Text style={styles.addSlotIcon}>+</Text>
                <Text style={styles.addSlotLabel}>Add New Savings</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>

        <View style={styles.dots}>
          {Array.from({ length: slotCount }).map((_, i) => (
            <TouchableOpacity key={i} onPress={() => setPage(i)}>
              <View
                style={[
                  styles.dot,
                  i === addSlotIndex && styles.dotAdd,
                  i === pageIndex && styles.dotActive,
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      <AddSavingsGoalModal
        visible={addGoalModalVisible}
        onSave={handleAddGoal}
        onClose={() => setAddGoalModalVisible(false)}
      />
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
    addButtonText: { fontSize: 20, color: theme.navy, fontWeight: '700' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: theme.navy },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyText: { color: theme.textMuted, fontSize: 14, textAlign: 'center' },
    carouselClip: { flex: 1, overflow: 'hidden' },
    carouselTrack: { flexDirection: 'row', flex: 1 },
    totalCard: {
      backgroundColor: theme.navy,
      borderRadius: 16,
      padding: 18,
      marginHorizontal: 20,
      marginTop: 12,
      alignItems: 'center',
    },
    totalLabel: { color: '#9FB2D6', fontSize: 12, fontWeight: '700', marginBottom: 4 },
    totalValue: { color: '#FFFFFF', fontSize: 28, fontWeight: '800' },
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
      padding: 14,
      marginBottom: 8,
    },
    rowMiddle: { flex: 1 },
    rowLabel: { fontSize: 14, fontWeight: '700', color: theme.text },
    rowNote: { fontSize: 12.5, color: theme.textMuted, marginTop: 2 },
    rowTime: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
    rowAmount: { fontSize: 15, fontWeight: '700', color: theme.text },
    rowAmountWithdrawal: { color: theme.success },
    addSlotCard: {
      flex: 1,
      marginHorizontal: 20,
      marginTop: 12,
      marginBottom: 20,
      borderRadius: 16,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    addSlotIcon: { fontSize: 28, color: theme.textMuted, fontWeight: '700' },
    addSlotLabel: { fontSize: 14, fontWeight: '700', color: theme.textMuted },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.border,
    },
    dotAdd: { borderWidth: 1, borderColor: theme.textMuted, backgroundColor: 'transparent' },
    dotActive: { backgroundColor: theme.navy, borderColor: theme.navy },
  });
