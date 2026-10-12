import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, CalendarClock, CalendarPlus, FileText, Star, Video, XCircle, Clock, CreditCard, Stethoscope } from 'lucide-react';
import { get, post } from '../../lib/api.js';
import { useAuth } from '../../lib/authStore.js';
import { runPayment } from '../../lib/payFlow.js';
import { downloadIcs } from '../../lib/ics.js';
import { Avatar, Badge, Card, KeyValue, SectionTitle, StatusBadge } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Textarea } from '../../components/ui/Form.jsx';
import { ConfirmDialog, Modal } from '../../components/ui/Overlay.jsx';
import { ErrorState, Skeleton, errMsg, toast } from '../../components/ui/Feedback.jsx';
import { SlotPicker } from '../../components/common/SlotPicker.jsx';
import { dateTime, dateTimeFull, inr, prettyDate, timeOnly, untilLabel } from '../../lib/format.js';

function Timeline({ history = [] }) {
  const label = { created: 'Booked', paid: 'Payment received', rescheduled: 'Rescheduled', cancelled: 'Cancelled', status: 'Status updated', expired: 'Payment hold expired' };
  return (
    <ol className="relative ml-2 space-y-4 border-l border-ink-200 pl-5">
      {history.map((h, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full bg-brand-500 ring-4 ring-white" />
          <p className="text-sm font-semibold text-ink-800">{label[h.action] || h.action}{h.to?.startAt ? ` → ${dateTime(h.to.startAt)}` : typeof h.to === 'string' ? ` → ${h.to.replace('_', ' ')}` : ''}</p>
          <p className="text-xs text-ink-500">{dateTimeFull(h.at)}{h.byRole ? ` · ${h.byRole}` : ''}{h.note ? ` · ${h.note}` : ''}</p>
        </li>
      ))}
    </ol>
  );
}

