import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { CategoryKey, CustomCategory, CycleRange, CycleSettings, Transaction } from './types';
import { CATEGORIES, CATEGORY_MAP, CategoryMeta } from './categories';
import {
  DEFAULT_SETTINGS,
  loadCustomCategories,
  loadPaychecks,
  loadSettings,
  loadTrackingStartDate,
  loadTransactions,
  saveCustomCategories,
  savePaychecks,
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
  addTransaction: (input: { amount: number; category: CategoryKey; note?: string }) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  updateSettings: (settings: CycleSettings) => Promise<void>;
  setCurrentPaycheck: (amount: number | null) => Promise<void>;
  addCategory: (input: { label: string; icon: string; color: string }) => Promise<void>;
  removeCategory: (key: string) => Promise<void>;
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

  useEffect(() => {
    (async () => {
      const [tx, s, trackingStart, storedPaychecks, storedCustomCategories] = await Promise.all([
        loadTransactions(),
        loadSettings(),
        loadTrackingStartDate(),
        loadPaychecks(),
        loadCustomCategories(),
      ]);
      setTransactions(tx);
      setSettings(s);
      setPaychecks(storedPaychecks);
      setCustomCategories(storedCustomCategories);
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
    async ({ amount, category, note }) => {
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

  const value: AppDataContextValue = {
    loading,
    transactions,
    settings,
    currentCycleRange,
    currentCycleIdentifier: currentCycleRange.identifier,
    currentPaycheck: paychecks[currentCycleRange.identifier] ?? null,
    categories,
    categoryMap,
    addTransaction,
    deleteTransaction,
    updateSettings,
    setCurrentPaycheck,
    addCategory,
    removeCategory,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
