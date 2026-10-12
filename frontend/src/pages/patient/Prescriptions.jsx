import { FileText, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCursorList } from '../../hooks/useCursorList.js';
import { Card, Badge } from '../../components/ui/Card.jsx';
import { CardSkeletons, Empty, ErrorState } from '../../components/ui/Feedback.jsx';
import { LoadMore } from '../../components/common/LoadMore.jsx';
import { dateLong } from '../../lib/format.js';

export default function Prescriptions() {
  const q = useCursorList('prescriptions', '/prescriptions');
  return (
    <div className="container max-w-3xl py-6 sm:py-10">
      <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">My prescriptions</h1>
      <div className="mt-5 space-y-3">
        {q.isLoading && <CardSkeletons count={3} className="h-24" />}
        {q.isError && <ErrorState error={q.error} onRetry={q.refetch} />}
        {!q.isLoading && !q.isError && q.items.length === 0 && <Empty icon={FileText} title="No prescriptions yet" text="Prescriptions written by your doctor will appear here." />}
        {q.items.map((rx) => (
          <Link key={rx._id} to={`/prescriptions/${rx._id}`} className="block">
            <Card className="flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-pop">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600"><FileText className="h-6 w-6" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display font-bold text-ink-900">{rx.diagnosis || 'Prescription'}</p>
                <p className="text-sm text-ink-500">Dr. {rx.doctorUser?.name} · {dateLong(rx.issuedAt)}</p>
                <div className="mt-1.5 flex items-center gap-2"><Badge tone="brand">{rx.items.length} medicine{rx.items.length > 1 ? 's' : ''}</Badge><span className="text-xs text-ink-400">{rx.code}</span></div>
              </div>
              <ChevronRight className="h-5 w-5 text-ink-300" />
            </Card>
          </Link>
        ))}
        <LoadMore query={q} />
      </div>
    </div>
  );
}
