import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bike, Check, FileText, X } from 'lucide-react';
import { get, patch, post } from '../../lib/api.js';
import { Badge, Card, StatusBadge } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Select, Textarea } from '../../components/ui/Form.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { CardSkeletons, Empty, ErrorState, errMsg, toast } from '../../components/ui/Feedback.jsx';
import { Modal } from '../../components/ui/Overlay.jsx';
import { Pager } from '../../components/common/Pager.jsx';
import { dateTime, inr } from '../../lib/format.js';

const TABS = [
  { value: 'placed', label: 'New' }, { value: 'confirmed', label: 'Confirmed' }, { value: 'packed', label: 'Packed' },
  { value: 'out_for_delivery', label: 'On the way' }, { value: 'delivered', label: 'Delivered' }, { value: '', label: 'All' },
];
// next forward step per status (mirrors ORDER_TRANSITIONS on the server)
const NEXT = { placed: ['confirmed', 'Confirm order'], confirmed: ['packed', 'Mark packed'], packed: ['out_for_delivery', 'Send out'] };

/** Pharmacy order queue — used by admin (/admin/orders) and pharmacist (/pharmacist). */
export default function OrderQueue() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('placed');
  const [page, setPage] = useState(1);
  const [reject, setReject] = useState(null);
  const [note, setNote] = useState('');
  const [assign, setAssign] = useState(null);
  const [riderId, setRiderId] = useState('');
  const params = { page, limit: 15, status: status || undefined };
  const q = useQuery({ queryKey: ['pharmacy-orders', params], queryFn: () => get('/pharmacy/orders', params), placeholderData: keepPreviousData, refetchInterval: 30_000 });
  const riders = useQuery({ queryKey: ['pharmacy-riders'], queryFn: () => get('/pharmacy/riders'), enabled: !!assign });
  const refresh = () => qc.invalidateQueries({ queryKey: ['pharmacy-orders'] });

  const move = useMutation({
    mutationFn: ({ id, to, note: n }) => patch(`/pharmacy/orders/${id}/status`, { status: to, note: n || undefined }),
    onSuccess: () => { setReject(null); setNote(''); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const doAssign = useMutation({
    mutationFn: () => post(`/pharmacy/orders/${assign._id}/assign-rider`, { riderId: riderId || undefined }),
    onSuccess: () => { toast.success('Rider assigned'); setAssign(null); setRiderId(''); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const rows = q.data?.data || [];

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-extrabold text-ink-900">Medicine orders</h1>
      <Tabs tabs={TABS} value={status} onChange={(v) => { setStatus(v); setPage(1); }} />
      {q.isLoading && <CardSkeletons count={4} className="h-32" />}
      {q.isError && <ErrorState error={q.error} onRetry={q.refetch} />}
      {!q.isLoading && !q.isError && rows.length === 0 && <Empty title="No orders here" text="New orders appear instantly." />}
      <div className="space-y-3">
        {rows.map((o) => {
          const next = NEXT[o.status];
          const needsRider = ['confirmed', 'packed'].includes(o.status);
          return (
            <Card key={o._id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-ink-500">{o.code}</span><StatusBadge status={o.status} />
                {o.payMethod === 'cod' ? <Badge tone="amber">COD</Badge> : <Badge tone="green">{o.paymentStatus === 'paid' ? 'Paid' : 'Online'}</Badge>}
                {o.prescription && <Badge tone="brand"><FileText className="h-3 w-3" /> Rx linked</Badge>}
                <span className="ml-auto text-sm font-bold text-ink-900">{inr(o.total)}</span>
              </div>
              <div className="text-sm text-ink-600">
                <p className="font-semibold text-ink-900">{o.patient?.name} · {o.address?.phone || o.patient?.phone}</p>
                <p>{[o.address?.line1, o.address?.line2, o.address?.city, o.address?.pincode].filter(Boolean).join(', ')}</p>
                <p className="text-xs text-ink-400">{dateTime(o.createdAt)}</p>
              </div>
              <ul className="rounded-xl bg-ink-50 p-3 text-sm">
                {o.items.map((it, i) => <li key={i} className="flex justify-between"><span>{it.name}{it.requiresPrescription && <b className="ml-1 text-coral-600">Rx</b>}</span><span className="text-ink-500">× {it.qty}</span></li>)}
              </ul>
              {o.note && <p className="text-sm text-ink-600">Note: {o.note}</p>}
              {o.rider && <p className="flex items-center gap-1.5 text-sm text-ink-600"><Bike className="h-4 w-4 text-brand-600" /> {o.rider.name} · {o.rider.phone}</p>}
              <div className="flex flex-wrap gap-2">
                {next && <Button size="sm" loading={move.isPending && move.variables?.id === o._id} onClick={() => move.mutate({ id: o._id, to: next[0] })}><Check className="h-4 w-4" /> {next[1]}</Button>}
                {needsRider && <Button size="sm" variant="secondary" onClick={() => { setAssign(o); setRiderId(o.rider?._id || ''); }}><Bike className="h-4 w-4" /> {o.rider ? 'Change rider' : 'Assign rider'}</Button>}
                {['placed', 'confirmed'].includes(o.status) && <Button size="sm" variant="secondary" className="text-red-600" onClick={() => setReject(o)}><X className="h-4 w-4" /> Reject</Button>}
              </div>
            </Card>
          );
        })}
      </div>
      <Pager meta={q.data?.meta} onPage={setPage} />

      <Modal open={!!reject} onClose={() => setReject(null)} size="sm" title="Reject order" footer={<Button variant="danger" className="w-full" loading={move.isPending} onClick={() => move.mutate({ id: reject._id, to: 'rejected', note })}>Reject & refund</Button>}>
        <Textarea label="Reason (shown to patient)" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </Modal>
      <Modal open={!!assign} onClose={() => setAssign(null)} size="sm" title="Assign delivery rider" footer={<Button className="w-full" loading={doAssign.isPending} onClick={() => doAssign.mutate()}>{riderId ? 'Assign selected rider' : 'Auto-assign nearest'}</Button>}>
        <Select label="Rider" value={riderId} onChange={(e) => setRiderId(e.target.value)} hint="Leave on auto to pick the least-loaded online rider.">
          <option value="">Auto-assign</option>
          {(riders.data?.data || []).map((r) => <option key={r._id} value={r._id}>{r.name} {r.rider?.online ? '● online' : '○ offline'} · {r.rider?.activeOrders || 0} active</option>)}
        </Select>
      </Modal>
    </div>
  );
}
