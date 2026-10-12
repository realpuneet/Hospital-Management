import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { Switch } from '../ui/Form.jsx';
import { cn } from '../../lib/cn.js';

const DAYS = [[1, 'Monday'], [2, 'Tuesday'], [3, 'Wednesday'], [4, 'Thursday'], [5, 'Friday'], [6, 'Saturday'], [0, 'Sunday']];

/** Editable weekly timings. value: [{day, ranges:[{start,end}]}] */
export function WeeklyEditor({ value = [], onChange, disabled }) {
  const byDay = Object.fromEntries(value.map((d) => [d.day, d]));
  const setDay = (day, ranges) => {
    const rest = value.filter((d) => d.day !== day);
    onChange(ranges === null ? rest : [...rest, { ...(byDay[day] || {}), day, ranges }].sort((a, b) => a.day - b.day));
  };
  return (
    <div className="divide-y divide-ink-100">
      {DAYS.map(([day, label]) => {
        const d = byDay[day];
        const on = !!d;
        return (
          <div key={day} className="py-3">
            <div className="flex items-center justify-between">
              <span className={cn('font-semibold', on ? 'text-ink-900' : 'text-ink-400')}>{label}</span>
              <Switch checked={on} disabled={disabled} onChange={(v) => setDay(day, v ? [{ start: '09:00', end: '13:00' }] : null)} label={<span className="sr-only">{label} working</span>} />
            </div>
            {on && (
              <div className="mt-1 space-y-2">
                {d.ranges.map((r, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <input type="time" aria-label={`${label} start`} className="h-10 rounded-xl border border-ink-200 bg-white px-3 text-sm" value={r.start} disabled={disabled} onChange={(e) => setDay(day, d.ranges.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} />
                    <span className="text-ink-400">to</span>
                    <input type="time" aria-label={`${label} end`} className="h-10 rounded-xl border border-ink-200 bg-white px-3 text-sm" value={r.end} disabled={disabled} onChange={(e) => setDay(day, d.ranges.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))} />
                    {!disabled && <button type="button" aria-label="Remove time block" className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600" onClick={() => setDay(day, d.ranges.length > 1 ? d.ranges.filter((_, j) => j !== i) : null)}><Trash2 className="h-4 w-4" /></button>}
                    {r.start >= r.end && <span className="text-xs font-semibold text-red-600">End must be after start</span>}
                  </div>
                ))}
                {!disabled && d.ranges.length < 4 && <Button type="button" size="sm" variant="soft" onClick={() => setDay(day, [...d.ranges, { start: '17:00', end: '20:00' }])}><Plus className="h-4 w-4" /> Add time block</Button>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export const weeklyValid = (weekly) => weekly.every((d) => d.ranges.every((r) => r.start && r.end && r.start < r.end));
