import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Mail, MessageCircle, Video, Wallet, CreditCard } from 'lucide-react';
import { get, post } from '../../lib/api.js';
import { useAuth } from '../../lib/authStore.js';
import { runPayment } from '../../lib/payFlow.js';
import { hashKey } from '../../lib/hash.js';
import { Avatar, Card, SectionTitle } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Checkbox, Select, TagInput, Textarea } from '../../components/ui/Form.jsx';
import { ErrorState, Skeleton, errMsg, toast } from '../../components/ui/Feedback.jsx';
import { SlotPicker } from '../../components/common/SlotPicker.jsx';
import { inr, prettyDate, to12h } from '../../lib/format.js';
import { cn } from '../../lib/cn.js';

export default function Book() {
  const { doctorId } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const nonce = useRef(Math.random().toString(36).slice(2));

  const doc = useQuery({ queryKey: ['doctor', doctorId], queryFn: () => get(`/doctors/${doctorId}`) });

  const [mode, setMode] = useState(null);
  const [slot, setSlot] = useState({ date: null, time: null });
  const [memberId, setMemberId] = useState('');
  const [reason, setReason] = useState('');
  const [symptoms, setSymptoms] = useState([]);
  // OPTIONAL confirmation channels – default to the patient's saved preference, always changeable per booking
  const [notifyEmail, setNotifyEmail] = useState(Boolean(user.email && user.prefs?.emailConfirmations));
  const [notifyWa, setNotifyWa] = useState(Boolean(user.prefs?.whatsappConfirmations));
  const [payMode, setPayMode] = useState('online');
  const [busy, setBusy] = useState(false);

  const d = doc.data?.data;
  const activeMode = mode || d?.modes?.[0];
  const fee = d?.fees?.[activeMode] || 0;
  const canPayAtClinic = activeMode === 'in_person' && fee > 0;
  const effectivePay = fee === 0 ? 'free' : activeMode === 'video' || !canPayAtClinic ? 'online' : payMode;
  const waNumber = user.prefs?.whatsappNumber || user.phone;

  const ready = slot.date && slot.time;
  const summary = useMemo(() => (ready ? `${prettyDate(slot.date)} · ${to12h(slot.time)}` : 'Select a date and time'), [ready, slot]);

  const submit = async () => {
    const payload = {
      doctorId, date: slot.date, time: slot.time, mode: activeMode,
      memberId: memberId || undefined, reason: reason || undefined, symptoms,
      payMode: effectivePay === 'free' ? undefined : effectivePay,
      notify: { email: notifyEmail, whatsapp: notifyWa },
    };
    setBusy(true);
    try {
      const res = await post('/appointments', payload, { headers: { 'Idempotency-Key': `${nonce.current}-${hashKey(JSON.stringify(payload))}` } });
      const { appointment, payment } = res.data;
      qc.invalidateQueries({ queryKey: ['appointments'] });
      if (payment) {
        try {
          const paid = await runPayment(payment, { description: `Consultation with Dr. ${d.name}`, prefill: { name: user.name, email: user.email, contact: user.phone } });
          if (paid) toast.success('Payment received — appointment confirmed');
          else toast.info('Payment pending. Your slot is held for a few minutes.');
        } catch (e) {
          toast.error(errMsg(e));
        }
      } else toast.success('Appointment confirmed');
      nav(`/appointments/${appointment.id}`, { replace: true });
    } catch (e) {
      toast.error(errMsg(e));
      if (e.apiCode === 'SLOT_TAKEN' || e.response?.status === 409) {
        setSlot((s) => ({ ...s, time: null }));
        qc.invalidateQueries({ queryKey: ['slots-day'] });
        qc.invalidateQueries({ queryKey: ['slots-cal'] });
      }
    } finally {
      setBusy(false);
    }
  };

  if (doc.isLoading) return <div className="container space-y-4 py-8"><Skeleton className="h-28" /><Skeleton className="h-72" /></div>;
  if (doc.isError) return <div className="container py-8"><ErrorState error={doc.error} onRetry={doc.refetch} /></div>;

  return (
    <div className="container max-w-3xl py-6 pb-40 sm:py-10">
      <Card className="flex items-center gap-4 p-4">
        <Avatar name={d.name} src={d.avatar} size={60} className="!rounded-2xl" />
        <div>
          <h1 className="font-display text-xl font-extrabold text-ink-900">Dr. {d.name}</h1>
          <p className="text-sm text-ink-500">{d.specialization} · {d.department?.name}</p>
        </div>
      </Card>

      <section className="mt-6">
        <SectionTitle title="1. Consultation type" />
        <div className="grid grid-cols-2 gap-3">
          {[['in_person', 'In-clinic visit', Building2], ['video', 'Video consult', Video]].map(([m, label, Icon]) => {
            const enabled = d.modes.includes(m);
            return (
              <button key={m} type="button" disabled={!enabled} aria-pressed={activeMode === m}
                onClick={() => { setMode(m); setSlot({ date: null, time: null }); }}
                className={cn('rounded-2xl border-2 p-4 text-left transition', activeMode === m ? 'border-brand-600 bg-brand-50' : 'border-ink-100 bg-white hover:border-brand-300', !enabled && 'cursor-not-allowed opacity-40')}>
                <Icon className="mb-2 h-6 w-6 text-brand-600" />
                <div className="font-display font-bold text-ink-900">{label}</div>
                <div className="text-sm text-ink-500">{enabled ? inr(d.fees[m]) : 'Not available'}</div>
              </button>
            );
          })}
        </div>
      </section>

      {user.familyMembers?.length > 0 && (
        <section className="mt-6">
          <SectionTitle title="2. Who is this for?" />
          <Select aria-label="Patient" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            <option value="">Myself ({user.name})</option>
            {user.familyMembers.map((m) => <option key={m._id} value={m._id}>{m.name} ({m.relation})</option>)}
          </Select>
        </section>
      )}

      <section className="mt-6">
        <SectionTitle title={`${user.familyMembers?.length ? '3' : '2'}. Pick date & time`} />
        <Card className="p-4">
          <SlotPicker key={activeMode} doctorId={d._id} mode={activeMode} value={slot} onChange={setSlot} />
        </Card>
      </section>

      <section className="mt-6">
        <SectionTitle title="Tell the doctor (optional)" />
        <div className="space-y-4">
          <TagInput label="Symptoms" value={symptoms} onChange={setSymptoms} placeholder="e.g. fever, cough – press Enter" max={12} />
          <Textarea label="Reason for visit" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Anything else the doctor should know" />
        </div>
      </section>

      <section className="mt-6">
        <SectionTitle title="Confirmation messages" subtitle="Optional – choose how you'd like to be informed. You'll always see it in the app." />
        <div className="grid gap-3 sm:grid-cols-2">
          <Checkbox checked={notifyEmail} onChange={setNotifyEmail} label={<span className="flex items-center gap-1.5"><Mail className="h-4 w-4" /> Email</span>} description={user.email ? `Send confirmation, reschedule & reminders to ${user.email}` : 'Add an email in your profile to enable'} />
          <Checkbox checked={notifyWa} onChange={setNotifyWa} label={<span className="flex items-center gap-1.5"><MessageCircle className="h-4 w-4" /> WhatsApp</span>} description={waNumber ? `Send updates to +${waNumber}` : 'Add a number in your profile to enable'} />
        </div>
      </section>

      {fee > 0 && canPayAtClinic && (
        <section className="mt-6">
          <SectionTitle title="Payment" />
          <div className="grid gap-3 sm:grid-cols-2">
            {[['online', 'Pay online now', 'Secure UPI / card / netbanking', CreditCard], ['at_clinic', 'Pay at clinic', 'Pay at the reception', Wallet]].map(([v, t, s, Icon]) => (
              <button key={v} type="button" aria-pressed={effectivePay === v} onClick={() => setPayMode(v)} className={cn('flex items-start gap-3 rounded-2xl border-2 p-4 text-left', effectivePay === v ? 'border-brand-600 bg-brand-50' : 'border-ink-100 bg-white')}>
                <Icon className="mt-0.5 h-5 w-5 text-brand-600" /><span><span className="block font-semibold text-ink-900">{t}</span><span className="text-sm text-ink-500">{s}</span></span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="safe-bottom fixed inset-x-0 bottom-[3.9rem] z-30 border-t border-ink-100 bg-white/95 backdrop-blur md:bottom-0">
        <div className="container flex max-w-3xl items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-900">{summary}</p>
            <p className="text-xs text-ink-500">{fee > 0 ? `${inr(fee)} · ${effectivePay === 'at_clinic' ? 'pay at clinic' : 'pay online'}` : 'No consultation fee'}</p>
          </div>
          <Button size="lg" disabled={!ready} loading={busy} onClick={submit}>{effectivePay === 'online' && fee > 0 ? 'Pay & confirm' : 'Confirm booking'}</Button>
        </div>
      </div>
    </div>
  );
}
