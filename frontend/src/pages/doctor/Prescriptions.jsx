import { Link } from 'react-router-dom';
import { ChevronRight, FileText } from 'lucide-react';
import { useCursorList } from '../../hooks/useCursorList.js';
import { Badge, Card } from '../../components/ui/Card.jsx';
import { CardSkeletons, Empty, ErrorState } from '../../components/ui/Feedback.jsx';
import { LoadMore } from '../../components/common/LoadMore.jsx';
import { dateLong } from '../../lib/format.js';

export default function DoctorPrescriptions() {
  const q = useCursorList('doctor-prescriptions', '/doctor/prescriptions');
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-display text-2xl font-extrabold text-ink-900">Issued prescriptions</h1>
      {q.isLoading && <CardSkeletons count={3} className="h-20" />}
      {q.isError && <ErrorState error={q.error} onRetry={q.refetch} />}
      {!q.isLoading && !q.isError && q.items.length === 0 && <Empty icon={FileText} title="Nothing issued yet" text="Prescriptions you write during consultations appear here." />}
      {q.items.map((rx) => (
        <Link key={rx._id} to={`/doctor/prescriptions/${rx._id}`} className="block">
          <Card className="flex items-center gap-4 p-4 transition hover:shadow-pop">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-600"><FileText className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1"><p className="truncate font-semibold text-ink-900">{rx.forMemberName || rx.patient?.name} — {rx.diagnosis || 'Prescription'}</p><p className="text-sm text-ink-500">{rx.code} · {dateLong(rx.issuedAt)}</p></div>
            <Badge tone="brand">{rx.items.length} meds</Badge><ChevronRight className="h-5 w-5 text-ink-300" />
          </Card>
        </Link>
      ))}
      <LoadMore query={q} />
    </div>
  );
}
