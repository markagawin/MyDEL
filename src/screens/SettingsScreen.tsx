import React, { useMemo, useState } from 'react';
import {
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppData } from '../AppDataContext';
import { BUILT_IN_CATEGORY_KEYS, CategoryMeta, UNKNOWN_CATEGORY } from '../categories';
import { CycleMode, RecurringEntry } from '../types';
import { formatFullDate, parseIsoDateOnly, toIsoDateOnly } from '../cycleEngine';
import { formatPeso } from '../currency';
import { digitsFromDate, formatDateMask, parseMaskedDate } from '../dateInputMask';
import CustomRangeBar from '../components/CustomRangeBar';
import AddCategoryModal from '../components/AddCategoryModal';
import AddRecurringEntryModal from '../components/AddRecurringEntryModal';
import ImportBackupModal from '../components/ImportBackupModal';
import ConfirmModal from '../components/ConfirmModal';
import { AppTheme, ThemePreference, useTheme, useThemePreference } from '../theme';
import { noWebOutline } from '../webInputStyle';

const APPEARANCE_OPTIONS: { pref: ThemePreference; title: string }[] = [
  { pref: 'system', title: 'System' },
  { pref: 'light', title: 'Light' },
  { pref: 'dark', title: 'Dark' },
];

const MODE_OPTIONS: { mode: CycleMode; title: string; description: string }[] = [
  {
    mode: 'monthly',
    title: 'Standard Monthly',
    description: 'Resets on the 1st of every month (e.g., Aug 1 – Aug 31).',
  },
  {
    mode: 'semiA',
    title: 'Semi-Monthly (15th / 30th)',
    description: 'Period 1: 1st–15th. Period 2: 16th–end of month.',
  },
  {
    mode: 'semiB',
    title: 'Semi-Monthly (10th / 25th)',
    description: 'Period 1: 10th–24th. Period 2: 25th–9th of next month.',
  },
  {
    mode: 'custom',
    title: 'Custom Fixed Date',
    description: 'Pick an exact date; its day-of-month becomes your recurring reset baseline.',
  },
  {
    mode: 'customRange',
    title: 'Custom Date Range',
    description: 'Pick an exact start and end date (e.g., Aug 24 – Sep 10); that same length repeats going forward.',
  },
];

function clampDay(day: number): number {
  return Math.min(28, Math.max(1, day));
}

function ordinal(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}

function rangeLengthDays(settings: { customRangeStart: string; customRangeEnd: string }): number {
  const start = parseIsoDateOnly(settings.customRangeStart);
  const end = parseIsoDateOnly(settings.customRangeEnd);
  const diff = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return Math.max(1, Math.abs(diff) + 1);
}

function earlierOf(settings: { customRangeStart: string; customRangeEnd: string }): Date {
  const start = parseIsoDateOnly(settings.customRangeStart);
  const end = parseIsoDateOnly(settings.customRangeEnd);
  return start <= end ? start : end;
}

