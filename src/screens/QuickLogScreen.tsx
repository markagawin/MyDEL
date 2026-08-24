import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppData } from '../AppDataContext';
import { CategoryKey, SavingsAction } from '../types';
import { formatPeso } from '../currency';
import { formatFullDate, sameDay } from '../cycleEngine';
import { SAVINGS_CATEGORY_KEY, isSavingsTransaction, savingsSignedAmount } from '../savings';
import { AppTheme, useTheme } from '../theme';
import PaycheckModal from '../components/PaycheckModal';
import AddCategoryModal from '../components/AddCategoryModal';
import DatePickerModal from '../components/DatePickerModal';
import Toast from '../components/Toast';
import { noWebOutline } from '../webInputStyle';

export default function QuickLogScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const {
    transactions,
    currentCycleIdentifier,
    currentCycleRange,
    currentPaycheck,
    categories,
    addTransaction,
    deleteTransaction,
    setCurrentPaycheck,
    addCategory,
    profileName,
    profilePhotoUri,
  } = useAppData();
  const [amountText, setAmountText] = useState('');
  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [savingsAction, setSavingsAction] = useState<SavingsAction>('deposit');
  const [note, setNote] = useState('');
  const [entryDate, setEntryDate] = useState(() => new Date());
  const [paycheckModalVisible, setPaycheckModalVisible] = useState(false);
  const [addCategoryModalVisible, setAddCategoryModalVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [showTotalOnly, setShowTotalOnly] = useState(false);
  const [amountBlurred, setAmountBlurred] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastUndoId, setToastUndoId] = useState<string | null>(null);
  const amountInputRef = useRef<TextInput>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    setShowTotalOnly(false);
  }, [currentCycleIdentifier]);

  const bannerPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > Math.abs(gesture.dy) && Math.abs(gesture.dx) > 10,
        onPanResponderRelease: (_, gesture) => {
          if (Math.abs(gesture.dx) > 40) {
            setShowTotalOnly((prev) => !prev);
          }
        },
      }),
    []
  );

  const cycleLabel = currentCycleRange.label;

  // Net outflow for the current period: a savings deposit counts like any expense (money no
  // longer available), but a withdrawal gives money back, so it's subtracted rather than added.
  // This is what "Remaining of paycheck" and the progress bar are based on.
  const periodTotal = useMemo(() => {
    return transactions
      .filter((t) => t.cycleIdentifier === currentCycleIdentifier)
      .reduce((sum, t) => sum + (isSavingsTransaction(t) ? savingsSignedAmount(t) : t.amount), 0);
  }, [transactions, currentCycleIdentifier]);

  // "Total spent so far" excludes savings entirely — putting money into or taking it out of
  // savings isn't spending.
  const periodSpentTotal = useMemo(() => {
    return transactions
      .filter((t) => t.cycleIdentifier === currentCycleIdentifier && !isSavingsTransaction(t))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, currentCycleIdentifier]);

  const remaining = currentPaycheck !== null ? currentPaycheck - periodTotal : null;
  const pctSpent =
    currentPaycheck !== null && currentPaycheck > 0 ? (periodTotal / currentPaycheck) * 100 : 0;

  const amountValue = parseFloat(amountText);
  const hasValidAmount = !Number.isNaN(amountValue) && amountValue > 0;
  const canLog = hasValidAmount && category !== null;
  const showCategoryPrompt = amountBlurred && hasValidAmount && category === null;

  const handleLog = () => {
    if (!canLog || category === null) return;
    const loggedAmount = amountValue;
    const loggedCategory = category;
    const loggedNote = note;
    const loggedSavingsAction = savingsAction;
    const isSavings = loggedCategory === SAVINGS_CATEGORY_KEY;

    const now = new Date();
    const timestamp = new Date(
      entryDate.getFullYear(),
      entryDate.getMonth(),
      entryDate.getDate(),
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getMilliseconds()
    );

    setAmountText('');
    setNote('');
    setAmountBlurred(false);
    setEntryDate(new Date());
    setSavingsAction('deposit');
    amountInputRef.current?.blur();

    const newId = addTransaction({
      amount: loggedAmount,
      category: loggedCategory,
      note: loggedNote,
      timestamp,
      savingsAction: isSavings ? loggedSavingsAction : undefined,
    });

    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(
      isSavings
        ? loggedSavingsAction === 'withdrawal'
          ? `${formatPeso(loggedAmount)} withdrawn from savings`
          : `${formatPeso(loggedAmount)} deposited to savings`
        : `${formatPeso(loggedAmount)} added successfully`
    );
    setToastUndoId(newId);
    setToastVisible(true);
    toastTimeoutRef.current = setTimeout(() => {
      setToastVisible(false);
      setToastUndoId(null);
    }, 2200);
  };

  const handleUndo = () => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    if (toastUndoId) deleteTransaction(toastUndoId);
    setToastVisible(false);
    setToastUndoId(null);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.appName}>MyDEL</Text>
              <Text style={styles.appSubtitle}>My Daily Expenses in Life</Text>
            </View>
            <TouchableOpacity
              accessibilityLabel="Settings"
              style={styles.profileCluster}
              onPress={() => navigation.navigate('Settings')}
            >
              {profileName ? (
                <Text style={styles.profileName} numberOfLines={1}>
                  {profileName}
                </Text>
              ) : null}
              <View style={styles.avatarWrap}>
                {profilePhotoUri ? (
                  <Image source={{ uri: profilePhotoUri }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarInitial}>
                    {profileName.trim() ? profileName.trim().charAt(0).toUpperCase() : '🙂'}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.banner} {...(currentPaycheck !== null ? bannerPanResponder.panHandlers : {})}>
            <View style={styles.bannerTopRow}>
              <Text style={styles.bannerLabel}>Current Period: {cycleLabel}</Text>
              <TouchableOpacity onPress={() => setPaycheckModalVisible(true)}>
                <Text style={styles.paycheckLink}>
                  {currentPaycheck !== null ? 'Edit Paycheck' : '+ Add Paycheck'}
                </Text>
              </TouchableOpacity>
            </View>

            {currentPaycheck !== null && remaining !== null && !showTotalOnly ? (
              <>
                <Text
                  style={[styles.bannerTotal, remaining < 0 && styles.bannerTotalDanger]}
                >
                  {formatPeso(remaining)}
                </Text>
                <Text style={styles.bannerSub}>
                  {remaining >= 0
                    ? `Remaining of ${formatPeso(currentPaycheck)} paycheck`
                    : `${formatPeso(Math.abs(remaining))} over your ${formatPeso(
                        currentPaycheck
                      )} paycheck`}
                </Text>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(100, pctSpent)}%` },
                      pctSpent > 100 && styles.progressFillDanger,
                    ]}
                  />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.bannerTotal}>{formatPeso(periodSpentTotal)}</Text>
                <Text style={styles.bannerSub}>Total spent so far</Text>
              </>
            )}

            {currentPaycheck !== null && (
              <View style={styles.bannerDots}>
                <TouchableOpacity onPress={() => setShowTotalOnly(false)}>
                  <View style={[styles.bannerDot, !showTotalOnly && styles.bannerDotActive]} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowTotalOnly(true)}>
                  <View style={[styles.bannerDot, showTotalOnly && styles.bannerDotActive]} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <Text style={styles.fieldLabel}>AMOUNT</Text>
          <View style={styles.amountWrap}>
            <Text style={styles.pesoSign}>₱</Text>
            <TextInput
              ref={amountInputRef}
              style={[styles.amountInput, noWebOutline]}
              value={amountText}
              onChangeText={(v) => setAmountText(v.replace(/[^0-9.]/g, ''))}
              onFocus={() => setAmountBlurred(false)}
              onBlur={() => setAmountBlurred(true)}
              placeholder="0.00"
              placeholderTextColor={theme.textMuted}
              keyboardType="decimal-pad"
              maxLength={10}
            />
          </View>

          {showCategoryPrompt && (
            <Text style={styles.categoryPrompt}>👇 Pick a category for this amount</Text>
          )}

          <View style={styles.grid}>
            {categories.map((cat) => {
              const selected = category === cat.key;
              return (
                <Pressable
                  key={cat.key}
                  onPress={() => {
                    setCategory(selected ? null : cat.key);
                    setSavingsAction('deposit');
                  }}
                  style={[
                    styles.tile,
                    selected && { backgroundColor: cat.color, borderColor: cat.color },
                  ]}
                >
                  <Text style={styles.tileIcon}>{cat.icon}</Text>
                  <Text style={[styles.tileLabel, selected && styles.tileLabelSelected]}>
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              style={[styles.tile, styles.addTile]}
              onPress={() => setAddCategoryModalVisible(true)}
            >
              <Text style={styles.addTileIcon}>+</Text>
              <Text style={styles.addTileLabel}>Add</Text>
            </Pressable>
          </View>

          {category === SAVINGS_CATEGORY_KEY && (
            <View style={styles.savingsToggleRow}>
              <TouchableOpacity
                style={[
                  styles.savingsToggleOption,
                  savingsAction === 'deposit' && styles.savingsToggleOptionActive,
                ]}
                onPress={() => setSavingsAction('deposit')}
              >
                <Text
                  style={[
                    styles.savingsToggleText,
                    savingsAction === 'deposit' && styles.savingsToggleTextActive,
                  ]}
                >
                  Deposit
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.savingsToggleOption,
                  savingsAction === 'withdrawal' && styles.savingsToggleOptionActive,
                ]}
                onPress={() => setSavingsAction('withdrawal')}
              >
                <Text
                  style={[
                    styles.savingsToggleText,
                    savingsAction === 'withdrawal' && styles.savingsToggleTextActive,
                  ]}
                >
                  Withdrawal
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.fieldLabelMuted}>NOTE (OPTIONAL)</Text>
          <View style={styles.noteWrap}>
            <Text style={styles.noteIcon}>📝</Text>
            <TextInput
              style={[styles.noteInput, noWebOutline]}
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Lunch with team"
              placeholderTextColor={theme.textMuted}
            />
          </View>

          <Text style={styles.fieldLabelMuted}>DATE</Text>
          <TouchableOpacity style={styles.dateWrap} onPress={() => setDatePickerVisible(true)}>
            <Text style={styles.dateIcon}>📅</Text>
            <Text style={styles.dateText}>
              {formatFullDate(entryDate)}
              {sameDay(entryDate, new Date()) ? ' (Today)' : ''}
            </Text>
          </TouchableOpacity>

        </ScrollView>

        <View style={[styles.floatingFooter, { paddingBottom: Math.max(16, insets.bottom) }]}>
          <TouchableOpacity
            style={[styles.logButton, !canLog && styles.logButtonDisabled]}
            disabled={!canLog}
            onPress={handleLog}
          >
            <Text style={styles.logButtonText}>Log Entry</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <PaycheckModal
        visible={paycheckModalVisible}
        currentAmount={currentPaycheck}
        onSave={setCurrentPaycheck}
        onClose={() => setPaycheckModalVisible(false)}
      />

      <AddCategoryModal
        visible={addCategoryModalVisible}
        categoryCount={categories.length}
        onSave={addCategory}
        onClose={() => setAddCategoryModalVisible(false)}
      />

      <DatePickerModal
        visible={datePickerVisible}
        value={entryDate}
        maxDate={new Date()}
        onChange={setEntryDate}
        onClose={() => setDatePickerVisible(false)}
      />

      <Toast visible={toastVisible} message={toastMessage} onUndo={handleUndo} />
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  scrollContent: { padding: 20, paddingBottom: 24 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  appName: { fontSize: 26, fontWeight: '800', color: theme.navy },
  appSubtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  profileCluster: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  profileName: { fontSize: 12.5, fontWeight: '600', color: theme.textMuted, maxWidth: 70 },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  avatarImage: { width: 36, height: 36, borderRadius: 18 },
  avatarInitial: { fontSize: 15, fontWeight: '700', color: theme.navy },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.navy,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  fieldLabelMuted: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  banner: {
    backgroundColor: theme.navy,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  bannerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerLabel: { color: '#C9D6EE', fontSize: 13, fontWeight: '600' },
  paycheckLink: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  bannerTotal: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', marginTop: 6 },
  bannerTotalDanger: { color: '#FF9B9B' },
  bannerSub: { color: '#9FB2D6', fontSize: 12, marginTop: 2 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
    marginTop: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#5FE3A1',
  },
  progressFillDanger: { backgroundColor: '#FF6B6B' },
  bannerDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  bannerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  bannerDotActive: { backgroundColor: '#FFFFFF' },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  pesoSign: { fontSize: 26, fontWeight: '700', color: theme.navy, marginRight: 6 },
  amountInput: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.text,
    minWidth: 120,
    textAlign: 'left',
  },
  categoryPrompt: {
    fontSize: 12.5,
    fontWeight: '600',
    color: theme.danger,
    marginBottom: 12,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  tile: {
    width: '23.5%',
    aspectRatio: 1,
    backgroundColor: theme.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  tileIcon: { fontSize: 24, marginBottom: 4 },
  tileLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: theme.text,
    textAlign: 'center',
  },
  tileLabelSelected: { color: '#FFFFFF' },
  addTile: {
    borderStyle: 'dashed',
    backgroundColor: theme.background,
  },
  addTileIcon: { fontSize: 22, fontWeight: '700', color: theme.textMuted, marginBottom: 2 },
  addTileLabel: { fontSize: 10.5, fontWeight: '600', color: theme.textMuted },
  savingsToggleRow: {
    flexDirection: 'row',
    backgroundColor: theme.surfaceMuted,
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  savingsToggleOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
  },
  savingsToggleOptionActive: { backgroundColor: theme.navy },
  savingsToggleText: { fontSize: 13, fontWeight: '600', color: theme.textMuted },
  savingsToggleTextActive: { color: '#FFFFFF' },
  noteWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 20,
  },
  noteIcon: { fontSize: 15, marginRight: 8 },
  noteInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.text,
  },
  dateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 20,
  },
  dateIcon: { fontSize: 15, marginRight: 8 },
  dateText: { fontSize: 14, fontWeight: '600', color: theme.text },
  floatingFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: theme.background,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
    elevation: 10,
  },
  logButton: {
    backgroundColor: theme.navy,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logButtonDisabled: { backgroundColor: theme.disabled },
  logButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
