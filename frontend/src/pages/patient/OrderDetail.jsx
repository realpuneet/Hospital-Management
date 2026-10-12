import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bike, Check, CircleDot, CreditCard, MapPin, PackageCheck, Phone, ShieldCheck, XCircle } from 'lucide-react';
import { get, post } from '../../lib/api.js';
import { useAuth } from '../../lib/authStore.js';
import { runPayment } from '../../lib/payFlow.js';
import { useSocketEvent, useSocketWatch } from '../../hooks/useSocketEvent.js';
import { Badge, Card, KeyValue, SectionTitle, StatusBadge } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ConfirmDialog } from '../../components/ui/Overlay.jsx';
import { ErrorState, Skeleton, errMsg, toast } from '../../components/ui/Feedback.jsx';
import { dateTimeFull, inr, timeAgo } from '../../lib/format.js';
import { cn } from '../../lib/cn.js';

const STEPS = [['placed', 'Order placed'], ['confirmed', 'Confirmed by pharmacy'], ['packed', 'Packed'], ['out_for_delivery', 'Out for delivery'], ['delivered', 'Delivered']];

function LiveMap({ lat, lng }) {
  const d = 0.008;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik&marker=${lat},${lng}`;
  return <iframe title="Rider location" src={src} className="h-56 w-full rounded-2xl border border-ink-100" loading="lazy" />;
}

export default function OrderDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [live, setLive] = useState(null);

  const q = useQuery({ queryKey: ['order', id], queryFn: () => get(`/orders/${id}`) });
  useSocketWatch('order:watch', 'order:unwatch', id);
  const onLoc = useCallback((p) => { if (p.id === id) setLive(p); }, [id]);
  useSocketEvent('order:location', onLoc);
  const refresh = () => { qc.invalidateQueries({ queryKey: ['order', id] }); qc.invalidateQueries({ queryKey: ['orders'] }); };

  const cancel = useMutation({
    mutationFn: () => post(`/orders/${id}/cancel`, { reason: 'Cancelled by customer' }),
    onSuccess: () => { toast.success('Order cancelled'); setCancelOpen(false); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const pay = useMutation({
    mutationFn: async () => runPayment((await post(`/orders/${id}/pay`)).data, { description: 'Medicine order', prefill: { name: user.name, email: user.email, contact: user.phone } }),
    onSuccess: refresh,
    onError: (e) => toast.error(errMsg(e)),
  });

  if (q.isLoading) return <div className="container max-w-3xl space-y-4 py-8"><Skeleton className="h-40" /><Skeleton className="h-64" /></div>;
  if (q.isError) return <div className="container max-w-3xl py-8"><ErrorState error={q.error} onRetry={q.refetch} /></div>;
  const o = q.data.data;
  const isPatient = user.role === 'patient';
  const idx = STEPS.findIndex(([s]) => s === o.status);
  const terminal = ['cancelled', 'rejected'].includes(o.status);
  const loc = live || o.riderLocation;
  const canCancel = isPatient && ['pending_payment', 'placed', 'confirmed'].includes(o.status);

  return (
    <div className="container max-w-3xl space-y-5 py-6 sm:py-10">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h1 className="font-display text-xl font-extrabold text-ink-900">Order {o.code}</h1><p className="text-sm text-ink-500">{dateTimeFull(o.createdAt)}</p></div>
          <StatusBadge status={o.status} />
        </div>

        {terminal ? (
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><XCircle className="h-5 w-5" /> {o.status === 'rejected' ? 'The pharmacy could not fulfil this order.' : 'This order was cancelled.'} {o.cancelReason}</p>
        ) : o.status === 'pending_payment' ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><span>Payment pending — complete within 30 minutes or the order will be released.</span>{isPatient && <Button size="sm" loading={pay.isPending} onClick={() => pay.mutate()}><CreditCard className="h-4 w-4" /> Pay {inr(o.total)}</Button>}</div>
        ) : (
          <ol className="mt-5 grid gap-3 sm:grid-cols-5">
            {STEPS.map(([s, label], i) => {
              const done = i <= idx;
              return (
                <li key={s} className="flex items-center gap-3 sm:flex-col sm:text-center">
                  <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 transition', done ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-200 text-ink-300', i === idx && o.status !== 'delivered' && 'animate-pulseRing')}>{done ? <Check className="h-5 w-5" /> : <CircleDot className="h-4 w-4" />}</span>
                  <span className={cn('text-xs font-semibold', done ? 'text-ink-900' : 'text-ink-400')}>{label}</span>
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      {o.status === 'out_for_delivery' && (
        <Card className="space-y-4 p-5">
          <SectionTitle title="Live tracking" subtitle={live?.etaMinutes || o.etaMinutes ? `Arriving in about ${live?.etaMinutes || o.etaMinutes} min` : 'Your rider is on the way'} />
          {loc?.lat ? <LiveMap lat={loc.lat} lng={loc.lng} /> : <p className="rounded-xl bg-ink-50 p-4 text-sm text-ink-500">Waiting for the rider's location…</p>}
          {loc?.at && <p className="text-xs text-ink-400">Updated {timeAgo(loc.at)}</p>}
          {o.rider && (
            <div className="flex items-center justify-between rounded-xl bg-ink-50 p-3">
              <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 text-brand-700"><Bike className="h-5 w-5" /></span><div><p className="font-semibold text-ink-900">{o.rider.name}</p><p className="text-xs text-ink-500">Your delivery partner</p></div></div>
              {o.rider.phone && <Button href={`tel:+${o.rider.phone}`} size="sm" variant="secondary"><Phone className="h-4 w-4" /> Call</Button>}
            </div>
          )}
          {o.deliveryOtp && (
            <div className="rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50 p-4 text-center">
              <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-brand-800"><ShieldCheck className="h-4 w-4" /> Delivery OTP — share only at the door</p>
              <p className="mt-1 font-display text-4xl font-extrabold tracking-[0.4em] text-brand-700">{o.deliveryOtp}</p>
            </div>
          )}
        </Card>
      )}

      <Card className="p-5">
        <SectionTitle title="Items" />
        <ul className="divide-y divide-ink-100">
          {o.items.map((i) => (
            <li key={i.medicine} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span className="min-w-0 truncate text-ink-800">{i.name} <span className="text-ink-400">× {i.qty}</span>{i.requiresPrescription && <Badge tone="coral" className="ml-2">Rx</Badge>}</span><b>{inr(i.price * i.qty)}</b></li>
          ))}
        </ul>
        <dl className="mt-2 divide-y divide-ink-100 border-t border-ink-100">
          <KeyValue label="Subtotal">{inr(o.subtotal)}</KeyValue>
          <KeyValue label="Delivery">{o.deliveryFee ? inr(o.deliveryFee) : 'Free'}</KeyValue>
          <KeyValue label="GST (included)">{inr(o.gst)}</KeyValue>
          <KeyValue label="Total"><b className="font-display text-lg">{inr(o.total)}</b></KeyValue>
          <KeyValue label="Payment"><Badge tone={o.paymentStatus === 'paid' ? 'green' : 'amber'}>{o.payMethod === 'cod' && o.paymentStatus !== 'paid' ? 'Cash on delivery' : o.paymentStatus}</Badge></KeyValue>
        </dl>
      </Card>

      <Card className="p-5">
        <SectionTitle title="Delivering to" />
        <p className="flex gap-2 text-sm text-ink-700"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /><span><b>{o.address?.name}</b> · {o.address?.phone}<br />{o.address?.line1}{o.address?.line2 ? `, ${o.address.line2}` : ''}, {o.address?.city} {o.address?.pincode}</span></p>
        {o.prescription && <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-500"><PackageCheck className="h-4 w-4" /> Against prescription {o.prescription.code}</p>}
      </Card>

      {canCancel && <Button variant="ghost" className="w-full text-red-600 hover:bg-red-50" onClick={() => setCancelOpen(true)}>Cancel order</Button>}
      <ConfirmDialog open={cancelOpen} onClose={() => setCancelOpen(false)} danger loading={cancel.isPending} onConfirm={() => cancel.mutate()} title="Cancel this order?" confirmLabel="Yes, cancel" message={o.paymentStatus === 'paid' ? 'Your payment will be refunded to the original method in 5-7 working days.' : 'The reserved medicines will be released.'} />
    </div>
  );
}
