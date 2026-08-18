import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppData } from '../AppDataContext';
import { CategoryKey } from '../types';
import { formatPeso } from '../currency';
import { theme } from '../theme';
import PaycheckModal from '../components/PaycheckModal';
import AddCategoryModal from '../components/AddCategoryModal';

export default function QuickLogScreen() {
  const navigation = useNavigation<any>();
  const {
    transactions,
    currentCycleIdentifier,
    currentCycleRange,
    currentPaycheck,
    categories,
    addTransaction,
    setCurrentPaycheck,
    addCategory,
  } = useAppData();
  const [amountText, setAmountText] = useState('');
  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [note, setNote] = useState('');
  const [flash, setFlash] = useState<string | null>(null);
  const [paycheckModalVisible, setPaycheckModalVisible] = useState(false);
  const [addCategoryModalVisible, setAddCategoryModalVisible] = useState(false);
  const amountInputRef = useRef<TextInput>(null);

  useEffect(() => {
    amountInputRef.current?.focus();
  }, []);

  const cycleLabel = currentCycleRange.label;

  const periodTotal = useMemo(() => {
    return transactions
      .filter((t) => t.cycleIdentifier === currentCycleIdentifier)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, currentCycleIdentifier]);

  const remaining = currentPaycheck !== null ? currentPaycheck - periodTotal : null;
  const pctSpent =
    currentPaycheck !== null && currentPaycheck > 0 ? (periodTotal / currentPaycheck) * 100 : 0;

  const amountValue = parseFloat(amountText);
  const canLog = !Number.isNaN(amountValue) && amountValue > 0 && category !== null;

  const handleLog = async () => {
    if (!canLog || category === null) return;
    await addTransaction({ amount: amountValue, category, note });
    setAmountText('');
    setNote('');
    setCategory(null);
    setFlash('Logged!');
    setTimeout(() => setFlash(null), 1200);
    amountInputRef.current?.focus();
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
              style={styles.gearButton}
              onPress={() => navigation.navigate('Settings')}
            >
              <Text style={styles.gearIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.banner}>
            <View style={styles.bannerTopRow}>
              <Text style={styles.bannerLabel}>Current Period: {cycleLabel}</Text>
              <TouchableOpacity onPress={() => setPaycheckModalVisible(true)}>
                <Text style={styles.paycheckLink}>
                  {currentPaycheck !== null ? 'Edit Paycheck' : '+ Add Paycheck'}
                </Text>
              </TouchableOpacity>
            </View>

            {currentPaycheck !== null && remaining !== null ? (
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
                <Text style={styles.bannerTotal}>{formatPeso(periodTotal)}</Text>
                <Text style={styles.bannerSub}>Total spent so far</Text>
              </>
            )}
          </View>

          <Text style={styles.fieldLabel}>AMOUNT</Text>
          <View style={styles.amountWrap}>
            <Text style={styles.pesoSign}>₱</Text>
            <TextInput
              ref={amountInputRef}
              style={styles.amountInput}
              value={amountText}
              onChangeText={(v) => setAmountText(v.replace(/[^0-9.]/g, ''))}
              placeholder="0.00"
              placeholderTextColor={theme.textMuted}
              keyboardType="decimal-pad"
              maxLength={10}
            />
          </View>

          <View style={styles.grid}>
            {categories.map((cat) => {
              const selected = category === cat.key;
              return (
                <Pressable
                  key={cat.key}
                  onPress={() => setCategory(selected ? null : cat.key)}
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

          <Text style={styles.fieldLabelMuted}>NOTE (OPTIONAL)</Text>
          <View style={styles.noteWrap}>
            <Text style={styles.noteIcon}>📝</Text>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Lunch with team"
              placeholderTextColor={theme.textMuted}
            />
          </View>

          <TouchableOpacity
            style={[styles.logButton, !canLog && styles.logButtonDisabled]}
            disabled={!canLog}
            onPress={handleLog}
          >
            <Text style={styles.logButtonText}>{flash ?? 'Log Entry'}</Text>
          </TouchableOpacity>
        </ScrollView>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  scrollContent: { padding: 20, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  appName: { fontSize: 26, fontWeight: '800', color: theme.navy },
  appSubtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  gearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  gearIcon: { fontSize: 18 },
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
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 22,
    marginBottom: 20,
  },
  pesoSign: { fontSize: 36, fontWeight: '700', color: theme.navy, marginRight: 6 },
  amountInput: {
    fontSize: 44,
    fontWeight: '800',
    color: theme.text,
    minWidth: 140,
    textAlign: 'left',
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
  noteWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAEEF6',
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
  logButton: {
    backgroundColor: theme.navy,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logButtonDisabled: { backgroundColor: '#B7C2D6' },
  logButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
