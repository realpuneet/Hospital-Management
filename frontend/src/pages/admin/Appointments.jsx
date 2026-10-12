import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, XCircle } from 'lucide-react';
import { get, post } from '../../lib/api.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { Badge, Card, StatusBadge } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input, Select, Textarea } from '../../components/ui/Form.jsx';
import { CardSkeletons, Empty, ErrorState, errMsg, toast } from '../../components/ui/Feedback.jsx';
import { ConfirmDialog, Modal } from '../../components/ui/Overlay.jsx';
import { Pager } from '../../components/common/Pager.jsx';
import { SlotPicker } from '../../components/common/SlotPicker.jsx';
import { dateTime, inr, MODE_LABEL, STATUS_META } from '../../lib/format.js';

const ACTIVE = ['booked', 'checked_in', 'pending_payment'];

export default function AdminAppointments() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ status: '', date: '', q: '' });
  const [page, setPage] = useState(1);
  const [cancel, setCancel] = useState(null);
  const [reason, setReason] = useState('');
  const [resched, setResched] = useState(null);
  const [slot, setSlot] = useState({ date: null, time: null });
  const dq = useDebounce(filters.q);
  const params = { page, limit: 20, status: filters.status || undefined, date: filters.date || undefined, q: dq || undefined };
  const q = useQuery({ queryKey: ['admin-appointments', params], queryFn: () => get('/admin/appointments', params), placeholderData: keepPreviousData });
  const done = () => qc.invalidateQueries({ queryKey: ['admin-appointments'] });
  const set = (k) => (e) => { setFilters((f) => ({ ...f, [k]: e.target.value })); setPage(1); };

  const cancelM = useMutation({
    mutationFn: () => post(`/admin/appointments/${cancel._id}/cancel`, { reason: reason || undefined }),
    onSuccess: () => { toast.success('Appointment cancelled — patient notified'); setCancel(null); setReason(''); done(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const reschedM = useMutation({
    mutationFn: () => post(`/admin/appointments/${resched._id}/reschedule`, { ...slot, mode: resched.mode }),
    onSuccess: () => { toast.success('Rescheduled — patient notified'); setResched(null); setSlot({ date: null, time: null }); done(); },
    onError: (e) => { toast.error(errMsg(e)); qc.invalidateQueries({ queryKey: ['slots-day'] }); },
  });

  const rows = q.data?.data || [];
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-extrabold text-ink-900">Appointments</h1>
      <Card className="grid gap-3 p-4 sm:grid-cols-3">
        <Input label="Search code" placeholder="APT-…" value={filters.q} onChange={set('q')} />
        <Select label="Status" value={filters.status} onChange={set('status')}>
          <option value="">All</option>
          {Object.entries(STATUS_META).filter(([k]) => !['placed', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'rejected'].includes(k)).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
        </Select>
        <Input label="Date" type="date" value={filters.date} onChange={set('date')} />
      </Card>
      {q.isLoading && <CardSkeletons count={5} className="h-20" />}
      {q.isError && <ErrorState error={q.error} onRetry={q.refetch} />}
      {!q.isLoading && !q.isError && rows.length === 0 && <Empty title="No appointments found" text="Try changing the filters." />}
      <div className="space-y-3">
        {rows.map((a) => (
          <Card key={a._id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-bold text-ink-500">{a.code}</span><StatusBadge status={a.status} /><Badge tone="gray">{MODE_LABEL[a.mode]}</Badge></div>
              <p className="mt-1 truncate font-semibold text-ink-900">{a.forMemberName || a.patient?.name} <span className="font-normal text-ink-500">with</span> {a.doctor?.name}</p>
              <p className="text-sm text-ink-500">{dateTime(a.startAt)} · {a.department?.name} · {inr(a.fee)}{a.patient?.phone ? ` · ${a.patient.phone}` : ''}</p>
            </div>
            {ACTIVE.includes(a.status) && (
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => { setResched(a); setSlot({ date: null, time: null }); }}><CalendarClock className="h-4 w-4" /> Reschedule</Button>
                <Button size="sm" variant="secondary" className="text-red-600" onClick={() => setCancel(a)}><XCircle className="h-4 w-4" /> Cancel</Button>
              </div>
            )}
          </Card>
        ))}
      </div>
      <Pager meta={q.data?.meta} onPage={setPage} />

      <ConfirmDialog open={!!cancel} onClose={() => setCancel(null)} onConfirm={() => cancelM.mutate()} loading={cancelM.isPending} danger title="Cancel this appointment?" confirmLabel="Cancel appointment" message="The patient is notified and any payment is refunded per policy.">
        <Textarea label="Reason (shown to patient)" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
      </ConfirmDialog>

      <Modal open={!!resched} onClose={() => setResched(null)} title="Reschedule appointment" size="lg" footer={<Button className="w-full" disabled={!slot.time} loading={reschedM.isPending} onClick={() => reschedM.mutate()}>Confirm new time</Button>}>
        {resched && <SlotPicker doctorId={resched.doctor?._id} mode={resched.mode} value={slot} onChange={setSlot} excludeStartAt={resched.startAt} />}
      </Modal>
    </div>
  );
}
