import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  BackupData,
  CategoryKey,
  CustomCategory,
  CycleRange,
  CycleSettings,
  RecurringEntry,
  Transaction,
} from './types';
import { CATEGORIES, CATEGORY_MAP, CategoryMeta } from './categories';
import {
  DEFAULT_SETTINGS,
  loadCustomCategories,
  loadPaychecks,
  loadProfileName,
  loadProfilePhoto,
  loadRecurringEntries,
  loadSettings,
  loadTrackingStartDate,
  loadTransactions,
  saveCustomCategories,
  savePaychecks,
  saveProfileName,
  saveProfilePhoto,
  saveRecurringEntries,
  saveSettings,
  saveTrackingStartDate,
  saveTransactions,
} from './storage';
import { getCurrentCycleRange, parseIsoDateOnly, toIsoDateOnly } from './cycleEngine';
import { generateId } from './uuid';

interface AppDataContextValue {
  loading: boolean;
  transactions: Transaction[];
  settings: CycleSettings;
  currentCycleRange: CycleRange;
  currentCycleIdentifier: string;
  currentPaycheck: number | null;
  categories: CategoryMeta[];
  categoryMap: Record<string, CategoryMeta>;
  recurringEntries: RecurringEntry[];
  profileName: string;
  profilePhotoUri: string | null;
  setProfileName: (name: string) => Promise<void>;
  setProfilePhotoUri: (uri: string | null) => Promise<void>;
  addTransaction: (input: { amount: number; category: CategoryKey; note?: string }) => string;
  deleteTransaction: (id: string) => Promise<void>;
  updateTransaction: (
    id: string,
    input: { amount: number; category: CategoryKey; note?: string }
  ) => Promise<void>;
  updateSettings: (settings: CycleSettings) => Promise<void>;
  setCurrentPaycheck: (amount: number | null) => Promise<void>;
  addCategory: (input: { label: string; icon: string; color: string }) => Promise<void>;
  removeCategory: (key: string) => Promise<void>;
  addRecurringEntry: (input: { amount: number; category: CategoryKey; note?: string }) => Promise<void>;
  removeRecurringEntry: (id: string) => Promise<void>;
  exportBackup: () => BackupData;
  restoreFromBackup: (data: BackupData) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

function slugify(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug || 'category';
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<CycleSettings>(DEFAULT_SETTINGS);
  const [trackingStartDate, setTrackingStartDate] = useState<string | null>(null);
  const [paychecks, setPaychecks] = useState<Record<string, number>>({});
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [recurringEntries, setRecurringEntries] = useState<RecurringEntry[]>([]);
  const [profileName, setProfileNameState] = useState('');
  const [profilePhotoUri, setProfilePhotoUriState] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [
        tx,
        s,
        trackingStart,
        storedPaychecks,
        storedCustomCategories,
        storedRecurring,
        storedProfileName,
        storedProfilePhoto,
      ] = await Promise.all([
        loadTransactions(),
        loadSettings(),
        loadTrackingStartDate(),
        loadPaychecks(),
        loadCustomCategories(),
        loadRecurringEntries(),
        loadProfileName(),
        loadProfilePhoto(),
      ]);
      setTransactions(tx);
      setSettings(s);
      setPaychecks(storedPaychecks);
      setCustomCategories(storedCustomCategories);
      setRecurringEntries(storedRecurring);
      setProfileNameState(storedProfileName);
      setProfilePhotoUriState(storedProfilePhoto);
      if (trackingStart) {
        setTrackingStartDate(trackingStart);
      } else {
        const today = toIsoDateOnly(new Date());
        setTrackingStartDate(today);
        saveTrackingStartDate(today);
      }
      setLoading(false);
    })();
  }, []);

  const trackingStartAsDate = useMemo(
    () => (trackingStartDate ? parseIsoDateOnly(trackingStartDate) : null),
    [trackingStartDate]
  );

  const currentCycleRange = useMemo(
    () => getCurrentCycleRange(settings, trackingStartAsDate),
    [settings, trackingStartAsDate]
  );

  const categories = useMemo(() => [...CATEGORIES, ...customCategories], [customCategories]);

  const categoryMap = useMemo(() => {
    const map: Record<string, CategoryMeta> = { ...CATEGORY_MAP };
    for (const cat of customCategories) {
      map[cat.key] = cat;
    }
    return map;
  }, [customCategories]);

  const addTransaction = useCallback<AppDataContextValue['addTransaction']>(
    ({ amount, category, note }) => {
      const now = new Date();
      const tx: Transaction = {
        id: generateId(),
        amount,
        category,
        note: note && note.trim().length > 0 ? note.trim() : undefined,
        timestamp: now.toISOString(),
        cycleIdentifier: currentCycleRange.identifier,
      };
      setTransactions((prev) => {
        const next = [tx, ...prev];
        saveTransactions(next);
        return next;
      });
      return tx.id;
    },
    [currentCycleRange]
  );

  const deleteTransaction = useCallback(async (id: string) => {
    setTransactions((prev) => {
      const next = prev.filter((t) => t.id !== id);
      saveTransactions(next);
      return next;
    });
  }, []);

  const updateTransaction = useCallback(
    async (id: string, input: { amount: number; category: CategoryKey; note?: string }) => {
      setTransactions((prev) => {
        const next = prev.map((t) =>
          t.id === id
            ? {
                ...t,
                amount: input.amount,
                category: input.category,
                note: input.note && input.note.trim().length > 0 ? input.note.trim() : undefined,
              }
            : t
        );
        saveTransactions(next);
        return next;
      });
    },
    []
  );

  // Auto-log any recurring entry that hasn't already produced a transaction for the
  // current cycle. Self-terminating: once applied, `transactions` includes the new
  // entries so the next effect run finds nothing missing and no-ops.
  useEffect(() => {
    if (loading || recurringEntries.length === 0) return;

    const existingSourceIds = new Set(
      transactions
        .filter((t) => t.cycleIdentifier === currentCycleRange.identifier && t.recurringSourceId)
        .map((t) => t.recurringSourceId)
    );

    const missing = recurringEntries.filter((r) => !existingSourceIds.has(r.id));
    if (missing.length === 0) return;

    const now = new Date();
    const newTxs: Transaction[] = missing.map((r) => ({
      id: generateId(),
      amount: r.amount,
      category: r.category,
      note: r.note,
      timestamp: now.toISOString(),
      cycleIdentifier: currentCycleRange.identifier,
      recurringSourceId: r.id,
    }));

    setTransactions((prev) => {
      const next = [...newTxs, ...prev];
      saveTransactions(next);
      return next;
    });
  }, [loading, recurringEntries, transactions, currentCycleRange.identifier]);

  const updateSettings = useCallback(async (next: CycleSettings) => {
    setSettings(next);
    await saveSettings(next);
  }, []);

  const setCurrentPaycheck = useCallback(
    async (amount: number | null) => {
      const identifier = currentCycleRange.identifier;
      setPaychecks((prev) => {
        const next = { ...prev };
        if (amount === null) {
          delete next[identifier];
        } else {
          next[identifier] = amount;
        }
        savePaychecks(next);
        return next;
      });
    },
    [currentCycleRange]
  );

  const addCategory = useCallback(
    async (input: { label: string; icon: string; color: string }) => {
      const label = input.label.trim();
      if (!label) return;
      const baseKey = slugify(label);
      const existingKeys = new Set(categories.map((c) => c.key));
      let key = baseKey;
      let suffix = 2;
      while (existingKeys.has(key)) {
        key = `${baseKey}-${suffix}`;
        suffix++;
      }
      const newCategory: CustomCategory = { key, label, icon: input.icon, color: input.color };
      setCustomCategories((prev) => {
        const next = [...prev, newCategory];
        saveCustomCategories(next);
        return next;
      });
    },
    [categories]
  );

  const removeCategory = useCallback(async (key: string) => {
    setCustomCategories((prev) => {
      const next = prev.filter((c) => c.key !== key);
      saveCustomCategories(next);
      return next;
    });
  }, []);

  const addRecurringEntry = useCallback(
    async (input: { amount: number; category: CategoryKey; note?: string }) => {
      const entry: RecurringEntry = {
        id: generateId(),
        amount: input.amount,
        category: input.category,
        note: input.note && input.note.trim().length > 0 ? input.note.trim() : undefined,
      };
      setRecurringEntries((prev) => {
        const next = [...prev, entry];
        saveRecurringEntries(next);
        return next;
      });
    },
    []
  );

  const removeRecurringEntry = useCallback(async (id: string) => {
    setRecurringEntries((prev) => {
      const next = prev.filter((r) => r.id !== id);
      saveRecurringEntries(next);
      return next;
    });
  }, []);

  const setProfileName = useCallback(async (name: string) => {
    setProfileNameState(name);
    await saveProfileName(name);
  }, []);

  const setProfilePhotoUri = useCallback(async (uri: string | null) => {
    setProfilePhotoUriState(uri);
    if (uri) await saveProfilePhoto(uri);
  }, []);

  const exportBackup = useCallback(
    (): BackupData => ({
      version: 1,
      exportedAt: new Date().toISOString(),
      transactions,
      settings,
      trackingStartDate,
      paychecks,
      customCategories,
      recurringEntries,
      profileName,
      profilePhotoUri,
    }),
    [
      transactions,
      settings,
      trackingStartDate,
      paychecks,
      customCategories,
      recurringEntries,
      profileName,
      profilePhotoUri,
    ]
  );

  const restoreFromBackup = useCallback(async (data: BackupData) => {
    const nextTransactions = data.transactions ?? [];
    const nextSettings = { ...DEFAULT_SETTINGS, ...data.settings };
    const nextPaychecks = data.paychecks ?? {};
    const nextCustomCategories = data.customCategories ?? [];
    const nextRecurringEntries = data.recurringEntries ?? [];
    const nextProfileName = data.profileName ?? '';
    const nextProfilePhotoUri = data.profilePhotoUri ?? null;

    await Promise.all([
      saveTransactions(nextTransactions),
      saveSettings(nextSettings),
      savePaychecks(nextPaychecks),
      saveCustomCategories(nextCustomCategories),
      saveRecurringEntries(nextRecurringEntries),
      saveProfileName(nextProfileName),
      nextProfilePhotoUri ? saveProfilePhoto(nextProfilePhotoUri) : Promise.resolve(),
      data.trackingStartDate ? saveTrackingStartDate(data.trackingStartDate) : Promise.resolve(),
    ]);

    setTransactions(nextTransactions);
    setSettings(nextSettings);
    setPaychecks(nextPaychecks);
    setCustomCategories(nextCustomCategories);
    setRecurringEntries(nextRecurringEntries);
    setProfileNameState(nextProfileName);
    setProfilePhotoUriState(nextProfilePhotoUri);
    if (data.trackingStartDate) setTrackingStartDate(data.trackingStartDate);
  }, []);

  const value: AppDataContextValue = {
    loading,
    transactions,
    settings,
    currentCycleRange,
    currentCycleIdentifier: currentCycleRange.identifier,
    currentPaycheck: paychecks[currentCycleRange.identifier] ?? null,
    categories,
    categoryMap,
    recurringEntries,
    profileName,
    profilePhotoUri,
    setProfileName,
    setProfilePhotoUri,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    updateSettings,
    setCurrentPaycheck,
    addCategory,
    removeCategory,
    addRecurringEntry,
    removeRecurringEntry,
    exportBackup,
    restoreFromBackup,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
