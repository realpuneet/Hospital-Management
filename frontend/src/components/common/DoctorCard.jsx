import { Link } from 'react-router-dom';
import { Star, Video, Building2, BadgeCheck } from 'lucide-react';
import { Avatar, Badge, Card } from '../ui/Card.jsx';
import { Button } from '../ui/Button.jsx';
import { inr } from '../../lib/format.js';

export function DoctorCard({ doctor: d }) {
  return (
    <Card className="flex h-full flex-col p-4 transition hover:-translate-y-0.5 hover:shadow-pop">
      <div className="flex gap-3.5">
        <Avatar name={d.name} src={d.avatar} size={64} className="!rounded-2xl" />
        <div className="min-w-0 flex-1">
          <Link to={`/doctors/${d.slug || d._id}`} className="block truncate font-display text-[17px] font-bold text-ink-900 hover:text-brand-700">Dr. {d.name}</Link>
          <p className="truncate text-sm text-ink-500">{d.specialization || d.department?.name}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ink-600">
            {d.rating?.count > 0 && <span className="inline-flex items-center gap-1 font-semibold text-amber-600"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{d.rating.avg.toFixed(1)} <span className="font-normal text-ink-400">({d.rating.count})</span></span>}
            <span>{d.experienceYears} yrs exp.</span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {d.modes?.includes('in_person') && <Badge tone="brand"><Building2 className="h-3 w-3" /> Clinic {inr(d.fees?.in_person)}</Badge>}
        {d.modes?.includes('video') && <Badge tone="blue"><Video className="h-3 w-3" /> Video {inr(d.fees?.video)}</Badge>}
        {d.isAcceptingBookings === false && <Badge tone="amber">Not accepting</Badge>}
      </div>
      {d.conditionsTreated?.length > 0 && <p className="mt-3 line-clamp-1 text-xs text-ink-500"><BadgeCheck className="mr-1 inline h-3.5 w-3.5 text-brand-500" />{d.conditionsTreated.slice(0, 3).join(' · ')}</p>}
      <div className="mt-auto flex gap-2 pt-4">
        <Button to={`/doctors/${d.slug || d._id}`} variant="secondary" size="sm" className="flex-1">Profile</Button>
        <Button to={`/book/${d._id}`} size="sm" className="flex-1" disabled={d.isAcceptingBookings === false}>Book</Button>
      </div>
    </Card>
  );
}
