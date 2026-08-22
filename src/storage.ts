import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustomCategory, CycleSettings, RecurringEntry, Transaction } from './types';

const TRANSACTIONS_KEY = '@mydel/transactions';
const SETTINGS_KEY = '@mydel/settings';
const TRACKING_START_KEY = '@mydel/trackingStartDate';
const PAYCHECKS_KEY = '@mydel/paychecks';
const CUSTOM_CATEGORIES_KEY = '@mydel/customCategories';
const THEME_PREFERENCE_KEY = '@mydel/themePreference';
const RECURRING_ENTRIES_KEY = '@mydel/recurringEntries';
const PROFILE_NAME_KEY = '@mydel/profileName';
const PROFILE_PHOTO_KEY = '@mydel/profilePhoto';

export const DEFAULT_SETTINGS: CycleSettings = {
  mode: 'monthly',
  customDay: 5,
  customAnchorDate: '2025-01-05',
  customRangeStart: '2025-01-01',
  customRangeEnd: '2025-01-31',
};

export async function loadTransactions(): Promise<Transaction[]> {
  const raw = await AsyncStorage.getItem(TRANSACTIONS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Transaction[];
  } catch {
    return [];
  }
}

export async function saveTransactions(transactions: Transaction[]): Promise<void> {
  await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
}

export async function loadSettings(): Promise<CycleSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as CycleSettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: CycleSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/** ISO date string ("yyyy-MM-dd") for the day the user first opened the app, or null if never recorded. */
export async function loadTrackingStartDate(): Promise<string | null> {
  return AsyncStorage.getItem(TRACKING_START_KEY);
}

export async function saveTrackingStartDate(isoDate: string): Promise<void> {
  await AsyncStorage.setItem(TRACKING_START_KEY, isoDate);
}

/** Paycheck amount entered for each cycle, keyed by cycleIdentifier. */
export async function loadPaychecks(): Promise<Record<string, number>> {
  const raw = await AsyncStorage.getItem(PAYCHECKS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}

export async function savePaychecks(paychecks: Record<string, number>): Promise<void> {
  await AsyncStorage.setItem(PAYCHECKS_KEY, JSON.stringify(paychecks));
}

export async function loadCustomCategories(): Promise<CustomCategory[]> {
  const raw = await AsyncStorage.getItem(CUSTOM_CATEGORIES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CustomCategory[];
  } catch {
    return [];
  }
}

export async function saveCustomCategories(categories: CustomCategory[]): Promise<void> {
  await AsyncStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(categories));
}

export async function loadRecurringEntries(): Promise<RecurringEntry[]> {
  const raw = await AsyncStorage.getItem(RECURRING_ENTRIES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as RecurringEntry[];
  } catch {
    return [];
  }
}

export async function saveRecurringEntries(entries: RecurringEntry[]): Promise<void> {
  await AsyncStorage.setItem(RECURRING_ENTRIES_KEY, JSON.stringify(entries));
}

/** 'system' | 'light' | 'dark', or null if never set (defaults to 'system'). */
export async function loadThemePreference(): Promise<string | null> {
  return AsyncStorage.getItem(THEME_PREFERENCE_KEY);
}

export async function saveThemePreference(preference: string): Promise<void> {
  await AsyncStorage.setItem(THEME_PREFERENCE_KEY, preference);
}

export async function loadProfileName(): Promise<string> {
  return (await AsyncStorage.getItem(PROFILE_NAME_KEY)) ?? '';
}

export async function saveProfileName(name: string): Promise<void> {
  await AsyncStorage.setItem(PROFILE_NAME_KEY, name);
}

/** Data URI of the user's profile photo, or null if never set. */
export async function loadProfilePhoto(): Promise<string | null> {
  return AsyncStorage.getItem(PROFILE_PHOTO_KEY);
}

export async function saveProfilePhoto(uri: string): Promise<void> {
  await AsyncStorage.setItem(PROFILE_PHOTO_KEY, uri);
}
