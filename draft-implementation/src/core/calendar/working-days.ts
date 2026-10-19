// src/core/calendar/working-days.ts — working-day (WD) arithmetic on the official China calendar (06 §6.10).
// Pure functions: the caller loads a WorkingCalendar from `calendar_days` / `calendar_years` (calendar.model.ts).
//
// Rules (PRC Civil Code Art. 201 and 203):
// - the day on which a period starts is not counted; counting starts on the next day;
// - a deadline ends at 24:00 (Asia/Shanghai) of its last day, or at the close of business where one applies;
// - when the last day of a calendar-day period is not a working day, the period ends on the next working day.
// Weekends are rest days unless the State Council notice makes them make-up working days (调休上班).
// A year that is not published in the calendar is never guessed: CalendarMissingError.

export interface WorkingCalendar {
  holidays: Set<string>;          // 'YYYY-MM-DD' rest days on Monday–Friday (and holiday weekend days)
  makeupWorkdays: Set<string>;    // 'YYYY-MM-DD' Saturdays or Sundays that are working days
  years: Set<number>;             // years whose calendar has been checked and published
}

export interface DeadlineOptions {
  cutoffMinutes?: number;         // minutes after local midnight at which the last day ends; default 24:00
}

export class CalendarMissingError extends Error {
  constructor(public readonly year: number) {
    super(`Working-day calendar for ${year} is not published`);
    this.name = 'CalendarMissingError';
  }
}

const SHANGHAI_OFFSET_MS = 8 * 3600 * 1000;      // Asia/Shanghai is UTC+8 all year (no daylight saving)
const DAY_MS = 24 * 3600 * 1000;

/** Local calendar date of an instant in Asia/Shanghai, as 'YYYY-MM-DD'. */
export function localDate(instant: Date): string {
  return new Date(instant.getTime() + SHANGHAI_OFFSET_MS).toISOString().slice(0, 10);
}

/** The instant at which a local date ends (cutoffMinutes after its local midnight). */
export function endOfLocalDay(day: string, options: DeadlineOptions = {}): Date {
  const cutoff = options.cutoffMinutes == null ? 24 * 60 : options.cutoffMinutes;
  return new Date(Date.parse(day + 'T00:00:00Z') - SHANGHAI_OFFSET_MS + cutoff * 60 * 1000);
}

function nextDay(day: string): string {
  return new Date(Date.parse(day + 'T00:00:00Z') + DAY_MS).toISOString().slice(0, 10);
}

export function isWorkingDay(calendar: WorkingCalendar, day: string): boolean {
  const year = Number(day.slice(0, 4));
  if (!calendar.years.has(year)) throw new CalendarMissingError(year);
  if (calendar.makeupWorkdays.has(day)) return true;
  if (calendar.holidays.has(day)) return false;
  const weekday = new Date(day + 'T00:00:00Z').getUTCDay();   // 0 = Sunday, 6 = Saturday
  return weekday !== 0 && weekday !== 6;
}

/**
 * Deadline `n` working days after `start` (n ≥ 1): the end of the n-th working day after the local date of
 * `start`. Used for maximum periods ("review within 3 WD") and minimum periods ("disclose for at least 5 WD":
 * the earliest moment the period is complete).
 */
export function addWorkingDays(calendar: WorkingCalendar, start: Date, n: number, options: DeadlineOptions = {}): Date {
  if (!Number.isInteger(n) || n < 1) throw new RangeError('n must be a positive integer');
  let day = localDate(start);
  let counted = 0;
  while (counted < n) {
    day = nextDay(day);
    if (isWorkingDay(calendar, day)) counted++;
  }
  return endOfLocalDay(day, options);
}

/**
 * Deadline `n` calendar days after `start` (e.g. a public notice of at least 15 days). With
 * `extendIfRestDay` (the default, Civil Code Art. 203) a last day that is not a working day moves to the
 * next working day.
 */
export function addCalendarDays(
  calendar: WorkingCalendar, start: Date, n: number, options: DeadlineOptions & { extendIfRestDay?: boolean } = {},
): Date {
  if (!Number.isInteger(n) || n < 1) throw new RangeError('n must be a positive integer');
  let day = localDate(start);
  for (let i = 0; i < n; i++) day = nextDay(day);
  if (options.extendIfRestDay !== false) {
    while (!isWorkingDay(calendar, day)) day = nextDay(day);
  }
  return endOfLocalDay(day, options);
}

/**
 * Working days d with localDate(from) < d ≤ localDate(to): how far an SLA clock moves after a pause.
 * A pause that starts and ends on the same day counts 0.
 */
export function workingDaysBetween(calendar: WorkingCalendar, from: Date, to: Date): number {
  const last = localDate(to);
  let day = localDate(from);
  let count = 0;
  while (day < last) {
    day = nextDay(day);
    if (isWorkingDay(calendar, day)) count++;
  }
  return count;
}

/** Moves a deadline (the end of a working day) by `n` further working days; n = 0 returns it unchanged. */
export function extendByWorkingDays(calendar: WorkingCalendar, deadline: Date, n: number, options: DeadlineOptions = {}): Date {
  if (n === 0) return deadline;
  return addWorkingDays(calendar, new Date(deadline.getTime() - 1), n, options);
}
