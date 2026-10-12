import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Activity, CalendarCheck, IndianRupee, Package, Pill, Users, AlertTriangle } from 'lucide-react';
import { get } from '../../lib/api.js';
import { Badge, Card, SectionTitle, Stat } from '../../components/ui/Card.jsx';
import { ErrorState, Skeleton } from '../../components/ui/Feedback.jsx';
import { inr, num, prettyDate } from '../../lib/format.js';

const sum = (o = {}) => Object.values(o).reduce((a, b) => a + b, 0);

export default function AdminDashboard() {
  const q = useQuery({ queryKey: ['admin-dashboard'], queryFn: () => get('/admin/dashboard'), refetchInterval: 60_000 });
  if (q.isLoading) return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}</div>;
  if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const d = q.data.data;
  const t = d.today || {};
  const todayTotal = sum(t) - (t.cancelled || 0) - (t.expired || 0);
  const rev = d.revenue30d || {};
  const revTotal = (rev.appointment?.amount || 0) + (rev.medicine_order?.amount || 0);
  const trend = d.trend || [];
  const max = Math.max(1, ...trend.map((x) => x.appointments));
  const userTotal = sum(d.users);
  const channels = ['email', 'whatsapp'].map((c) => {
    const rows = (d.notifications30d || []).filter((n) => n.channel === c);
    const total = rows.reduce((a, b) => a + b.count, 0);
    const ok = rows.filter((r) => r.status === 'sent' || r.status === 'dry_run').reduce((a, b) => a + b.count, 0);
    const failed = rows.filter((r) => r.status === 'failed').reduce((a, b) => a + b.count, 0);
    return { c, total, ok, failed };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-900">Hospital overview</h1>
        <p className="text-sm text-ink-500">Live numbers — refreshes every minute.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Appointments today" value={num(todayTotal)} icon={CalendarCheck} hint={`${t.completed || 0} completed`} />
        <Stat label="Revenue (30 days)" value={inr(revTotal)} icon={IndianRupee} tone="green" hint={`Consults ${inr(rev.appointment?.amount || 0)}`} />
        <Stat label="Registered users" value={num(userTotal)} icon={Users} tone="blue" hint={`${d.users?.patient || 0} patients · ${d.users?.doctor || 0} doctors`} />
        <Stat label="New medicine orders" value={num(d.newOrders)} icon={Package} tone="amber" hint={`${d.orders?.out_for_delivery || 0} out for delivery`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <SectionTitle title="Appointments — last 14 days" subtitle="Confirmed, in-progress and completed" />
          <div className="flex h-40 items-end gap-1.5" role="img" aria-label="Appointments per day">
            {trend.length === 0 && <p className="m-auto text-sm text-ink-400">No data yet</p>}
            {trend.map((x) => (
              <div key={x.date} className="flex flex-1 flex-col items-center gap-1" title={`${prettyDate(x.date)}: ${x.appointments}`}>
                <span className="text-[10px] font-semibold text-ink-600">{x.appointments}</span>
                <div className="w-full rounded-t-md bg-gradient-to-t from-brand-600 to-brand-300" style={{ height: `${(x.appointments / max) * 100 + 4}px` }} />
                <span className="text-[10px] text-ink-400">{x.date.slice(8)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <SectionTitle title="Top doctors" subtitle="Completed consults, 30 days" />
          <ol className="space-y-3">
            {(d.topDoctors || []).length === 0 && <li className="text-sm text-ink-400">No completed consultations yet.</li>}
            {(d.topDoctors || []).map((doc, i) => (
              <li key={doc._id} className="flex items-center gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">{i + 1}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink-900">{doc.name}</p><p className="truncate text-xs text-ink-500">{doc.specialization}</p></div>
                <Badge tone="green">{doc.n}</Badge>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <SectionTitle title="Patient notifications (30 days)" subtitle="Email & WhatsApp are optional per patient" action={<Link to="/admin/logs" className="text-sm font-semibold text-brand-600">View log</Link>} />
          <div className="space-y-3">
            {channels.map((c) => (
              <div key={c.c}>
                <div className="mb-1 flex justify-between text-sm"><span className="font-semibold capitalize text-ink-800">{c.c}</span><span className="text-ink-500">{num(c.ok)} delivered{c.failed ? ` · ${c.failed} failed` : ''}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-ink-100"><div className="h-full rounded-full bg-brand-500" style={{ width: c.total ? `${(c.ok / c.total) * 100}%` : '0%' }} /></div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <SectionTitle title="Needs attention" />
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2.5"><span className="flex items-center gap-2 text-amber-800"><AlertTriangle className="h-4 w-4" /> Low-stock medicines</span><Link className="font-bold text-amber-800" to="/admin/medicines">{d.lowStock}</Link></li>
            <li className="flex items-center justify-between rounded-xl bg-sky-50 px-3 py-2.5"><span className="flex items-center gap-2 text-sky-800"><Pill className="h-4 w-4" /> Orders waiting for confirmation</span><Link className="font-bold text-sky-800" to="/admin/orders">{d.newOrders}</Link></li>
            <li className="flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2.5"><span className="flex items-center gap-2 text-brand-800"><Activity className="h-4 w-4" /> Patients waiting / in consult today</span><b className="text-brand-800">{(t.booked || 0) + (t.checked_in || 0) + (t.in_consultation || 0)}</b></li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
