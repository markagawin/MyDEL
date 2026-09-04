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

interface Props {
  visible: boolean;
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
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

export default function SavingsSummaryModal({ visible, transactions, savingsGoals, onClose }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const savingsTransactions = useMemo(
    () => transactions.filter(isSavingsTransaction),
    [transactions]
  );

  // Page 0 is everything combined (the original flat view). Swiping past it reaches one page
  // per goal that has entries, plus a trailing "General Savings" page for untagged ones.
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

    const named = savingsGoals
      .filter((g) => byGoal.has(g.id))
      .map((g) => ({ key: g.id, label: g.name, entries: byGoal.get(g.id)! }));
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

    return [allPage, ...goalPages];
  }, [transactions, savingsGoals, savingsTransactions]);

  const [page, setPage] = useState(0);
  const pageIndex = Math.min(page, Math.max(0, pages.length - 1));

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
            target = Math.max(0, Math.min(pages.length - 1, pageIndex + (direction < 0 ? 1 : -1)));
          }
          settleTo(target);
          if (target !== pageIndex) setPage(target);
        },
        onPanResponderTerminate: () => {
          translateX.flattenOffset();
          settleTo(pageIndex);
        },
      }),
    [pageIndex, pages.length]
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityLabel="Close savings summary" onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Savings</Text>
          <View style={styles.closeButton} />
        </View>

        {pages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No savings deposits or withdrawals logged yet.</Text>
          </View>
        ) : (
          <>
            <View
              style={[styles.carouselClip, webPanYOnly]}
              onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
              {...panResponder.panHandlers}
            >
              <Animated.View
                style={[
                  styles.carouselTrack,
                  { width: trackWidth * pages.length, transform: [{ translateX }] },
                ]}
              >
                {pages.map((p) => (
                  <View key={p.key} style={{ width: trackWidth }}>
                    <View style={styles.totalCard}>
                      <Text style={styles.totalLabel}>{p.label}</Text>
                      <Text style={styles.totalValue}>{formatPeso(p.balance)}</Text>
                    </View>

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
                  </View>
                ))}
              </Animated.View>
            </View>

            {pages.length > 1 && (
              <View style={styles.dots}>
                {pages.map((p, i) => (
                  <TouchableOpacity key={p.key} onPress={() => setPage(i)}>
                    <View style={[styles.dot, i === pageIndex && styles.dotActive]} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
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
    dotActive: { backgroundColor: theme.navy },
  });
