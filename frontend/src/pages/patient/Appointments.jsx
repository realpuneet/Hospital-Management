import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarPlus } from 'lucide-react';
import { get } from '../../lib/api.js';
import { useCursorList } from '../../hooks/useCursorList.js';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { CardSkeletons, Empty, ErrorState } from '../../components/ui/Feedback.jsx';
import { AppointmentCard } from '../../components/common/AppointmentCard.jsx';
import { LoadMore } from '../../components/common/LoadMore.jsx';

export default function Appointments() {
  const [tab, setTab] = useState('upcoming');
  const upcoming = useQuery({ queryKey: ['appointments', 'upcoming'], queryFn: () => get('/appointments', { tab: 'upcoming' }), enabled: tab === 'upcoming' });
  const past = useCursorList('appointments-past', '/appointments', { tab: 'past' }, { enabled: tab === 'past' });

  const q = tab === 'upcoming' ? upcoming : past;
  const items = tab === 'upcoming' ? upcoming.data?.data || [] : past.items;

  return (
    <div className="container max-w-3xl py-6 sm:py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">My appointments</h1>
        <Button to="/doctors" size="sm"><CalendarPlus className="h-4 w-4" /> Book</Button>
      </div>
      <Tabs className="mt-4" value={tab} onChange={setTab} tabs={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past' }]} />
      <div className="mt-5 space-y-3">
        {q.isLoading && <CardSkeletons count={3} className="h-24" />}
        {q.isError && <ErrorState error={q.error} onRetry={q.refetch} />}
        {!q.isLoading && !q.isError && items.length === 0 && (
          <Empty icon={CalendarPlus} title={tab === 'upcoming' ? 'No upcoming appointments' : 'No past appointments'} text="Find a doctor and book a slot in a few taps." action={<Button to="/doctors">Find a doctor</Button>} />
        )}
        {items.map((a) => <AppointmentCard key={a._id} a={a} />)}
        {tab === 'past' && <LoadMore query={past} />}
      </div>
    </div>
  );
}
