import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Building2, CheckCircle2, ClipboardList, FileText, History, Pill, Play, Search, Trash2, Video } from 'lucide-react';
import { get, patch, put } from '../../lib/api.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { Avatar, Badge, Card, SectionTitle, StatusBadge } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input, Select, TagInput, Textarea } from '../../components/ui/Form.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { ErrorState, Skeleton, errMsg, toast } from '../../components/ui/Feedback.jsx';
import { MEAL_LABEL, ageFrom, dateTimeFull, prettyDate } from '../../lib/format.js';

const DOSAGES = ['1-0-0', '0-1-0', '0-0-1', '1-0-1', '1-1-0', '0-1-1', '1-1-1', '1-1-1-1'];
const blankItem = () => ({ key: Math.random().toString(36).slice(2), name: '', strength: '', dosage: '1-0-1', meal: 'after_food', durationDays: 5, quantity: 10, instructions: '' });

function MedicinePicker({ onPick }) {
  const [q, setQ] = useState('');
  const dq = useDebounce(q, 250);
  const res = useQuery({ queryKey: ['med-pick', dq], queryFn: () => get('/medicines', { q: dq, limit: 8 }), enabled: dq.length >= 2 });
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-3 h-5 w-5 text-ink-400" />
      <Input aria-label="Search medicine to add" placeholder="Search catalogue to add a medicine…" className="pl-11" value={q} onChange={(e) => setQ(e.target.value)} />
      {dq.length >= 2 && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-ink-100 bg-white shadow-pop">
          {res.isLoading && <li className="p-3 text-sm text-ink-400">Searching…</li>}
          {(res.data?.data || []).map((m) => (
            <li key={m._id}><button type="button" className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-brand-50" onClick={() => { onPick({ ...blankItem(), medicine: m._id, name: m.name, strength: m.strength || '', form: m.form }); setQ(''); }}>
              <span><span className="block text-sm font-semibold text-ink-900">{m.name}</span><span className="text-xs text-ink-500">{m.generic} · {m.strength} · {m.form}</span></span>
              {m.requiresPrescription && <Badge tone="coral">Rx</Badge>}
            </button></li>
          ))}
          {res.data && res.data.data.length === 0 && (
            <li><button type="button" className="w-full px-3.5 py-2.5 text-left text-sm font-semibold text-brand-700 hover:bg-brand-50" onClick={() => { onPick({ ...blankItem(), name: q }); setQ(''); }}>+ Add “{q}” as custom medicine</button></li>
          )}
        </ul>
      )}
    </div>
  );
}