export default function AppointmentDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const [resched, setResched] = useState(false);
  const [slot, setSlot] = useState({ date: null, time: null });
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const q = useQuery({ queryKey: ['appointment', id], queryFn: () => get(`/appointments/${id}`), refetchInterval: (query) => (query.state.data?.data.status === 'pending_payment' ? 15_000 : false) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['appointment', id] }); qc.invalidateQueries({ queryKey: ['appointments'] }); };

  const rescheduleM = useMutation({
    mutationFn: () => post(`/appointments/${id}/reschedule`, slot),
    onSuccess: () => { toast.success('Appointment rescheduled'); setResched(false); refresh(); },
    onError: (e) => { toast.error(errMsg(e)); qc.invalidateQueries({ queryKey: ['slots-day'] }); },
  });
  const cancelM = useMutation({
    mutationFn: () => post(`/appointments/${id}/cancel`, { reason: cancelReason || undefined }),
    onSuccess: (r) => { toast.success(r.data.refunded ? `Cancelled · ₹${r.data.refunded} refund initiated` : 'Appointment cancelled'); setCancelOpen(false); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const payM = useMutation({
    mutationFn: async () => {
      const r = await post(`/appointments/${id}/pay`);
      return runPayment(r.data, { description: 'Consultation fee', prefill: { name: user.name, email: user.email, contact: user.phone } });
    },
    onSuccess: (paid) => { if (paid) toast.success('Payment received'); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const joinM = useMutation({
    mutationFn: () => get(`/appointments/${id}/join`),
    onSuccess: (r) => window.open(r.data.url, '_blank', 'noopener'),
    onError: (e) => toast.error(errMsg(e)),
  });
  const reviewM = useMutation({
    mutationFn: () => post(`/appointments/${id}/review`, { rating, comment: comment || undefined }),
    onSuccess: () => { toast.success('Thanks for your feedback!'); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });

  if (q.isLoading) return <div className="container max-w-3xl space-y-4 py-8"><Skeleton className="h-36" /><Skeleton className="h-64" /></div>;
  if (q.isError) return <div className="container max-w-3xl py-8"><ErrorState error={q.error} onRetry={q.refetch} /></div>;

  const a = q.data.data;
  const active = ['booked'].includes(a.status);
  const pending = a.status === 'pending_payment';
  const settingsHint = 'Free cancellation up to 4 hours before.';
  const c = a.consultation || {};
  const rx = a.prescription;

  return (
    <div className="container max-w-3xl space-y-5 py-6 sm:py-10">
      <Card className="p-5">
        <div className="flex items-start gap-4">
          <Avatar name={a.doctorUser?.name} src={a.doctorUser?.avatar} size={64} className="!rounded-2xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="font-display text-xl font-extrabold text-ink-900">Dr. {a.doctorUser?.name}</h1>
              <StatusBadge status={a.status} />
            </div>
            <p className="text-sm text-ink-500">{a.department?.name} · Booking {a.code}</p>
            {a.forMember?.name && <Badge tone="blue" className="mt-1.5">For {a.forMember.name} ({a.forMember.relation})</Badge>}
          </div>
        </div>
        <div className="mt-4 grid gap-3 rounded-2xl bg-brand-50 p-4 sm:grid-cols-2">
          <div className="flex items-center gap-3"><CalendarClock className="h-5 w-5 text-brand-600" /><div><p className="text-xs text-ink-500">When</p><p className="font-semibold text-ink-900">{prettyDate(a.date)} · {timeOnly(a.startAt)}</p>{active && <p className="text-xs font-semibold text-brand-600">{untilLabel(a.startAt)}</p>}</div></div>
          <div className="flex items-center gap-3">{a.mode === 'video' ? <Video className="h-5 w-5 text-sky-600" /> : <Building2 className="h-5 w-5 text-brand-600" />}<div><p className="text-xs text-ink-500">{a.mode === 'video' ? 'Video consultation' : 'In-clinic visit'}</p><p className="font-semibold text-ink-900">{a.mode === 'video' ? 'Link opens 10 min before' : a.doctor?.room || 'Reception, ground floor'}</p></div></div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {pending && <Button loading={payM.isPending} onClick={() => payM.mutate()}><CreditCard className="h-4 w-4" /> Pay {inr(a.fee)} to confirm</Button>}
          {active && a.mode === 'video' && <Button variant="primary" loading={joinM.isPending} onClick={() => joinM.mutate()}><Video className="h-4 w-4" /> Join video call</Button>}
          {active && <Button variant="secondary" onClick={() => { setSlot({ date: null, time: null }); setResched(true); }}><CalendarClock className="h-4 w-4" /> Reschedule</Button>}
          {(active || pending) && <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setCancelOpen(true)}><XCircle className="h-4 w-4" /> Cancel</Button>}
          {(active || pending) && <Button variant="ghost" onClick={() => downloadIcs({ title: `Appointment with Dr. ${a.doctorUser?.name}`, start: a.startAt, end: a.endAt, description: `Booking ${a.code}`, location: a.mode === 'video' ? a.meetingUrl || 'Video' : a.doctor?.room || 'CarePulse Hospital', uid: a._id })}><CalendarPlus className="h-4 w-4" /> Add to calendar</Button>}
          {a.status === 'completed' && <Button to={`/doctors/${a.doctor?.slug || a.doctor?._id}`} variant="secondary">Book again</Button>}
        </div>
        {pending && <p className="mt-3 text-xs text-amber-700">Your slot is held until {timeOnly(a.holdExpiresAt)}. Complete payment to confirm.</p>}
        {active && <p className="mt-3 text-xs text-ink-500">{settingsHint} Rescheduling is limited — you've used {a.rescheduleCount}.</p>}
      </Card>

      {(a.reason || a.symptoms?.length > 0) && (
        <Card className="p-5">
          <SectionTitle title="Your notes" />
          {a.symptoms?.length > 0 && <div className="mb-2 flex flex-wrap gap-1.5">{a.symptoms.map((s) => <Badge key={s} tone="brand">{s}</Badge>)}</div>}
          {a.reason && <p className="text-sm text-ink-600">{a.reason}</p>}
        </Card>
      )}

      {(c.diagnosis || c.advice || c.treatmentPlan || c.notes) && (
        <Card className="p-5">
          <SectionTitle title="Consultation summary" />
          <dl className="divide-y divide-ink-100">
            {c.chiefComplaint && <KeyValue label="Complaint">{c.chiefComplaint}</KeyValue>}
            {c.diagnosis && <KeyValue label="Diagnosis">{c.diagnosis}</KeyValue>}
            {c.treatmentPlan && <KeyValue label="Treatment plan">{c.treatmentPlan}</KeyValue>}
            {c.advice && <KeyValue label="Advice">{c.advice}</KeyValue>}
            {c.followUpDate && <KeyValue label="Follow-up">{prettyDate(c.followUpDate)}</KeyValue>}
            {c.vitals && Object.keys(c.vitals).length > 0 && <KeyValue label="Vitals">{[c.vitals.bp && `BP ${c.vitals.bp}`, c.vitals.pulse && `Pulse ${c.vitals.pulse}`, c.vitals.temperature && `${c.vitals.temperature}°C`, c.vitals.spo2 && `SpO₂ ${c.vitals.spo2}%`, c.vitals.weightKg && `${c.vitals.weightKg} kg`].filter(Boolean).join(' · ')}</KeyValue>}
          </dl>
          {c.tests?.length > 0 && <div className="mt-3"><p className="mb-1.5 text-sm font-semibold text-ink-700">Recommended tests</p><div className="flex flex-wrap gap-1.5">{c.tests.map((t) => <Badge key={t} tone="amber">{t}</Badge>)}</div></div>}
          {rx && <Button to={`/prescriptions/${rx._id || rx.id}`} className="mt-4" variant="soft"><FileText className="h-4 w-4" /> Read prescription</Button>}
        </Card>
      )}

      {a.status === 'completed' && !a.review?.rating && (
        <Card className="p-5">
          <SectionTitle title="How was your consultation?" />
          <div className="flex gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} role="radio" aria-checked={rating === n} aria-label={`${n} stars`} onClick={() => setRating(n)} className="p-1"><Star className={`h-8 w-8 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-ink-300'}`} /></button>
            ))}
          </div>
          <Textarea className="mt-3" placeholder="Share your experience (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
          <Button className="mt-3" disabled={!rating} loading={reviewM.isPending} onClick={() => reviewM.mutate()}>Submit review</Button>
        </Card>
      )}
      {a.review?.rating && <Card className="p-4 text-sm text-ink-600"><Stethoscope className="mr-1 inline h-4 w-4 text-brand-600" />You rated this visit {a.review.rating}/5. Thank you!</Card>}

      <Card className="p-5">
        <SectionTitle title="Payment" />
        <dl className="divide-y divide-ink-100">
          <KeyValue label="Consultation fee">{a.fee ? inr(a.fee) : 'Free'}</KeyValue>
          <KeyValue label="Status"><Badge tone={a.paymentStatus === 'paid' ? 'green' : a.paymentStatus === 'refunded' ? 'blue' : 'amber'}>{a.paymentStatus.replace('_', ' ')}</Badge></KeyValue>
          <KeyValue label="Confirmations">{[a.notify?.email && 'Email', a.notify?.whatsapp && 'WhatsApp'].filter(Boolean).join(' + ') || 'In-app only'}</KeyValue>
        </dl>
      </Card>

      <Card className="p-5">
        <SectionTitle title="Activity" />
        <Timeline history={a.history} />
      </Card>

      <p className="text-center text-xs text-ink-400"><Clock className="mr-1 inline h-3 w-3" />All times in IST · <Link to="/appointments" className="text-brand-700">Back to appointments</Link></p>

      <Modal open={resched} onClose={() => setResched(false)} title="Reschedule appointment" size="lg"
        footer={<div className="flex items-center justify-between gap-3"><p className="truncate text-sm text-ink-500">{slot.time ? `${prettyDate(slot.date)} · ${slot.time}` : 'Pick a new slot'}</p><Button disabled={!slot.time} loading={rescheduleM.isPending} onClick={() => rescheduleM.mutate()}>Confirm new time</Button></div>}>
        <SlotPicker doctorId={a.doctor?._id} mode={a.mode} value={slot} onChange={setSlot} excludeStartAt={a.startAt} />
      </Modal>

      <ConfirmDialog open={cancelOpen} onClose={() => setCancelOpen(false)} danger loading={cancelM.isPending} onConfirm={() => cancelM.mutate()}
        title="Cancel this appointment?" confirmLabel="Yes, cancel"
        message={a.paymentStatus === 'paid' ? 'Cancelling at least 4 hours before the slot refunds your payment in 5-7 working days.' : 'This will release your slot.'}>
        <Textarea className="mt-3" placeholder="Reason (optional)" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
      </ConfirmDialog>
    </div>
  );
}
