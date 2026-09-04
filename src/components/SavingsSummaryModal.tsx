import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
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
import AddSavingsGoalModal from './AddSavingsGoalModal';
import ConfirmModal from './ConfirmModal';

interface Props {
  visible: boolean;
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  onAddSavingsGoal: (name: string) => string;
  onRemoveSavingsGoal: (id: string) => void;
  onClose: () => void;
}

interface Section {
  title: string;
  data: Transaction[];
}

interface Account {
  key: string;
  label: string;
  balance: number;
  sections: Section[];
  entryCount: number;
  isGoal: boolean;
}

const ALL_KEY = 'all';
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

export default function SavingsSummaryModal({
  visible,
  transactions,
  savingsGoals,
  onAddSavingsGoal,
  onRemoveSavingsGoal,
  onClose,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [addGoalModalVisible, setAddGoalModalVisible] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>(ALL_KEY);
  const [pendingRemoveGoal, setPendingRemoveGoal] = useState<SavingsGoal | null>(null);

  const savingsTransactions = useMemo(
    () => transactions.filter(isSavingsTransaction),
    [transactions]
  );

  const totalSaved = useMemo(() => computeTotalSaved(transactions), [transactions]);

  // "All" is the original flat view (everything combined), followed by one account per goal
  // (even ones with no entries yet, so a freshly created goal is pickable right away) and a
  // trailing "General Savings" account for untagged entries. A transaction whose goal was since
  // deleted falls back into General too, rather than vanishing from every account.
  const accounts = useMemo((): Account[] => {
    const validGoalIds = new Set(savingsGoals.map((g) => g.id));
    const byGoal = new Map<string, Transaction[]>();
    for (const tx of savingsTransactions) {
      const key = tx.savingsGoalId && validGoalIds.has(tx.savingsGoalId) ? tx.savingsGoalId : GENERAL_GOAL_KEY;
      if (!byGoal.has(key)) byGoal.set(key, []);
      byGoal.get(key)!.push(tx);
    }

    const allAccount: Account = {
      key: ALL_KEY,
      label: 'All',
      balance: totalSaved,
      sections: buildSections(savingsTransactions),
      entryCount: savingsTransactions.length,
      isGoal: false,
    };

    const named = savingsGoals.map((g) => ({
      key: g.id,
      label: g.name,
      entries: byGoal.get(g.id) ?? [],
      isGoal: true,
    }));
    const general = byGoal.has(GENERAL_GOAL_KEY)
      ? [{ key: GENERAL_GOAL_KEY, label: 'General Savings', entries: byGoal.get(GENERAL_GOAL_KEY)!, isGoal: false }]
      : [];

    const goalAccounts = [...named, ...general].map(({ key, label, entries, isGoal }) => ({
      key,
      label,
      balance: balanceOf(entries),
      sections: buildSections(entries),
      entryCount: entries.length,
      isGoal,
    }));

    return [allAccount, ...goalAccounts];
  }, [totalSaved, savingsGoals, savingsTransactions]);

  const selected = accounts.find((a) => a.key === selectedKey) ?? accounts[0];

  // Reset to "All" whenever the modal is reopened, so it doesn't reopen on whatever
  // account happened to be picked last time.
  useEffect(() => {
    if (visible) setSelectedKey(ALL_KEY);
  }, [visible]);

  const handleAddGoal = (name: string) => {
    const id = onAddSavingsGoal(name);
    setSelectedKey(id);
  };

  const handleConfirmRemove = () => {
    if (!pendingRemoveGoal) return;
    onRemoveSavingsGoal(pendingRemoveGoal.id);
    if (selectedKey === pendingRemoveGoal.id) setSelectedKey(ALL_KEY);
    setPendingRemoveGoal(null);
  };

  const pendingRemoveCount = pendingRemoveGoal
    ? accounts.find((a) => a.key === pendingRemoveGoal.id)?.entryCount ?? 0
    : 0;

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

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Saved</Text>
          <Text style={styles.totalValue}>{formatPeso(totalSaved)}</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.accountScroll}
          contentContainerStyle={styles.accountRow}
        >
          {accounts.map((a) => {
            const isSelected = a.key === selected.key;
            return (
              <TouchableOpacity
                key={a.key}
                style={[
                  styles.accountBox,
                  a.isGoal && styles.accountBoxWithRemove,
                  isSelected && styles.accountBoxSelected,
                ]}
                onPress={() => setSelectedKey(a.key)}
              >
                {a.isGoal && (
                  <TouchableOpacity
                    accessibilityLabel={`Remove ${a.label}`}
                    style={styles.accountRemoveButton}
                    onPress={() => setPendingRemoveGoal({ id: a.key, name: a.label })}
                  >
                    <Text style={styles.accountRemoveIcon}>🗑️</Text>
                  </TouchableOpacity>
                )}
                <Text style={[styles.accountLabel, isSelected && styles.accountLabelSelected]}>
                  {a.label}
                </Text>
                <Text style={[styles.accountBalance, isSelected && styles.accountLabelSelected]}>
                  {formatPeso(a.balance)}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={[styles.accountBox, styles.addBox]}
            onPress={() => setAddGoalModalVisible(true)}
          >
            <Text style={styles.addBoxIcon}>+</Text>
            <Text style={styles.addBoxLabel}>Add New</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.listArea}>
          {selected.sections.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {selected.key === ALL_KEY
                  ? 'No savings deposits or withdrawals logged yet.'
                  : 'Nothing logged for this account yet.'}
              </Text>
            </View>
          ) : (
            <SectionList
              sections={selected.sections}
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
                      <Text style={styles.rowLabel}>{isWithdrawal ? 'Withdrawal' : 'Deposit'}</Text>
                      {item.note ? <Text style={styles.rowNote}>{item.note}</Text> : null}
                      <Text style={styles.rowTime}>
                        {formatFullDate(new Date(item.timestamp))} · {formatTimeOfDay(new Date(item.timestamp))}
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
      </SafeAreaView>

      <AddSavingsGoalModal
        visible={addGoalModalVisible}
        onSave={handleAddGoal}
        onClose={() => setAddGoalModalVisible(false)}
      />

      <ConfirmModal
        visible={pendingRemoveGoal !== null}
        title="Remove savings goal?"
        message={
          pendingRemoveGoal
            ? pendingRemoveCount > 0
              ? `"${pendingRemoveGoal.name}" has ${pendingRemoveCount} entr${pendingRemoveCount === 1 ? 'y' : 'ies'} logged. They'll show under General Savings if you remove it.`
              : `Remove "${pendingRemoveGoal.name}"?`
            : undefined
        }
        confirmLabel="Remove"
        onConfirm={handleConfirmRemove}
        onCancel={() => setPendingRemoveGoal(null)}
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
    // ScrollView defaults to flexGrow: 1 on web, which would let this single row of boxes
    // stretch to fill whatever space the list below doesn't need (most visible when that
    // list is short or empty). Pin it to its own content height instead - `listArea` below
    // is the one that should actually grow to fill the rest of the modal.
    accountScroll: { flexGrow: 0, flexShrink: 0 },
    accountRow: {
      paddingHorizontal: 20,
      paddingVertical: 14,
      gap: 10,
    },
    accountBox: {
      position: 'relative',
      minWidth: 96,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.card,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginRight: 10,
    },
    accountBoxWithRemove: { paddingRight: 26 },
    accountBoxSelected: { backgroundColor: theme.navy, borderColor: theme.navy },
    accountLabel: { fontSize: 12.5, fontWeight: '700', color: theme.text },
    accountLabelSelected: { color: '#FFFFFF' },
    accountBalance: { fontSize: 13.5, fontWeight: '800', color: theme.text, marginTop: 3 },
    accountRemoveButton: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    accountRemoveIcon: { fontSize: 11 },
    addBox: {
      borderStyle: 'dashed',
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addBoxIcon: { fontSize: 18, color: theme.textMuted, fontWeight: '700' },
    addBoxLabel: { fontSize: 11.5, fontWeight: '700', color: theme.textMuted, marginTop: 2 },
    listArea: { flex: 1 },
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
      padding: 14,
      marginBottom: 8,
    },
    rowMiddle: { flex: 1 },
    rowLabel: { fontSize: 14, fontWeight: '700', color: theme.text },
    rowNote: { fontSize: 12.5, color: theme.textMuted, marginTop: 2 },
    rowTime: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
    rowAmount: { fontSize: 15, fontWeight: '700', color: theme.text },
    rowAmountWithdrawal: { color: theme.success },
  });