export default function SettingsScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { preference, setPreference } = useThemePreference();
  const {
    settings,
    updateSettings,
    transactions,
    categories,
    categoryMap,
    addCategory,
    removeCategory,
    recurringEntries,
    addRecurringEntry,
    removeRecurringEntry,
    exportBackup,
    restoreFromBackup,
  } = useAppData();
  const [customDateText, setCustomDateText] = useState(() =>
    formatDateMask(digitsFromDate(parseIsoDateOnly(settings.customAnchorDate)))
  );
  const [dateError, setDateError] = useState(false);
  const [addCategoryVisible, setAddCategoryVisible] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<CategoryMeta | null>(null);
  const [addRecurringVisible, setAddRecurringVisible] = useState(false);
  const [pendingRemoveRecurring, setPendingRemoveRecurring] = useState<RecurringEntry | null>(null);
  const [importVisible, setImportVisible] = useState(false);

  const usageCountByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tx of transactions) {
      counts.set(tx.category, (counts.get(tx.category) ?? 0) + 1);
    }
    return counts;
  }, [transactions]);

  const pendingRemoveCount = pendingRemove ? usageCountByCategory.get(pendingRemove.key) ?? 0 : 0;

  const handleSelectMode = (mode: CycleMode) => {
    updateSettings({ ...settings, mode });
  };

  const handleExport = async () => {
    const data = exportBackup();
    const json = JSON.stringify(data, null, 2);
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mydel-backup-${data.exportedAt.slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } else {
      await Share.share({ message: json, title: 'MyDEL Backup' });
    }
  };

  const handleCustomDateChange = (value: string) => {
    setCustomDateText(formatDateMask(value));
    setDateError(false);
  };

  const commitCustomDate = () => {
    const parsed = parseMaskedDate(customDateText);
    if (!parsed) {
      setDateError(true);
      return;
    }
    updateSettings({
      ...settings,
      mode: 'custom',
      customDay: clampDay(parsed.getDate()),
      customAnchorDate: toIsoDateOnly(parsed),
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text style={styles.title}>Appearance</Text>
        <Text style={styles.subtitle}>Choose how MyDEL looks, or follow your system setting.</Text>
        <View style={styles.appearanceRow}>
          {APPEARANCE_OPTIONS.map((opt) => {
            const active = preference === opt.pref;
            return (
              <TouchableOpacity
                key={opt.pref}
                style={[styles.appearanceOption, active && styles.appearanceOptionActive]}
                onPress={() => setPreference(opt.pref)}
              >
                <Text
                  style={[
                    styles.appearanceOptionText,
                    active && styles.appearanceOptionTextActive,
                  ]}
                >
                  {opt.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.title, styles.sectionSpacing]}>Payday Cycle</Text>
        <Text style={styles.subtitle}>
          Choose how MyDEL should calculate your active period and balance resets.
        </Text>

        {MODE_OPTIONS.map((opt) => {
          const active = settings.mode === opt.mode;
          return (
            <TouchableOpacity
              key={opt.mode}
              style={[styles.optionCard, active && styles.optionCardActive]}
              onPress={() => handleSelectMode(opt.mode)}
            >
              <View style={styles.optionHeader}>
                <View style={[styles.radio, active && styles.radioActive]} />
                <Text style={styles.optionTitle}>{opt.title}</Text>
              </View>
              <Text style={styles.optionDescription}>{opt.description}</Text>

              {opt.mode === 'custom' && active && (
                <View style={styles.customBlock}>
                  <Text style={styles.customLabel}>Anchor date</Text>
                  <TextInput
                    style={[styles.customInput, dateError && styles.customInputError, noWebOutline]}
                    value={customDateText}
                    onChangeText={handleCustomDateChange}
                    onBlur={commitCustomDate}
                    onSubmitEditing={commitCustomDate}
                    keyboardType="number-pad"
                    maxLength={10}
                    placeholder="MM/DD/YYYY"
                    placeholderTextColor={theme.textMuted}
                  />
                  {dateError ? (
                    <Text style={styles.errorText}>Enter a valid date (MM/DD/YYYY)</Text>
                  ) : (
                    <Text style={styles.customHint}>
                      Resets on the {ordinal(settings.customDay)} of every month.
                    </Text>
                  )}
                </View>
              )}

              {opt.mode === 'customRange' && active && (
                <View style={styles.customBlock}>
                  <Text style={styles.customLabel}>Cycle date range</Text>
                  <CustomRangeBar
                    start={parseIsoDateOnly(settings.customRangeStart)}
                    end={parseIsoDateOnly(settings.customRangeEnd)}
                    onChange={(s, e) => {
                      updateSettings({
                        ...settings,
                        mode: 'customRange',
                        customRangeStart: toIsoDateOnly(s),
                        customRangeEnd: toIsoDateOnly(e),
                      });
                    }}
                  />
                  <Text style={styles.customHint}>
                    Repeats every {rangeLengthDays(settings)} days, starting{' '}
                    {formatFullDate(earlierOf(settings))}.
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        <Text style={[styles.title, styles.sectionSpacing]}>Categories</Text>
        <Text style={styles.subtitle}>
          The 8 built-in categories can't be removed. Add your own for anything else.
        </Text>

        <View style={styles.categoryList}>
          {categories.map((cat) => {
            const isBuiltIn = BUILT_IN_CATEGORY_KEYS.has(cat.key);
            return (
              <View key={cat.key} style={styles.categoryRow}>
                <View style={[styles.categoryBadge, { backgroundColor: cat.color }]}>
                  <Text style={styles.categoryBadgeIcon}>{cat.icon}</Text>
                </View>
                <Text style={styles.categoryLabel}>{cat.label}</Text>
                {isBuiltIn ? (
                  <Text style={styles.builtInTag}>Built-in</Text>
                ) : (
                  <TouchableOpacity
                    accessibilityLabel={`Remove ${cat.label}`}
                    style={styles.categoryRemoveButton}
                    onPress={() => setPendingRemove(cat)}
                  >
                    <Text style={styles.categoryRemoveIcon}>🗑️</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.addCategoryButton}
          onPress={() => setAddCategoryVisible(true)}
        >
          <Text style={styles.addCategoryButtonText}>+ Add Category</Text>
        </TouchableOpacity>

        <Text style={[styles.title, styles.sectionSpacing]}>Recurring Entries</Text>
        <Text style={styles.subtitle}>
          Automatically logged once every period — handy for rent, subscriptions, and other
          fixed costs.
        </Text>

        {recurringEntries.length > 0 && (
          <View style={styles.categoryList}>
            {recurringEntries.map((entry) => {
              const meta = categoryMap[entry.category] ?? UNKNOWN_CATEGORY;
              return (
                <View key={entry.id} style={styles.categoryRow}>
                  <View style={[styles.categoryBadge, { backgroundColor: meta.color }]}>
                    <Text style={styles.categoryBadgeIcon}>{meta.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.categoryLabel}>
                      {meta.label} — {formatPeso(entry.amount)}
                    </Text>
                    {entry.note ? <Text style={styles.recurringNote}>{entry.note}</Text> : null}
                  </View>
                  <TouchableOpacity
                    accessibilityLabel="Remove recurring entry"
                    style={styles.categoryRemoveButton}
                    onPress={() => setPendingRemoveRecurring(entry)}
                  >
                    <Text style={styles.categoryRemoveIcon}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        <TouchableOpacity
          style={styles.addCategoryButton}
          onPress={() => setAddRecurringVisible(true)}
        >
          <Text style={styles.addCategoryButtonText}>+ Add Recurring Entry</Text>
        </TouchableOpacity>

        <Text style={[styles.title, styles.sectionSpacing]}>Backup & Restore</Text>
        <Text style={styles.subtitle}>
          Export your data to a file you can keep safe, or restore from a previous backup.
        </Text>
        <View style={styles.backupRow}>
          <TouchableOpacity style={styles.backupButton} onPress={handleExport}>
            <Text style={styles.backupButtonText}>Export Data</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.backupButton, styles.backupButtonSecondary]}
            onPress={() => setImportVisible(true)}
          >
            <Text style={[styles.backupButtonText, styles.backupButtonSecondaryText]}>
              Import Data
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AddCategoryModal
        visible={addCategoryVisible}
        categoryCount={categories.length}
        onSave={addCategory}
        onClose={() => setAddCategoryVisible(false)}
      />

      <ConfirmModal
        visible={pendingRemove !== null}
        title="Remove category?"
        message={
          pendingRemove
            ? pendingRemoveCount > 0
              ? `"${pendingRemove.label}" has ${pendingRemoveCount} transaction${pendingRemoveCount === 1 ? '' : 's'} logged. They'll show as "Other" if you remove it.`
              : `Remove "${pendingRemove.label}"?`
            : undefined
        }
        confirmLabel="Remove"
        onConfirm={() => {
          if (pendingRemove) removeCategory(pendingRemove.key);
          setPendingRemove(null);
        }}
        onCancel={() => setPendingRemove(null)}
      />

      <AddRecurringEntryModal
        visible={addRecurringVisible}
        categories={categories}
        onSave={addRecurringEntry}
        onClose={() => setAddRecurringVisible(false)}
      />

      <ConfirmModal
        visible={pendingRemoveRecurring !== null}
        title="Remove recurring entry?"
        message={
          pendingRemoveRecurring
            ? `${(categoryMap[pendingRemoveRecurring.category] ?? UNKNOWN_CATEGORY).label} — ${formatPeso(pendingRemoveRecurring.amount)}`
            : undefined
        }
        confirmLabel="Remove"
        onConfirm={() => {
          if (pendingRemoveRecurring) removeRecurringEntry(pendingRemoveRecurring.id);
          setPendingRemoveRecurring(null);
        }}
        onCancel={() => setPendingRemoveRecurring(null)}
      />

      <ImportBackupModal
        visible={importVisible}
        onImport={restoreFromBackup}
        onClose={() => setImportVisible(false)}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  title: { fontSize: 24, fontWeight: '800', color: theme.navy, marginBottom: 6 },
  subtitle: { fontSize: 13, color: theme.textMuted, marginBottom: 20 },
  appearanceRow: {
    flexDirection: 'row',
    backgroundColor: theme.background,
    borderRadius: 12,
    padding: 3,
    marginBottom: 24,
  },
  appearanceOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
  },
  appearanceOptionActive: { backgroundColor: theme.navy },
  appearanceOptionText: { fontSize: 13, fontWeight: '600', color: theme.textMuted },
  appearanceOptionTextActive: { color: '#FFFFFF' },
  optionCard: {
    backgroundColor: theme.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.border,
    padding: 16,
    marginBottom: 12,
  },
  optionCardActive: { borderColor: theme.navy },
  optionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: theme.border,
    marginRight: 10,
  },
  radioActive: { borderColor: theme.navy, backgroundColor: theme.navy },
  optionTitle: { fontSize: 15, fontWeight: '700', color: theme.text },
  optionDescription: { fontSize: 12.5, color: theme.textMuted, marginLeft: 28 },
  customBlock: {
    marginTop: 12,
    marginLeft: 28,
  },
  customLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  customInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
    width: 150,
    textAlign: 'center',
    color: theme.text,
  },
  customInputError: { borderColor: theme.danger },
  customHint: { fontSize: 12, color: theme.textMuted, marginTop: 8 },
  errorText: { fontSize: 12, color: theme.danger, marginTop: 8 },
  sectionSpacing: { marginTop: 12 },
  categoryList: { marginBottom: 16 },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    marginBottom: 8,
  },
  categoryBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryBadgeIcon: { fontSize: 16 },
  categoryLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.text },
  builtInTag: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textMuted,
    backgroundColor: theme.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryRemoveButton: { padding: 6 },
  categoryRemoveIcon: { fontSize: 16 },
  addCategoryButton: {
    backgroundColor: theme.card,
    borderWidth: 1.5,
    borderColor: theme.navy,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addCategoryButtonText: { color: theme.navy, fontWeight: '700', fontSize: 14 },
  recurringNote: { fontSize: 12, color: theme.textMuted, marginTop: 1 },
  backupRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  backupButton: {
    flex: 1,
    backgroundColor: theme.navy,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  backupButtonSecondary: {
    backgroundColor: theme.card,
    borderWidth: 1.5,
    borderColor: theme.navy,
  },
  backupButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  backupButtonSecondaryText: { color: theme.navy },
});
