// src/core/calendar/calendar.model.ts — the official working-day calendar, maintained by administrators
// (FR-ADM-09, 06 §6.10). Only exceptions to the Monday–Friday week are stored: public holidays and make-up
// working days (调休上班) from the State Council General Office notice for each year.
import { Document, Schema, Types, model } from 'mongoose';
import { entityOptions, enumOf, i18nText, I18nText, int, ref, recordOptions } from '../db/schema-helpers';
import { WorkingCalendar } from './working-days';

export const CALENDAR_DAY_KINDS = ['holiday', 'makeup_workday'] as const;

export interface CalendarDayDoc extends Document {
  _id: string;                                     // 'YYYY-MM-DD' (Asia/Shanghai)
  year: number;
  kind: typeof CALENDAR_DAY_KINDS[number];
  name?: I18nText;                                 // e.g. { zh: '国庆节、中秋节' }
  createdBy: Types.ObjectId;
  createdAt: Date;
}

const CalendarDaySchema = new Schema<CalendarDayDoc>({
  _id: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  year: int({ required: true, min: 2000, max: 2100 }),
  kind: enumOf(CALENDAR_DAY_KINDS, { required: true }),
  name: i18nText,
  createdBy: ref('User', { required: true }),
}, recordOptions('calendar_days'));
CalendarDaySchema.index({ year: 1, _id: 1 });

export const CalendarDay = model<CalendarDayDoc>('CalendarDay', CalendarDaySchema);

/** A year is used by timers only after a second administrator has checked and published it (maker-checker). */
export interface CalendarYearDoc extends Document {
  _id: number;                                     // e.g. 2026
  status: 'draft' | 'published';
  source: string;                                  // notice number, e.g. 国办发明电〔2025〕x号
  preparedBy: Types.ObjectId;
  checkedBy?: Types.ObjectId;
  publishedAt?: Date;
  rev: number;
}

const CalendarYearSchema = new Schema<CalendarYearDoc>({
  _id: int({ required: true, min: 2000, max: 2100 }),
  status: enumOf(['draft', 'published'] as const, { required: true, default: 'draft' }),
  source: { type: String, required: true },
  preparedBy: ref('User', { required: true }),
  checkedBy: ref('User'),
  publishedAt: Date,
}, entityOptions('calendar_years'));

export const CalendarYear = model<CalendarYearDoc>('CalendarYear', CalendarYearSchema);

export class CalendarCheckError extends Error {
  constructor(m: string) { super(m); this.name = 'CalendarCheckError'; }
}

/** Publishes a prepared year. The checker must not be the person who entered the days. */
export async function publishCalendarYear(year: number, checkerUserId: Types.ObjectId, expectedRev: number): Promise<CalendarYearDoc> {
  const doc = await CalendarYear.findById(year).orFail();
  if (doc.rev !== expectedRev) throw new CalendarCheckError(`Calendar ${year} changed since it was read`);
  if (doc.status !== 'draft') throw new CalendarCheckError(`Calendar ${year} is already published`);
  if (String(doc.preparedBy) === String(checkerUserId)) throw new CalendarCheckError('The checker must be a different administrator');
  doc.set({ status: 'published', checkedBy: checkerUserId, publishedAt: new Date() });
  return doc.save();
}

/** Loads the published years (and their exceptions) that cover `years`; unpublished years stay missing. */
export async function loadWorkingCalendar(years: number[]): Promise<WorkingCalendar> {
  const wanted = Array.from(new Set(years));
  const published = await CalendarYear.find({ _id: { $in: wanted }, status: 'published' }).select('_id').lean();
  const publishedYears = published.map((y) => y._id as number);
  const days = await CalendarDay.find({ year: { $in: publishedYears } }).select('_id kind').lean();
  return {
    years: new Set(publishedYears),
    holidays: new Set(days.filter((d) => d.kind === 'holiday').map((d) => d._id as string)),
    makeupWorkdays: new Set(days.filter((d) => d.kind === 'makeup_workday').map((d) => d._id as string)),
  };
}

/** The calendar for deadlines that start now: this year and the next (a 30-WD period can cross New Year). */
export function loadCurrentCalendar(now = new Date()): Promise<WorkingCalendar> {
  const year = now.getUTCFullYear();
  return loadWorkingCalendar([year - 1, year, year + 1]);
}
