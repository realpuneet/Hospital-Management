import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Mail, MessageCircle } from 'lucide-react';
import { get } from '../../lib/api.js';
import { Badge, Card } from '../../components/ui/Card.jsx';
import { Select } from '../../components/ui/Form.jsx';
import { CardSkeletons, Empty, ErrorState } from '../../components/ui/Feedback.jsx';
import { Pager } from '../../components/common/Pager.jsx';
import { dateTimeFull } from '../../lib/format.js';

const TONE = { sent: 'green', dry_run: 'blue', failed: 'red', queued: 'amber' };

export default function AdminLogs() {
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const params = { page, limit: 30, channel: channel || undefined, status: status || undefined };
  const q = useQuery({ queryKey: ['admin-logs', params], queryFn: () => get('/admin/notification-logs', params), placeholderData: keepPreviousData });
  const rows = q.data?.data || [];
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-900">Notification log</h1>
        <p className="text-sm text-ink-500">Every email / WhatsApp attempt. “Dry run” means no provider credentials are configured, so nothing left the server.</p>
      </div>
      <Card className="grid gap-3 p-4 sm:grid-cols-2">
        <Select label="Channel" value={channel} onChange={(e) => { setChannel(e.target.value); setPage(1); }}><option value="">All</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option></Select>
        <Select label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All</option><option value="sent">Sent</option><option value="failed">Failed</option><option value="dry_run">Dry run</option><option value="queued">Queued</option></Select>
      </Card>
      {q.isLoading && <CardSkeletons count={6} className="h-14" />}
      {q.isError && <ErrorState error={q.error} onRetry={q.refetch} />}
      {!q.isLoading && !q.isError && rows.length === 0 && <Empty title="No notifications yet" />}
      <div className="space-y-2">
        {rows.map((l) => (
          <Card key={l._id} className="flex items-start gap-3 p-3.5">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">{l.channel === 'email' ? <Mail className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}</span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-900">{l.type}<Badge tone={TONE[l.status] || 'gray'}>{l.status.replace('_', ' ')}</Badge></p>
              <p className="truncate text-xs text-ink-500">{l.user?.name || '—'} · {l.to} · {l.provider || '—'} · {dateTimeFull(l.createdAt)}</p>
              {l.error && <p className="mt-1 text-xs text-red-600">{l.error}</p>}
            </div>
          </Card>
        ))}
      </div>
      <Pager meta={q.data?.meta} onPage={setPage} />
    </div>
  );
}
