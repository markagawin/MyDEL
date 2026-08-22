import { CycleRange, CycleSettings } from './types';

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function makeDate(year: number, monthIndex: number, day: number): Date {
  return new Date(year, monthIndex, day, 0, 0, 0, 0);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shortLabel(d: Date): string {
  return `${MONTH_ABBR[d.getMonth()]} ${d.getDate()}`;
}

function buildLabel(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${shortLabel(start)} – ${shortLabel(end)}, ${end.getFullYear()}`;
  }
  return `${shortLabel(start)} – ${shortLabel(end)}, ${end.getFullYear()}`;
}

function clampCustomDay(day: number): number {
  if (!Number.isFinite(day)) return 1;
  return Math.min(28, Math.max(1, Math.round(day)));
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, 0, 0, 0, 0);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / ONE_DAY_MS);
}

/**
 * Computes the payday cycle range that a given date falls into, based on the
 * user's configured cycle mode. Semi-monthly Option B and Custom cycles can
 * cross a calendar month boundary, so start/end are resolved independently.
 */
export function getCycleRangeForDate(date: Date, settings: CycleSettings): CycleRange {
  const y = date.getFullYear();
  const m = date.getMonth();
  const day = date.getDate();

  let start: Date;
  let end: Date;

  switch (settings.mode) {
    case 'monthly': {
      start = makeDate(y, m, 1);
      end = makeDate(y, m, daysInMonth(y, m));
      break;
    }
    case 'semiA': {
      if (day <= 15) {
        start = makeDate(y, m, 1);
        end = makeDate(y, m, 15);
      } else {
        start = makeDate(y, m, 16);
        end = makeDate(y, m, daysInMonth(y, m));
      }
      break;
    }
    case 'semiB': {
      if (day >= 10 && day <= 24) {
        start = makeDate(y, m, 10);
        end = makeDate(y, m, 24);
      } else if (day >= 25) {
        start = makeDate(y, m, 25);
        end = makeDate(y, m + 1, 9);
      } else {
        // day <= 9: belongs to the period that started the 25th of last month
        start = makeDate(y, m - 1, 25);
        end = makeDate(y, m, 9);
      }
      break;
    }
    case 'custom': {
      const anchor = clampCustomDay(settings.customDay);
      if (day >= anchor) {
        start = makeDate(y, m, anchor);
        end = makeDate(y, m + 1, anchor - 1);
      } else {
        start = makeDate(y, m - 1, anchor);
        end = makeDate(y, m, anchor - 1);
      }
      break;
    }
    case 'customDates': {
      const known = [...(settings.customDates ?? [])]
        .map(parseIsoDateOnly)
        .sort((a, b) => a.getTime() - b.getTime());
      if (known.length === 0) {
        start = makeDate(y, m, 1);
        end = makeDate(y, m, daysInMonth(y, m));
        break;
      }
      const target = startOfDay(date);
      let idx = -1;
      for (let i = 0; i < known.length; i++) {
        if (known[i].getTime() <= target.getTime()) idx = i;
        else break;
      }
      if (idx === -1) {
        // Before the earliest recorded payout date: approximate a period of the
        // same length as the first known gap so there's still a bounded cycle.
        const fallbackLen = known.length >= 2 ? daysBetween(known[0], known[1]) : 15;
        end = addDays(known[0], -1);
        start = addDays(known[0], -fallbackLen);
      } else {
        start = known[idx];
        if (idx + 1 < known.length) {
          end = addDays(known[idx + 1], -1);
        } else {
          // Past the last recorded payout date: extrapolate using the previous
          // gap length until the user adds the next real payout date.
          const fallbackLen = idx >= 1 ? daysBetween(known[idx - 1], known[idx]) : 15;
          end = addDays(start, fallbackLen - 1);
        }
      }
      break;
    }
    case 'customRange': {
      let anchorStart = parseIsoDateOnly(settings.customRangeStart);
      let anchorEnd = parseIsoDateOnly(settings.customRangeEnd);
      if (anchorStart > anchorEnd) {
        [anchorStart, anchorEnd] = [anchorEnd, anchorStart];
      }
      const lengthDays = Math.max(1, daysBetween(anchorStart, anchorEnd) + 1);
      const diffDays = daysBetween(anchorStart, date);
      const periodIndex = Math.floor(diffDays / lengthDays);
      start = addDays(anchorStart, periodIndex * lengthDays);
      end = addDays(start, lengthDays - 1);
      break;
    }
    default: {
      start = makeDate(y, m, 1);
      end = makeDate(y, m, daysInMonth(y, m));
    }
  }

  return {
    start,
    end: endOfDay(end),
    identifier: `${isoDate(start)}_${isoDate(end)}`,
    label: buildLabel(start, end),
  };
}

/**
 * If trackingStart falls inside range (i.e. this is the very first period the
 * user ever tracks), clips the period's start forward to trackingStart so a
 * user who starts mid-cycle sees "today – natural end" instead of a range
 * that includes days before they installed the app. Every later period is
 * untouched because trackingStart no longer falls after their start.
 */
export function clipRangeToTrackingStart(
  range: CycleRange,
  trackingStart: Date | null
): CycleRange {
  if (!trackingStart) return range;
  if (trackingStart > range.start && trackingStart <= range.end) {
    return {
      start: trackingStart,
      end: range.end,
      identifier: `${isoDate(trackingStart)}_${isoDate(range.end)}`,
      label: buildLabel(trackingStart, range.end),
    };
  }
  return range;
}

export function getCurrentCycleRange(
  settings: CycleSettings,
  trackingStart: Date | null = null
): CycleRange {
  const range = getCycleRangeForDate(new Date(), settings);
  return clipRangeToTrackingStart(range, trackingStart);
}

/** Parses a cycleIdentifier ("yyyy-MM-dd_yyyy-MM-dd") back into a display range. */
export function parseCycleIdentifier(identifier: string): CycleRange {
  const [startStr, endStr] = identifier.split('_');
  const [sy, sm, sd] = startStr.split('-').map(Number);
  const [ey, em, ed] = endStr.split('-').map(Number);
  const start = makeDate(sy, sm - 1, sd);
  const end = endOfDay(makeDate(ey, em - 1, ed));
  return {
    start,
    end,
    identifier,
    label: buildLabel(start, end),
  };
}

export function formatTimeOfDay(date: Date): string {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${ampm}`;
}

export function formatFullDate(date: Date): string {
  return `${MONTH_ABBR[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatShortDate(date: Date): string {
  return shortLabel(date);
}

/** Parses a plain "yyyy-MM-dd" date-only string (as opposed to a full ISO timestamp) at local midnight. */
export function parseIsoDateOnly(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return makeDate(y, m - 1, d);
}

export function toIsoDateOnly(date: Date): string {
  return isoDate(date);
}
