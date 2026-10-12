import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Moon, Printer, ShoppingCart, Sun, Sunset, Volume2, VolumeX, Sunrise } from 'lucide-react';
import { get } from '../../lib/api.js';
import { useAuth } from '../../lib/authStore.js';
import { useCart } from '../../features/cart/cartStore.js';
import { Badge, Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ErrorState, Skeleton, toast } from '../../components/ui/Feedback.jsx';
import { MEAL_LABEL, ageFrom, dateLong, prettyDate } from '../../lib/format.js';

/** "1-0-1" -> chips for morning / noon / (evening) / night */
function Dosage({ pattern }) {
  const parts = String(pattern).split('-');
  const icons = parts.length === 4 ? [[Sunrise, 'Morning'], [Sun, 'Noon'], [Sunset, 'Evening'], [Moon, 'Night']] : [[Sunrise, 'Morning'], [Sun, 'Noon'], [Moon, 'Night']];
  return (
    <div className="flex gap-1.5">
      {icons.map(([Icon, label], i) => {
        const on = parseFloat(parts[i]) > 0;
        return (
          <span key={label} title={`${label}: ${parts[i]}`} className={`flex w-12 flex-col items-center rounded-lg py-1 text-[10px] font-semibold ${on ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-400'}`}>
            <Icon className="h-3.5 w-3.5" />{on ? parts[i] : '–'}
          </span>
        );
      })}
    </div>
  );
}

const spokenDose = (p) => {
  const parts = String(p).split('-');
  const names = parts.length === 4 ? ['morning', 'afternoon', 'evening', 'night'] : ['morning', 'afternoon', 'night'];
  const on = parts.map((x, i) => (parseFloat(x) > 0 ? `${x} in the ${names[i]}` : null)).filter(Boolean);
  return on.join(', ');
};