export default function Consult() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState('notes');
  const [notes, setNotes] = useState({ chiefComplaint: '', diagnosis: '', notes: '', treatmentPlan: '', advice: '', tests: [], followUpDate: '', vitals: {} });
  const [items, setItems] = useState([]);
  const [rxAdvice, setRxAdvice] = useState('');
  const [hydrated, setHydrated] = useState(false);

  const q = useQuery({ queryKey: ['doctor-appointment', id], queryFn: () => get(`/doctor/appointments/${id}`) });
  const a = q.data?.data;
  const history = useQuery({ queryKey: ['patient-history', a?.patient?._id], queryFn: () => get(`/doctor/patients/${a.patient._id}/history`), enabled: !!a?.patient?._id });

  useEffect(() => {
    if (!a || hydrated) return;
    const c = a.consultation || {};
    setNotes({ chiefComplaint: c.chiefComplaint || a.reason || '', diagnosis: c.diagnosis || '', notes: c.notes || '', treatmentPlan: c.treatmentPlan || '', advice: c.advice || '', tests: c.tests || [], followUpDate: c.followUpDate || '', vitals: c.vitals || {} });
    if (a.prescription) {
      setItems((a.prescription.items || []).map((i) => ({ ...i, key: i._id, medicine: i.medicine?._id || i.medicine })));
      setRxAdvice(a.prescription.advice || '');
    }
    setHydrated(true);
  }, [a, hydrated]);

  const refresh = () => { qc.invalidateQueries({ queryKey: ['doctor-appointment', id] }); qc.invalidateQueries({ queryKey: ['doctor-appointments'] }); qc.invalidateQueries({ queryKey: ['doctor-dashboard'] }); };
  const cleanVitals = useMemo(() => Object.fromEntries(Object.entries(notes.vitals).filter(([, v]) => v !== '' && v != null)), [notes.vitals]);

  const saveNotes = useMutation({
    mutationFn: () => put(`/doctor/appointments/${id}/consultation`, { ...notes, followUpDate: notes.followUpDate || undefined, vitals: cleanVitals }),
    onSuccess: () => { toast.success('Notes saved'); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const rxBody = () => ({
    diagnosis: notes.diagnosis || undefined,
    advice: rxAdvice || notes.advice || undefined,
    followUpDate: notes.followUpDate || undefined,
    tests: notes.tests,
    items: items.map(({ key, _id, ...i }) => ({ ...i, medicine: i.medicine || undefined, strength: i.strength || undefined, instructions: i.instructions || undefined, durationDays: Number(i.durationDays), quantity: Number(i.quantity) })),
  });
  const saveRx = useMutation({
    mutationFn: () => put(`/doctor/appointments/${id}/prescription`, rxBody()),
    onSuccess: () => { toast.success('Prescription issued — patient notified'); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const setStatus = useMutation({ mutationFn: (status) => patch(`/doctor/appointments/${id}/status`, { status }), onSuccess: refresh, onError: (e) => toast.error(errMsg(e)) });

  const complete = async () => {
    try {
      await saveNotes.mutateAsync();
      if (items.length) await saveRx.mutateAsync();
      await setStatus.mutateAsync('completed');
      toast.success('Consultation completed');
      nav('/doctor/appointments');
    } catch { /* individual mutations already toast */ }
  };

  if (q.isLoading) return <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-96" /></div>;
  if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;

  const p = a.patient;
  const locked = ['cancelled', 'no_show', 'expired', 'pending_payment'].includes(a.status);
  const done = a.status === 'completed';
  const updateItem = (key, patchObj) => setItems((arr) => arr.map((i) => (i.key === key ? { ...i, ...patchObj } : i)));
  const setVital = (k) => (e) => setNotes((n) => ({ ...n, vitals: { ...n.vitals, [k]: e.target.value } }));

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={a.forMember?.name || p.name} size={60} />
            <div>
              <h1 className="font-display text-xl font-extrabold text-ink-900">{a.forMember?.name || p.name}</h1>
              <p className="text-sm text-ink-500">{[p.gender, p.dob && `${ageFrom(p.dob)} yrs`, p.bloodGroup && `Blood ${p.bloodGroup}`].filter(Boolean).join(' · ')}{a.forMember?.name ? ` · booked by ${p.name}` : ''}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5"><StatusBadge status={a.status} /><Badge tone="gray">{a.code}</Badge><Badge tone={a.mode === 'video' ? 'blue' : 'brand'}>{a.mode === 'video' ? <><Video className="h-3 w-3" /> Video</> : <><Building2 className="h-3 w-3" /> Clinic</>}</Badge></div>
              <p className="mt-1 text-sm text-ink-600">{dateTimeFull(a.startAt)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {a.mode === 'video' && a.meetingUrl && !locked && !done && <Button variant="secondary" href={a.meetingUrl} target="_blank" rel="noopener noreferrer"><Video className="h-4 w-4" /> Open video room</Button>}
            {['booked', 'checked_in'].includes(a.status) && <Button loading={setStatus.isPending} onClick={() => setStatus.mutate('in_consultation')}><Play className="h-4 w-4" /> Start consultation</Button>}
            {a.status === 'in_consultation' && <Button loading={saveNotes.isPending || saveRx.isPending || setStatus.isPending} onClick={complete}><CheckCircle2 className="h-4 w-4" /> Save & complete</Button>}
          </div>
        </div>
        {(p.allergies?.length > 0 || p.chronicConditions?.length > 0) && (
          <div className="mt-4 flex flex-wrap items-start gap-3 rounded-xl bg-red-50 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div>
              {p.allergies?.length > 0 && <p><b className="text-red-700">Allergies:</b> {p.allergies.join(', ')}</p>}
              {p.chronicConditions?.length > 0 && <p><b className="text-ink-700">Conditions:</b> {p.chronicConditions.join(', ')}</p>}
            </div>
          </div>
        )}
        {(a.reason || a.symptoms?.length > 0) && <div className="mt-3 text-sm text-ink-700"><b>Patient says:</b> {a.symptoms?.join(', ')}{a.reason ? ` — “${a.reason}”` : ''}</div>}
      </Card>

      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'notes', label: 'Consultation notes' }, { value: 'rx', label: 'Prescription', count: items.length || undefined }, { value: 'history', label: 'Past visits', count: history.data?.data.length || undefined }]} />

      {tab === 'notes' && (
        <Card className="space-y-4 p-5">
          <SectionTitle title="Vitals" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Input label="BP" placeholder="120/80" value={notes.vitals.bp || ''} onChange={setVital('bp')} disabled={locked} />
            <Input label="Pulse (bpm)" type="number" value={notes.vitals.pulse || ''} onChange={setVital('pulse')} disabled={locked} />
            <Input label="Temp (°C)" type="number" step="0.1" value={notes.vitals.temperature || ''} onChange={setVital('temperature')} disabled={locked} />
            <Input label="SpO₂ (%)" type="number" value={notes.vitals.spo2 || ''} onChange={setVital('spo2')} disabled={locked} />
            <Input label="Weight (kg)" type="number" value={notes.vitals.weightKg || ''} onChange={setVital('weightKg')} disabled={locked} />
            <Input label="Height (cm)" type="number" value={notes.vitals.heightCm || ''} onChange={setVital('heightCm')} disabled={locked} />
            <Input label="Sugar" placeholder="e.g. 110 F" value={notes.vitals.sugar || ''} onChange={setVital('sugar')} disabled={locked} />
          </div>
          <Textarea label="Chief complaint" value={notes.chiefComplaint} onChange={(e) => setNotes({ ...notes, chiefComplaint: e.target.value })} disabled={locked} />
          <Input label="Diagnosis" value={notes.diagnosis} onChange={(e) => setNotes({ ...notes, diagnosis: e.target.value })} disabled={locked} />
          <Textarea label="Clinical notes (private to you)" rows={5} value={notes.notes} onChange={(e) => setNotes({ ...notes, notes: e.target.value })} disabled={locked} />
          <Textarea label="Treatment plan" value={notes.treatmentPlan} onChange={(e) => setNotes({ ...notes, treatmentPlan: e.target.value })} disabled={locked} />
          <Textarea label="Advice to patient" value={notes.advice} onChange={(e) => setNotes({ ...notes, advice: e.target.value })} disabled={locked} />
          <TagInput label="Tests recommended" value={notes.tests} onChange={(tests) => setNotes({ ...notes, tests })} placeholder="e.g. CBC, HbA1c" />
          <Input label="Follow-up on" type="date" value={notes.followUpDate} onChange={(e) => setNotes({ ...notes, followUpDate: e.target.value })} disabled={locked} wrapperClass="sm:max-w-xs" />
          {!locked && <Button loading={saveNotes.isPending} onClick={() => saveNotes.mutate()}><ClipboardList className="h-4 w-4" /> Save notes</Button>}
        </Card>
      )}

      {tab === 'rx' && (
        <Card className="space-y-4 p-5">
          {!locked && <MedicinePicker onPick={(it) => setItems((arr) => [...arr, it])} />}
          {items.length === 0 && <p className="rounded-xl border border-dashed border-ink-200 p-6 text-center text-sm text-ink-500"><Pill className="mx-auto mb-2 h-6 w-6 text-ink-300" />No medicines added yet</p>}
          <div className="space-y-3">
            {items.map((i, n) => (
              <div key={i.key} className="rounded-2xl border border-ink-100 bg-ink-50/50 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="font-semibold text-ink-900">{n + 1}. <input aria-label="Medicine name" className="rounded-lg bg-transparent px-1 font-semibold outline-none focus:bg-white" value={i.name} onChange={(e) => updateItem(i.key, { name: e.target.value })} disabled={locked} /> {i.medicine && <Badge tone="green">In pharmacy</Badge>}</p>
                  {!locked && <button aria-label="Remove medicine" className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600" onClick={() => setItems((arr) => arr.filter((x) => x.key !== i.key))}><Trash2 className="h-4 w-4" /></button>}
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Select label="Dosage (M-N-N)" value={i.dosage} onChange={(e) => updateItem(i.key, { dosage: e.target.value })} disabled={locked}>{DOSAGES.map((d) => <option key={d}>{d}</option>)}</Select>
                  <Select label="Food" value={i.meal} onChange={(e) => updateItem(i.key, { meal: e.target.value })} disabled={locked}>{Object.entries(MEAL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
                  <Input label="Days" type="number" min={1} value={i.durationDays} onChange={(e) => updateItem(i.key, { durationDays: e.target.value })} disabled={locked} />
                  <Input label="Qty" type="number" min={1} value={i.quantity} onChange={(e) => updateItem(i.key, { quantity: e.target.value })} disabled={locked} />
                </div>
                <Input className="mt-3" aria-label="Instructions" placeholder="Special instructions (optional)" value={i.instructions || ''} onChange={(e) => updateItem(i.key, { instructions: e.target.value })} disabled={locked} />
              </div>
            ))}
          </div>
          <Textarea label="Advice on prescription" value={rxAdvice} onChange={(e) => setRxAdvice(e.target.value)} placeholder="Diet, rest, precautions…" disabled={locked} />
          <div className="flex flex-wrap gap-2">
            {!locked && <Button disabled={items.length === 0 || items.some((i) => !i.name.trim())} loading={saveRx.isPending} onClick={() => saveRx.mutate()}><FileText className="h-4 w-4" /> {a.prescription ? 'Update & re-issue' : 'Issue prescription'}</Button>}
            {a.prescription && <Button variant="secondary" to={`/doctor/prescriptions/${a.prescription._id}`}>View issued prescription</Button>}
          </div>
          <p className="text-xs text-ink-400">The patient is notified instantly and dose reminders are created automatically.</p>
        </Card>
      )}

      {tab === 'history' && (
        <Card className="p-5">
          <SectionTitle title="Previous visits with you" />
          {history.isLoading && <Skeleton className="h-20" />}
          {history.data?.data.length === 0 && <p className="text-sm text-ink-500"><History className="mr-1 inline h-4 w-4" />First visit — no history yet.</p>}
          <ul className="divide-y divide-ink-100">
            {history.data?.data.map((h) => (
              <li key={h._id} className="py-3 text-sm">
                <p className="font-semibold text-ink-900">{prettyDate(h.date)} · {h.consultation?.diagnosis || 'No diagnosis recorded'}</p>
                {h.consultation?.treatmentPlan && <p className="text-ink-600">{h.consultation.treatmentPlan}</p>}
                {h.consultation?.notes && <p className="mt-0.5 text-ink-500">{h.consultation.notes}</p>}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
