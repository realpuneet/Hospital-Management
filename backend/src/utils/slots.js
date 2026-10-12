import { toMinutes, weekdayOf } from './helpers.js';

/** Working ranges of a doctor on a date for a mode, after weekly template + leaves. */
export function workingRanges(profile, date, mode) {
  const day = (profile.weekly || []).find((d) => d.day === weekdayOf(date));
  if (!day || !day.ranges?.length) return [];
  const modes = day.modes?.length ? day.modes : profile.modes;
  if (mode && !modes.includes(mode)) return [];
  if (mode && !profile.modes.includes(mode)) return [];

  const leave = (profile.leaves || []).find((l) => l.date === date);
  if (leave?.fullDay !== false && leave) return [];
  const ranges = day.ranges.map((r) => ({ start: r.start, end: r.end }));
  if (!leave) return ranges;

  // partial-day leave: subtract blocked ranges
  let out = ranges;
  for (const b of leave.ranges || []) {
    const bs = toMinutes(b.start);
    const be = toMinutes(b.end);
    out = out.flatMap((r) => {
      const rs = toMinutes(r.start);
      const re = toMinutes(r.end);
      if (be <= rs || bs >= re) return [r];
      const parts = [];
      if (bs > rs) parts.push({ start: r.start, end: b.start });
      if (be < re) parts.push({ start: b.end, end: r.end });
      return parts;
    });
  }
  return out;
}
