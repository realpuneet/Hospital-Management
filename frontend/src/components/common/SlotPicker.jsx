import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { get } from '../../lib/api.js';
import { cn } from '../../lib/cn.js';
import { dayNum, monthShort, to12h, weekdayName } from '../../lib/format.js';
import { Skeleton, ErrorState } from '../ui/Feedback.jsx';
import { useSocketEvent, useSocketWatch } from '../../hooks/useSocketEvent.js';
import { CalendarX2 } from 'lucide-react';

/**
 * Date strip + time slot grid for one doctor. Slots refresh live when somebody else books
 * (socket `slots:changed`) so users rarely hit a "slot just taken" error.
 */
export function SlotPicker({ doctorId, mode, value, onChange, excludeStartAt }) {
  const qc = useQueryClient();
  const strip = useRef(null);

  const cal = useQuery({
    queryKey: ['slots-cal', doctorId, mode],
    queryFn: () => get(`/doctors/${doctorId}/slots`, { mode, days: 21 }),
    staleTime: 20_000,
  });
  const days = cal.data?.data.days || [];
  const date = value?.date;

  // default to the first day with availability
  useEffect(() => {
    if (!date && days.length) {
      const first = days.find((d) => d.available > 0);
      if (first) onChange({ date: first.date, time: null });
    }
  }, [days, date, onChange]);

  const slots = useQuery({
    queryKey: ['slots-day', doctorId, mode, date],
    queryFn: () => get(`/doctors/${doctorId}/slots`, { mode, date }),
    enabled: !!date,
    staleTime: 10_000,
  });

  useSocketWatch('slots:watch', 'slots:unwatch', doctorId);
  useSocketEvent('slots:changed', (p) => {
    if (p.doctorId !== doctorId) return;
    qc.invalidateQueries({ queryKey: ['slots-cal', doctorId] });
    qc.invalidateQueries({ queryKey: ['slots-day', doctorId] });
  });

  // keep the selected chip in view on mobile
  useEffect(() => {
    strip.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [date, days.length]);

  const groups = useMemo(() => {
    const list = slots.data?.data.slots || [];
    const g = { Morning: [], Afternoon: [], Evening: [] };
    list.forEach((s) => {
      const h = Number(s.time.slice(0, 2));
      (h < 12 ? g.Morning : h < 17 ? g.Afternoon : g.Evening).push(s);
    });
    return Object.entries(g).filter(([, v]) => v.length);
  }, [slots.data]);

  if (cal.isError) return <ErrorState error={cal.error} onRetry={cal.refetch} />;
  if (cal.isLoading) return <Skeleton className="h-52" />;

  return (
    <div>
      <div ref={strip} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2" role="listbox" aria-label="Choose a date">
        {days.map((d) => {
          const active = d.date === date;
          const off = d.total === 0 || d.available === 0;
          return (
            <button
              key={d.date}
              type="button"
              aria-pressed={active}
              disabled={off}
              onClick={() => onChange({ date: d.date, time: null })}
              className={cn('flex w-16 shrink-0 flex-col items-center rounded-2xl border px-2 py-2.5 transition',
                active ? 'border-brand-600 bg-brand-600 text-white shadow-md' : off ? 'cursor-not-allowed border-ink-100 bg-ink-50 text-ink-300' : 'border-ink-200 bg-white text-ink-700 hover:border-brand-400')}
            >
              <span className="text-[11px] font-semibold uppercase">{weekdayName(d.date)}</span>
              <span className="font-display text-xl font-extrabold leading-tight">{dayNum(d.date)}</span>
              <span className="text-[10px]">{monthShort(d.date)}</span>
              <span className={cn('mt-0.5 text-[10px] font-semibold', active ? 'text-brand-100' : off ? '' : 'text-emerald-600')}>{off ? 'Full' : `${d.available} left`}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 min-h-[8rem]">
        {slots.isLoading && <Skeleton className="h-32" />}
        {slots.isError && <ErrorState error={slots.error} onRetry={slots.refetch} />}
        {slots.data && groups.length === 0 && (
          <div className="flex flex-col items-center py-8 text-center text-ink-500"><CalendarX2 className="mb-2 h-8 w-8" />No slots on this day</div>
        )}
        {groups.map(([label, list]) => (
          <div key={label} className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">{label}</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {list.map((s) => {
                const same = excludeStartAt && new Date(excludeStartAt).getTime() === new Date(s.startAt).getTime();
                const selected = value?.time === s.time;
                return (
                  <button
                    key={s.time}
                    type="button"
                    disabled={!s.available || same}
                    aria-pressed={selected}
                    onClick={() => onChange({ date, time: s.time })}
                    className={cn('rounded-xl border py-2.5 text-sm font-semibold transition',
                      selected ? 'border-brand-600 bg-brand-600 text-white shadow-md' : s.available && !same ? 'border-ink-200 bg-white text-ink-800 hover:border-brand-400 hover:bg-brand-50' : 'cursor-not-allowed border-transparent bg-ink-50 text-ink-300 line-through')}
                  >
                    {to12h(s.time)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
