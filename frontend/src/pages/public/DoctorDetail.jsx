import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Award, Building2, Clock, Languages, Star, Video } from 'lucide-react';
import { get } from '../../lib/api.js';
import { Avatar, Badge, Card, SectionTitle } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ErrorState, Skeleton } from '../../components/ui/Feedback.jsx';
import { inr, to12h } from '../../lib/format.js';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function DoctorDetail() {
  const { id } = useParams();
  const q = useQuery({ queryKey: ['doctor', id], queryFn: () => get(`/doctors/${id}`) });
  if (q.isLoading) return <div className="container space-y-4 py-8"><Skeleton className="h-40" /><Skeleton className="h-64" /></div>;
  if (q.isError) return <div className="container py-8"><ErrorState error={q.error} onRetry={q.refetch} /></div>;
  const d = q.data.data;
  const weekly = [1, 2, 3, 4, 5, 6, 0].map((day) => ({ day, ...(d.weekly.find((w) => w.day === day) || { ranges: [] }) }));

  return (
    <div className="container py-6 sm:py-10">
      <Card className="p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row">
          <Avatar name={d.name} src={d.avatar} size={104} className="!rounded-3xl" />
          <div className="flex-1">
            <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">Dr. {d.name}</h1>
            <p className="text-ink-600">{d.specialization} · {d.department?.name}</p>
            <p className="mt-1 text-sm text-ink-500">{d.qualifications?.join(', ')}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              {d.rating?.count > 0 && <Badge tone="amber"><Star className="h-3 w-3 fill-amber-400" /> {d.rating.avg.toFixed(1)} · {d.rating.count} reviews</Badge>}
              <Badge tone="gray"><Award className="h-3 w-3" /> {d.experienceYears} years</Badge>
              {d.languages?.length > 0 && <Badge tone="gray"><Languages className="h-3 w-3" /> {d.languages.join(', ')}</Badge>}
              {d.registrationNo && <Badge tone="green">Reg. {d.registrationNo}</Badge>}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:w-56">
            {d.modes.includes('in_person') && <div className="flex items-center justify-between rounded-xl bg-brand-50 px-3.5 py-2.5 text-sm"><span className="flex items-center gap-2 font-semibold text-brand-800"><Building2 className="h-4 w-4" /> Clinic</span><b>{inr(d.fees.in_person)}</b></div>}
            {d.modes.includes('video') && <div className="flex items-center justify-between rounded-xl bg-sky-50 px-3.5 py-2.5 text-sm"><span className="flex items-center gap-2 font-semibold text-sky-800"><Video className="h-4 w-4" /> Video</span><b>{inr(d.fees.video)}</b></div>}
            <Button to={`/book/${d._id}`} size="lg" disabled={!d.isAcceptingBookings}>{d.isAcceptingBookings ? 'Book appointment' : 'Not accepting bookings'}</Button>
          </div>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {d.bio && <Card className="p-5"><SectionTitle title="About" /><p className="text-ink-600">{d.bio}</p></Card>}
          {d.conditionsTreated?.length > 0 && (
            <Card className="p-5"><SectionTitle title="Treats" /><div className="flex flex-wrap gap-2">{d.conditionsTreated.map((c) => <Badge key={c} tone="brand">{c}</Badge>)}</div></Card>
          )}
        </div>
        <Card className="h-fit p-5">
          <SectionTitle title="Consulting hours" subtitle={d.room ? `Room: ${d.room}` : undefined} />
          <ul className="divide-y divide-ink-100">
            {weekly.map((w) => (
              <li key={w.day} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                <span className="font-medium text-ink-700">{DAYS[w.day]}</span>
                <span className="text-right text-ink-600">
                  {w.ranges.length ? w.ranges.map((r) => <span key={r.start} className="block"><Clock className="mr-1 inline h-3 w-3 text-ink-400" />{to12h(r.start)} – {to12h(r.end)}</span>) : <span className="text-ink-400">Off</span>}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
