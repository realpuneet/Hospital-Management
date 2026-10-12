import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, CheckCircle2, Clock, Stethoscope, Star, Users, Video, Building2 } from 'lucide-react';
import { get } from '../../lib/api.js';
import { useAuth } from '../../lib/authStore.js';
import { Avatar, Card, SectionTitle, Stat } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ErrorState, Skeleton } from '../../components/ui/Feedback.jsx';
import { dateTime, prettyDate, untilLabel } from '../../lib/format.js';

export default function DoctorDashboard() {
  const user = useAuth((s) => s.user);
  const q = useQuery({ queryKey: ['doctor-dashboard'], queryFn: () => get('/doctor/dashboard'), refetchInterval: 60_000 });
  if (q.isLoading) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}</div>;
  if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const d = q.data.data;
  const t = d.today || {};
  const waiting = (t.booked || 0) + (t.checked_in || 0);
  const week = d.week || [];
  const max = Math.max(1, ...week.map((w) => w.count));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-900">Good day, Dr. {user.name.split(' ')[0]}</h1>
        <p className="text-sm text-ink-500">Here's your clinic at a glance.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Waiting today" value={waiting} icon={Clock} tone="amber" />
        <Stat label="In consultation" value={t.in_consultation || 0} icon={Stethoscope} tone="blue" />
        <Stat label="Completed today" value={t.completed || 0} icon={CheckCircle2} tone="green" />
        <Stat label="Patients treated" value={d.totalPatients} icon={Users} hint={d.rating?.count ? `★ ${d.rating.avg.toFixed(1)} (${d.rating.count})` : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="p-5">
          <SectionTitle title="Next patient" />
          {d.next ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={d.next.patient?.name} size={56} />
                <div>
                  <p className="font-display text-lg font-bold text-ink-900">{d.next.patient?.name}</p>
                  <p className="flex items-center gap-1.5 text-sm text-ink-500">{d.next.mode === 'video' ? <Video className="h-4 w-4 text-sky-600" /> : <Building2 className="h-4 w-4 text-brand-600" />}{dateTime(d.next.startAt)} · <b className="text-brand-600">{untilLabel(d.next.startAt)}</b></p>
                  {d.next.reason && <p className="mt-0.5 line-clamp-1 text-sm text-ink-600">“{d.next.reason}”</p>}
                </div>
              </div>
              <Button to={`/doctor/consult/${d.next._id}`}>Open consult</Button>
            </div>
          ) : <p className="text-sm text-ink-500">No upcoming appointments right now.</p>}
        </Card>
        <Card className="p-5">
          <SectionTitle title="Last 7 days" subtitle="Completed consultations" />
          <div className="flex h-32 items-end gap-2" role="img" aria-label="Bar chart of completed consultations">
            {week.length === 0 && <p className="m-auto text-sm text-ink-400">No data yet</p>}
            {week.map((w) => (
              <div key={w.date} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-semibold text-ink-600">{w.count}</span>
                <div className="w-full rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-300" style={{ height: `${(w.count / max) * 80 + 6}px` }} />
                <span className="text-[10px] text-ink-400">{prettyDate(w.date).slice(0, 3)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button to="/doctor/appointments" variant="secondary"><CalendarCheck className="h-4 w-4" /> Today's queue</Button>
        <Button to="/doctor/schedule" variant="secondary"><Clock className="h-4 w-4" /> Manage timings</Button>
        <span className="hidden items-center gap-1 text-sm text-ink-500 sm:inline-flex"><Star className="h-4 w-4 text-amber-500" /> Keep your schedule updated for accurate booking</span>
      </div>
    </div>
  );
}
