import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, CalendarClock, ChevronLeft, ChevronRight, LogIn, Play, UserX, Video, XCircle } from 'lucide-react';
import { get, patch, post } from '../../lib/api.js';
import { Badge, Card, StatusBadge } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Textarea } from '../../components/ui/Form.jsx';
import { ConfirmDialog, Modal } from '../../components/ui/Overlay.jsx';
import { CardSkeletons, Empty, ErrorState, errMsg, toast } from '../../components/ui/Feedback.jsx';
import { SlotPicker } from '../../components/common/SlotPicker.jsx';
import { addDaysStr, ageFrom, istDate, prettyDate, timeOnly } from '../../lib/format.js';

export default function DoctorAppointments() {
  const qc = useQueryClient();
  const today = istDate();
  const [date, setDate] = useState(today);
  const [cancel, setCancel] = useState(null);
  const [reason, setReason] = useState('');
  const [resched, setResched] = useState(null);
  const [slot, setSlot] = useState({ date: null, time: null });

  const q = useQuery({ queryKey: ['doctor-appointments', date], queryFn: () => get('/doctor/appointments', { date }), refetchInterval: 45_000 });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['doctor-appointments'] }); qc.invalidateQueries({ queryKey: ['doctor-dashboard'] }); };

  const status = useMutation({ mutationFn: ({ id, status: s, note }) => patch(`/doctor/appointments/${id}/status`, { status: s, note }), onSuccess: refresh, onError: (e) => toast.error(errMsg(e)) });
  const doCancel = useMutation({
    mutationFn: () => patch(`/doctor/appointments/${cancel._id}/status`, { status: 'cancelled', note: reason || 'Cancelled by doctor' }),
    onSuccess: () => { toast.success('Cancelled — patient has been notified'); setCancel(null); setReason(''); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const doResched = useMutation({
    mutationFn: () => post(`/doctor/appointments/${resched._id}/reschedule`, { ...slot, reason: 'Rescheduled by doctor' }),
    onSuccess: () => { toast.success('Rescheduled — patient has been notified'); setResched(null); refresh(); },
    onError: (e) => { toast.error(errMsg(e)); qc.invalidateQueries({ queryKey: ['slots-day'] }); },
  });

  const items = (q.data?.data || []).filter((a) => !['expired'].includes(a.status));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">Appointments</h1>
        <div className="flex items-center gap-1 rounded-2xl border border-ink-100 bg-white p-1">
          <Button size="icon" variant="ghost" aria-label="Previous day" onClick={() => setDate(addDaysStr(date, -1))}><ChevronLeft className="h-5 w-5" /></Button>
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="rounded-lg bg-transparent px-2 py-1.5 text-sm font-semibold text-ink-800 outline-none" aria-label="Date" />
          <Button size="icon" variant="ghost" aria-label="Next day" onClick={() => setDate(addDaysStr(date, 1))}><ChevronRight className="h-5 w-5" /></Button>
          {date !== today && <Button size="sm" variant="soft" onClick={() => setDate(today)}>Today</Button>}
        </div>
      </div>
      <p className="text-sm text-ink-500">{prettyDate(date)} · {items.length} appointment{items.length !== 1 ? 's' : ''}</p>

      {q.isLoading && <CardSkeletons count={3} className="h-28" />}
      {q.isError && <ErrorState error={q.error} onRetry={q.refetch} />}
      {q.data && items.length === 0 && <Empty icon={CalendarClock} title="No appointments this day" text="Booked patients will show up here in time order." />}

      <div className="space-y-3">
        {items.map((a) => {
          const open = ['booked', 'checked_in'].includes(a.status);
          return (
            <Card key={a._id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-16 shrink-0 rounded-xl bg-brand-50 py-2 text-center"><p className="font-display text-sm font-extrabold text-brand-700">{timeOnly(a.startAt).replace(' ', '')}</p></div>
                  <div>
                    <p className="font-display font-bold text-ink-900">{a.forMember?.name || a.patient?.name}{a.forMember?.name && <span className="ml-1 text-xs font-normal text-ink-500">({a.forMember.relation} of {a.patient?.name})</span>}</p>
                    <p className="text-sm text-ink-500">{[a.patient?.gender, a.patient?.dob && `${ageFrom(a.patient.dob)} yrs`, a.patient?.bloodGroup].filter(Boolean).join(' · ')}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={a.status} />
                      <Badge tone={a.mode === 'video' ? 'blue' : 'brand'}>{a.mode === 'video' ? <><Video className="h-3 w-3" /> Video</> : <><Building2 className="h-3 w-3" /> Clinic</>}</Badge>
                      {a.patient?.allergies?.length > 0 && <Badge tone="red">Allergy: {a.patient.allergies.slice(0, 2).join(', ')}</Badge>}
                    </div>
                    {a.reason && <p className="mt-1.5 text-sm text-ink-600">“{a.reason}”</p>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {a.status === 'booked' && <Button size="sm" variant="secondary" onClick={() => status.mutate({ id: a._id, status: 'checked_in' })}><LogIn className="h-4 w-4" /> Check-in</Button>}
                  {open && <Button size="sm" to={`/doctor/consult/${a._id}`}><Play className="h-4 w-4" /> Start consult</Button>}
                  {a.status === 'in_consultation' && <Button size="sm" to={`/doctor/consult/${a._id}`}>Continue</Button>}
                  {a.status === 'completed' && <Button size="sm" variant="secondary" to={`/doctor/consult/${a._id}`}>View</Button>}
                  {a.status === 'booked' && <Button size="sm" variant="ghost" onClick={() => { setSlot({ date: null, time: null }); setResched(a); }}><CalendarClock className="h-4 w-4" /> Reschedule</Button>}
                  {open && <Button size="sm" variant="ghost" onClick={() => status.mutate({ id: a._id, status: 'no_show' })}><UserX className="h-4 w-4" /> No-show</Button>}
                  {open && <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setCancel(a)}><XCircle className="h-4 w-4" /> Cancel</Button>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <ConfirmDialog open={!!cancel} onClose={() => setCancel(null)} danger loading={doCancel.isPending} onConfirm={() => doCancel.mutate()} title="Cancel this appointment?" confirmLabel="Cancel & notify patient" message="The patient is notified (email/WhatsApp if they opted in) and any payment is refunded in full.">
        <Textarea className="mt-3" placeholder="Reason shown to the patient" value={reason} onChange={(e) => setReason(e.target.value)} />
      </ConfirmDialog>

      <Modal open={!!resched} onClose={() => setResched(null)} size="lg" title="Reschedule appointment"
        footer={<div className="flex items-center justify-between gap-3"><p className="truncate text-sm text-ink-500">{slot.time ? `${prettyDate(slot.date)} · ${slot.time}` : 'Pick a new slot'}</p><Button disabled={!slot.time} loading={doResched.isPending} onClick={() => doResched.mutate()}>Move & notify</Button></div>}>
        {resched && <SlotPicker doctorId={resched.doctor} mode={resched.mode} value={slot} onChange={setSlot} excludeStartAt={resched.startAt} />}
      </Modal>
      <p className="text-center text-xs text-ink-400"><Link to="/doctor/schedule" className="text-brand-700">Change your weekly timings →</Link></p>
    </div>
  );
}