export default function PrescriptionDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const user = useAuth((s) => s.user);
  const { add, clear, setPrescription } = useCart();
  const [speaking, setSpeaking] = useState(false);
  const q = useQuery({ queryKey: ['prescription', id], queryFn: () => get(`/prescriptions/${id}`) });

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  if (q.isLoading) return <div className="container max-w-3xl space-y-4 py-8"><Skeleton className="h-40" /><Skeleton className="h-72" /></div>;
  if (q.isError) return <div className="container max-w-3xl py-8"><ErrorState error={q.error} onRetry={q.refetch} /></div>;
  const rx = q.data.data;
  const isPatient = user.role === 'patient' && String(rx.patient._id) === String(user.id || user._id);
  const expired = new Date(rx.validTill) < new Date();

  const readAloud = () => {
    const synth = window.speechSynthesis;
    if (!synth) return toast.error('Read aloud is not supported on this device');
    if (speaking) { synth.cancel(); setSpeaking(false); return; }
    const text = [
      `Prescription from doctor ${rx.doctorUser.name}.`,
      rx.diagnosis && `Diagnosis: ${rx.diagnosis}.`,
      ...rx.items.map((i, n) => `Medicine ${n + 1}: ${i.name} ${i.strength || ''}. Take ${spokenDose(i.dosage)}, ${MEAL_LABEL[i.meal]?.toLowerCase()}, for ${i.durationDays} days. ${i.instructions || ''}`),
      rx.advice && `Advice: ${rx.advice}.`,
      rx.followUpDate && `Follow up on ${prettyDate(rx.followUpDate)}.`,
    ].filter(Boolean).join(' ');
    const u = new SpeechSynthesisUtterance(text);
    u.lang = user.prefs?.language === 'hi' ? 'hi-IN' : 'en-IN';
    u.rate = 0.92;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(u);
  };

  const orderAll = () => {
    const orderable = rx.items.filter((i) => i.medicine && i.medicine.isActive !== false && i.medicine.stock > 0);
    if (!orderable.length) return toast.error('None of these medicines are available in our pharmacy right now');
    clear();
    orderable.forEach((i) => {
      const m = { ...i.medicine, id: i.medicine._id };
      add(m, Math.min(10, i.quantity || 1));
    });
    setPrescription(rx._id);
    toast.success(`${orderable.length} medicine${orderable.length > 1 ? 's' : ''} added to cart`);
    nav('/cart');
  };

  return (
    <div className="container max-w-3xl space-y-4 py-6 sm:py-10">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">Prescription</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={readAloud}>{speaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}{speaking ? 'Stop' : 'Read aloud'}</Button>
          <Button variant="secondary" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print / PDF</Button>
          {isPatient && <Button size="sm" onClick={orderAll}><ShoppingCart className="h-4 w-4" /> Order medicines</Button>}
        </div>
      </div>

      <Card className="print-sheet overflow-hidden">
        <div className="flex items-start justify-between gap-4 bg-brand-600 p-5 text-white">
          <div>
            <p className="font-display text-xl font-extrabold">CarePulse Hospital</p>
            <p className="text-sm text-brand-100">Dr. {rx.doctorUser?.name}{rx.doctor?.specialization ? ` · ${rx.doctor.specialization}` : ''}</p>
            {rx.doctor?.registrationNo && <p className="text-xs text-brand-100">Reg. No. {rx.doctor.registrationNo}</p>}
          </div>
          <div className="text-right text-sm"><p className="font-semibold">{rx.code}</p><p className="text-brand-100">{dateLong(rx.issuedAt)}</p>{rx.version > 1 && <p className="text-xs text-brand-100">Revision {rx.version}</p>}</div>
        </div>

        <div className="grid gap-1 border-b border-ink-100 p-5 text-sm sm:grid-cols-2">
          <p><span className="text-ink-500">Patient: </span><b>{rx.forMemberName || rx.patient?.name}</b>{!rx.forMemberName && rx.patient?.dob ? `, ${ageFrom(rx.patient.dob)} yrs` : ''}{rx.patient?.gender ? `, ${rx.patient.gender}` : ''}</p>
          {rx.diagnosis && <p><span className="text-ink-500">Diagnosis: </span><b>{rx.diagnosis}</b></p>}
        </div>

        <div className="p-5">
          <p className="mb-3 font-display text-lg font-bold text-brand-700">℞ Medicines</p>
          <ul className="divide-y divide-ink-100">
            {rx.items.map((i, n) => (
              <li key={i._id || n} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-ink-900">{n + 1}. {i.name} {i.strength}</p>
                  <p className="text-sm text-ink-500">{[i.form, MEAL_LABEL[i.meal], `${i.durationDays} day${i.durationDays > 1 ? 's' : ''}`, `Qty ${i.quantity}`].filter(Boolean).join(' · ')}</p>
                  {i.instructions && <p className="mt-0.5 text-sm italic text-ink-600">{i.instructions}</p>}
                  {i.medicine && !isNaN(i.medicine.stock) && (i.medicine.stock > 0 ? <Badge tone="green" className="no-print mt-1.5">Available in pharmacy</Badge> : <Badge tone="gray" className="no-print mt-1.5">Out of stock</Badge>)}
                </div>
                <Dosage pattern={i.dosage} />
              </li>
            ))}
          </ul>
        </div>

        {(rx.tests?.length > 0 || rx.advice || rx.followUpDate) && (
          <div className="space-y-3 border-t border-ink-100 p-5 text-sm">
            {rx.tests?.length > 0 && <p><b className="text-ink-700">Tests: </b>{rx.tests.join(', ')}</p>}
            {rx.advice && <p><b className="text-ink-700">Advice: </b>{rx.advice}</p>}
            {rx.followUpDate && <p><b className="text-ink-700">Follow-up: </b>{prettyDate(rx.followUpDate)}</p>}
          </div>
        )}
        <div className="flex items-end justify-between border-t border-ink-100 p-5 text-xs text-ink-500">
          <p>{expired ? 'Prescription validity has ended.' : `Valid till ${dateLong(rx.validTill)}`}<br />This is a digitally generated prescription.</p>
          <p className="text-right font-semibold text-ink-700">Dr. {rx.doctorUser?.name}<br /><span className="font-normal text-ink-400">Digitally signed</span></p>
        </div>
      </Card>
      {isPatient && <p className="no-print text-center text-xs text-ink-400">Dose reminders were set up automatically — manage them in <Link className="font-semibold text-brand-700" to="/medications">My medicines</Link>.</p>}
    </div>
  );
}
