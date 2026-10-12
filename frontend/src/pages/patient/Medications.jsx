import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { BellOff, BellRing, Check, Pill, Plus, Trash2 } from 'lucide-react';
import { del, get, patch, post } from '../../lib/api.js';
import { Badge, Card, SectionTitle } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input, Select, Switch } from '../../components/ui/Form.jsx';
import { Modal } from '../../components/ui/Overlay.jsx';
import { CardSkeletons, Empty, ErrorState, errMsg, toast } from '../../components/ui/Feedback.jsx';
import { MEAL_LABEL, prettyDate, to12h } from '../../lib/format.js';
import { cn } from '../../lib/cn.js';

function Ring({ pct }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" role="img" aria-label={`${pct}% taken today`}>
      <circle cx="44" cy="44" r={r} fill="none" stroke="#e7eff2" strokeWidth="9" />
      <circle cx="44" cy="44" r={r} fill="none" stroke="#0e7c86" strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} transform="rotate(-90 44 44)" style={{ transition: 'stroke-dashoffset .6s ease' }} />
      <text x="44" y="49" textAnchor="middle" className="fill-ink-900 font-display text-lg font-extrabold">{pct}%</text>
    </svg>
  );
}

function AddMedication({ open, onClose, onDone }) {
  const { register, handleSubmit, reset } = useForm({ defaultValues: { dosage: '1-0-1', meal: 'after_food', durationDays: 7 } });
  const m = useMutation({
    mutationFn: (v) => post('/prescriptions/medications', { ...v, durationDays: Number(v.durationDays) }),
    onSuccess: () => { toast.success('Medicine added'); reset(); onDone(); onClose(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <Modal open={open} onClose={onClose} title="Add a medicine" footer={<Button className="w-full" loading={m.isPending} onClick={handleSubmit((v) => m.mutate(v))}>Add & set reminders</Button>}>
      <form className="space-y-4" onSubmit={handleSubmit((v) => m.mutate(v))}>
        <Input label="Medicine name" required {...register('name', { required: true })} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Dosage (M-N-N)" {...register('dosage')}>{['1-0-0', '0-1-0', '0-0-1', '1-0-1', '1-1-0', '1-1-1', '1-1-1-1'].map((d) => <option key={d}>{d}</option>)}</Select>
          <Select label="With food" {...register('meal')}>{Object.entries(MEAL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        </div>
        <Input label="For how many days?" type="number" min={1} max={365} {...register('durationDays')} />
      </form>
    </Modal>
  );
}

export default function Medications() {
  const qc = useQueryClient();
  const [add, setAdd] = useState(false);
  const today = useQuery({ queryKey: ['meds-today'], queryFn: () => get('/prescriptions/medications/today'), refetchInterval: 60_000 });
  const meds = useQuery({ queryKey: ['medications'], queryFn: () => get('/prescriptions/medications') });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['meds-today'] }); qc.invalidateQueries({ queryKey: ['medications'] }); };

  const dose = useMutation({
    mutationFn: ({ d, taken }) => post(`/prescriptions/medications/${d.medicationId}/dose`, { key: d.key, taken }),
    onMutate: async ({ d, taken }) => {
      await qc.cancelQueries({ queryKey: ['meds-today'] });
      const prev = qc.getQueryData(['meds-today']);
      qc.setQueryData(['meds-today'], (old) => old && ({ ...old, data: { ...old.data, doses: old.data.doses.map((x) => (x.key === d.key && x.medicationId === d.medicationId ? { ...x, taken } : x)), summary: { ...old.data.summary, taken: old.data.summary.taken + (taken ? 1 : -1), adherence: Math.round(((old.data.summary.taken + (taken ? 1 : -1)) / old.data.summary.total) * 100) } } }));
      return { prev };
    },
    onError: (e, _v, ctx) => { qc.setQueryData(['meds-today'], ctx.prev); toast.error(errMsg(e)); },
    onSettled: () => qc.invalidateQueries({ queryKey: ['meds-today'] }),
  });
  const toggle = useMutation({ mutationFn: ({ id, remindersOn }) => patch(`/prescriptions/medications/${id}`, { remindersOn }), onSuccess: refresh, onError: (e) => toast.error(errMsg(e)) });
  const stop = useMutation({ mutationFn: (id) => del(`/prescriptions/medications/${id}`), onSuccess: () => { toast.success('Medicine removed'); refresh(); }, onError: (e) => toast.error(errMsg(e)) });

  const t = today.data?.data;
  return (
    <div className="container max-w-3xl space-y-6 py-6 sm:py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">My medicines</h1>
        <Button size="sm" onClick={() => setAdd(true)}><Plus className="h-4 w-4" /> Add</Button>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-5">
          {t && <Ring pct={t.summary.adherence} />}
          <div>
            <p className="font-display text-lg font-bold text-ink-900">Today's doses</p>
            <p className="text-sm text-ink-500">{t ? `${t.summary.taken} of ${t.summary.total} taken` : 'Loading…'} {t && prettyDate(t.date)}</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {today.isLoading && <CardSkeletons count={3} className="h-14" />}
          {today.isError && <ErrorState error={today.error} onRetry={today.refetch} />}
          {t && t.doses.length === 0 && <Empty icon={Pill} title="Nothing scheduled today" text="Doses from your prescriptions appear here." />}
          {t?.doses.map((d) => (
            <button key={`${d.medicationId}-${d.key}`} onClick={() => dose.mutate({ d, taken: !d.taken })}
              className={cn('flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition', d.taken ? 'border-emerald-200 bg-emerald-50' : d.overdue ? 'border-coral-100 bg-coral-50' : 'border-ink-100 bg-white hover:border-brand-300')}>
              <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full border-2', d.taken ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-ink-300 text-transparent')}><Check className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className={cn('block truncate font-semibold', d.taken ? 'text-ink-500 line-through' : 'text-ink-900')}>{d.name}</span>
                <span className="text-xs text-ink-500">{[d.dosage, d.meal].filter(Boolean).join(' · ')}</span>
              </span>
              <span className="text-right"><span className="block text-sm font-bold text-ink-800">{to12h(d.time)}</span>{d.overdue && <span className="text-[11px] font-semibold text-coral-600">Overdue</span>}</span>
            </button>
          ))}
        </div>
      </Card>

      <section>
        <SectionTitle title="Active courses" />
        <div className="space-y-3">
          {meds.isLoading && <CardSkeletons count={2} className="h-24" />}
          {meds.data?.data.length === 0 && <Empty icon={Pill} title="No active medicines" text="When a doctor prescribes medicines, they show up here with automatic reminders." />}
          {meds.data?.data.map((m) => (
            <Card key={m._id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink-900">{m.name}</p>
                  <p className="text-sm text-ink-500">{m.dosage} · {MEAL_LABEL[m.meal] || ''} · until {prettyDate(m.endDate)}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">{m.times.map((x) => <Badge key={x} tone="brand">{to12h(x)}</Badge>)}</div>
                </div>
                <button aria-label="Remove medicine" className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600" onClick={() => stop.mutate(m._id)}><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="mt-2 border-t border-ink-100 pt-1">
                <Switch checked={m.remindersOn} onChange={(v) => toggle.mutate({ id: m._id, remindersOn: v })} label={<span className="flex items-center gap-1.5">{m.remindersOn ? <BellRing className="h-4 w-4 text-brand-600" /> : <BellOff className="h-4 w-4" />} Dose reminders</span>} description="Sent in the app, plus email/WhatsApp if enabled in your profile" />
              </div>
            </Card>
          ))}
        </div>
      </section>
      <AddMedication open={add} onClose={() => setAdd(false)} onDone={refresh} />
    </div>
  );
}
