import { Link } from 'react-router-dom';
import { Building2, ChevronRight, Video } from 'lucide-react';
import { Avatar, Card, StatusBadge } from '../ui/Card.jsx';
import { dateTime, untilLabel } from '../../lib/format.js';

export function AppointmentCard({ a, to }) {
  const upcoming = ['booked', 'checked_in', 'pending_payment'].includes(a.status) && new Date(a.endAt) > new Date();
  return (
    <Link to={to || `/appointments/${a._id || a.id}`} className="block">
      <Card className="flex items-center gap-3.5 p-4 transition hover:-translate-y-0.5 hover:shadow-pop">
        <Avatar name={a.doctorUser?.name} src={a.doctorUser?.avatar} size={52} className="!rounded-2xl" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-display font-bold text-ink-900">Dr. {a.doctorUser?.name}</p>
            <StatusBadge status={a.status} />
          </div>
          <p className="truncate text-sm text-ink-500">{a.department?.name}{a.forMember?.name ? ` · for ${a.forMember.name}` : ''}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-ink-700">
            {a.mode === 'video' ? <Video className="h-4 w-4 text-sky-600" /> : <Building2 className="h-4 w-4 text-brand-600" />}
            {dateTime(a.startAt)}
            {upcoming && <span className="text-xs font-semibold text-brand-600">· {untilLabel(a.startAt)}</span>}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-ink-300" />
      </Card>
    </Link>
  );
}
