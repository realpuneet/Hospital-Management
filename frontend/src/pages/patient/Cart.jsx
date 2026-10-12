import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Minus, Pill, Plus, ShieldAlert, ShoppingCart, Trash2, Truck, Wallet, CreditCard } from 'lucide-react';
import { get, post } from '../../lib/api.js';
import { useAuth } from '../../lib/authStore.js';
import { useCart, medId } from '../../features/cart/cartStore.js';
import { runPayment } from '../../lib/payFlow.js';
import { hashKey } from '../../lib/hash.js';
import { Badge, Card, KeyValue, SectionTitle } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Select, Textarea } from '../../components/ui/Form.jsx';
import { Modal } from '../../components/ui/Overlay.jsx';
import { Empty, ErrorState, errMsg, toast } from '../../components/ui/Feedback.jsx';
import { AddressForm } from '../../components/common/AddressForm.jsx';
import { inr } from '../../lib/format.js';
import { cn } from '../../lib/cn.js';

export default function Cart() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user, status, setUser } = useAuth();
  const { items, setQty, remove, clear, prescriptionId, setPrescription } = useCart();
  const [addressId, setAddressId] = useState('');
  const [payMethod, setPayMethod] = useState('online');
  const [note, setNote] = useState('');
  const [addrOpen, setAddrOpen] = useState(false);
  const idem = useRef(Math.random().toString(36).slice(2));
  const authed = status === 'authed' && user.role === 'patient';

  const needsRx = items.some((i) => i.medicine.requiresPrescription);
  const settings = useQuery({ queryKey: ['public-settings'], queryFn: () => get('/settings'), staleTime: 300_000 });
  const rxList = useQuery({ queryKey: ['prescriptions', 'for-cart'], queryFn: () => get('/prescriptions', { limit: 20 }), enabled: authed && needsRx });

  const quoteBody = useMemo(() => ({ items: items.map((i) => ({ medicineId: medId(i.medicine), qty: i.qty })) }), [items]);
  const quote = useQuery({
    queryKey: ['quote', quoteBody],
    queryFn: () => post('/orders/quote', quoteBody),
    enabled: authed && items.length > 0,
    retry: false,
  });

  useEffect(() => {
    if (authed && !addressId && user.addresses?.length) setAddressId((user.addresses.find((a) => a.isDefault) || user.addresses[0])._id);
  }, [authed, user, addressId]);

  const addAddress = useMutation({
    mutationFn: (v) => post('/me/addresses', v),
    onSuccess: (r) => { setUser({ ...user, addresses: r.data }); setAddressId(r.data[r.data.length - 1]._id); setAddrOpen(false); toast.success('Address saved'); },
    onError: (e) => toast.error(errMsg(e)),
  });

  const place = useMutation({
    mutationFn: async () => {
      const body = { ...quoteBody, addressId, payMethod, note: note || undefined, prescriptionId: needsRx ? prescriptionId || undefined : undefined };
      const r = await post('/orders', body, { headers: { 'Idempotency-Key': `${idem.current}-${hashKey(JSON.stringify(body))}` } });
      const { order, payment } = r.data;
      if (payment) {
        const paid = await runPayment(payment, { description: `Medicine order ${order.code}`, prefill: { name: user.name, email: user.email, contact: user.phone } });
        if (!paid) toast.info('Payment pending — complete it from your order page');
      }
      return order;
    },
    onSuccess: (order) => { clear(); qc.invalidateQueries({ queryKey: ['orders'] }); toast.success('Order placed'); nav(`/orders/${order.id || order._id}`, { replace: true }); },
    onError: (e) => { toast.error(errMsg(e)); idem.current = Math.random().toString(36).slice(2); qc.invalidateQueries({ queryKey: ['quote'] }); },
  });

  if (items.length === 0) return <div className="container max-w-2xl py-12"><Empty icon={ShoppingCart} title="Your cart is empty" text="Add medicines from the pharmacy or order straight from a prescription." action={<Button to="/pharmacy">Browse pharmacy</Button>} /></div>;

  const q = quote.data?.data;
  const cod = settings.data?.data.codEnabled !== false;
  const rxOk = !needsRx || prescriptionId;
  const canPlace = authed && addressId && q && rxOk && !quote.isError;

  return (
    <div className="container grid max-w-5xl gap-6 py-6 sm:py-10 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-5">
        <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">Your cart</h1>
        <Card className="divide-y divide-ink-100">
          {items.map(({ medicine: m, qty }) => (
            <div key={medId(m)} className="flex items-center gap-3 p-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-500"><Pill className="h-6 w-6" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink-900">{m.name}</p>
                <p className="text-xs text-ink-500">{inr(m.price)} each {m.requiresPrescription && <Badge tone="coral" className="ml-1"><ShieldAlert className="h-3 w-3" /> Rx</Badge>}</p>
              </div>
              <div className="flex items-center gap-1 rounded-xl bg-ink-100 p-1">
                <button aria-label="Decrease" className="rounded-lg p-1.5 hover:bg-white" onClick={() => setQty(medId(m), qty - 1)}><Minus className="h-4 w-4" /></button>
                <span className="w-6 text-center text-sm font-bold">{qty}</span>
                <button aria-label="Increase" className="rounded-lg p-1.5 hover:bg-white disabled:opacity-40" disabled={qty >= Math.min(10, m.stock || 10)} onClick={() => setQty(medId(m), qty + 1)}><Plus className="h-4 w-4" /></button>
              </div>
              <p className="w-16 text-right font-semibold text-ink-900">{inr(m.price * qty)}</p>
              <button aria-label="Remove" className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600" onClick={() => remove(medId(m))}><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </Card>

        {needsRx && (
          <Card className="border-coral-100 bg-coral-50/40 p-5">
            <SectionTitle title="Prescription required" subtitle="Some medicines need a valid prescription from your CarePulse doctor." />
            {!authed ? <p className="text-sm text-ink-600">Login to attach a prescription.</p> : rxList.isLoading ? <p className="text-sm text-ink-500">Loading prescriptions…</p> : (rxList.data?.data.length ? (
              <Select aria-label="Prescription" value={prescriptionId || ''} onChange={(e) => setPrescription(e.target.value || null)}>
                <option value="">Select a prescription…</option>
                {rxList.data.data.map((r) => <option key={r._id} value={r._id}>{r.code} · {r.diagnosis || 'Prescription'} · Dr. {r.doctorUser?.name}</option>)}
              </Select>
            ) : <p className="text-sm text-ink-600">No prescriptions found. <Link className="font-semibold text-brand-700" to="/doctors">Consult a doctor</Link> first.</p>)}
          </Card>
        )}
      </div>

      <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
        {!authed ? (
          <Card className="p-5 text-center"><p className="mb-3 text-ink-600">Login to place your order</p><Button to="/login" state={{ from: '/cart' }} className="w-full">Login / Sign up</Button></Card>
        ) : (
          <>
            <Card className="p-5">
              <SectionTitle title="Delivery address" action={<Button size="sm" variant="soft" onClick={() => setAddrOpen(true)}><Plus className="h-4 w-4" /> New</Button>} />
              {user.addresses?.length ? (
                <div className="space-y-2">
                  {user.addresses.map((a) => (
                    <label key={a._id} className={cn('flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3', addressId === a._id ? 'border-brand-600 bg-brand-50' : 'border-ink-100')}>
                      <input type="radio" name="addr" className="mt-1 accent-brand-600" checked={addressId === a._id} onChange={() => setAddressId(a._id)} />
                      <span className="text-sm"><b className="text-ink-900"><MapPin className="mr-1 inline h-3.5 w-3.5" />{a.label}</b><br /><span className="text-ink-600">{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city} {a.pincode}</span></span>
                    </label>
                  ))}
                </div>
              ) : <p className="text-sm text-ink-500">Add an address to continue.</p>}
            </Card>

            <Card className="p-5">
              <SectionTitle title="Payment" />
              <div className="grid grid-cols-2 gap-2">
                {[['online', 'Pay online', CreditCard], ...(cod ? [['cod', 'Cash on delivery', Wallet]] : [])].map(([v, t, Icon]) => (
                  <button key={v} type="button" aria-pressed={payMethod === v} onClick={() => setPayMethod(v)} className={cn('flex items-center gap-2 rounded-xl border-2 p-3 text-sm font-semibold', payMethod === v ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-ink-100 text-ink-600')}><Icon className="h-4 w-4" />{t}</button>
                ))}
              </div>
              <Textarea className="mt-3" rows={2} placeholder="Delivery instructions (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            </Card>

            <Card className="p-5">
              {quote.isError && <ErrorState error={quote.error} onRetry={quote.refetch} />}
              {q && (
                <dl className="divide-y divide-ink-100">
                  <KeyValue label="Items">{inr(q.subtotal)}</KeyValue>
                  <KeyValue label="Delivery">{q.deliveryFee ? inr(q.deliveryFee) : <span className="text-emerald-600">Free</span>}</KeyValue>
                  <KeyValue label="GST (included)">{inr(q.gst)}</KeyValue>
                  <div className="flex items-center justify-between pt-3"><dt className="font-semibold text-ink-900">Total</dt><dd className="font-display text-2xl font-extrabold text-ink-900">{inr(q.total)}</dd></div>
                </dl>
              )}
              {q && q.deliveryFee > 0 && settings.data && <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-500"><Truck className="h-3.5 w-3.5" />Free delivery above {inr(settings.data.data.freeDeliveryAbove)}</p>}
              <Button size="lg" className="mt-4 w-full" disabled={!canPlace} loading={place.isPending} onClick={() => place.mutate()}>
                {payMethod === 'online' ? 'Pay & place order' : 'Place order'}
              </Button>
              {!rxOk && <p className="mt-2 text-xs font-medium text-coral-600">Select a prescription to continue.</p>}
            </Card>
          </>
        )}
      </aside>

      <Modal open={addrOpen} onClose={() => setAddrOpen(false)} title="New delivery address">
        <AddressForm busy={addAddress.isPending} onSubmit={(v) => addAddress.mutate(v)} />
      </Modal>
    </div>
  );
}
