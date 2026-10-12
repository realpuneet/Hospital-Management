import { Link } from 'react-router-dom';
import { ChevronRight, Package } from 'lucide-react';
import { useCursorList } from '../../hooks/useCursorList.js';
import { Card, StatusBadge } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { CardSkeletons, Empty, ErrorState } from '../../components/ui/Feedback.jsx';
import { LoadMore } from '../../components/common/LoadMore.jsx';
import { dateTimeFull, inr } from '../../lib/format.js';

export default function Orders() {
  const q = useCursorList('orders', '/orders');
  return (
    <div className="container max-w-3xl py-6 sm:py-10">
      <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">My orders</h1>
      <div className="mt-5 space-y-3">
        {q.isLoading && <CardSkeletons count={3} className="h-24" />}
        {q.isError && <ErrorState error={q.error} onRetry={q.refetch} />}
        {!q.isLoading && !q.isError && q.items.length === 0 && <Empty icon={Package} title="No orders yet" text="Medicines you order are delivered to your door." action={<Button to="/pharmacy">Browse pharmacy</Button>} />}
        {q.items.map((o) => (
          <Link key={o._id} to={`/orders/${o._id}`} className="block">
            <Card className="flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-pop">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Package className="h-6 w-6" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2"><p className="font-display font-bold text-ink-900">{o.code}</p><StatusBadge status={o.status} /></div>
                <p className="truncate text-sm text-ink-500">{o.items.map((i) => `${i.name} ×${i.qty}`).join(', ')}</p>
                <p className="mt-0.5 text-xs text-ink-400">{dateTimeFull(o.createdAt)} · <b className="text-ink-700">{inr(o.total)}</b></p>
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
