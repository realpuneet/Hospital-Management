import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bike, MapPin, Navigation, PackageCheck, Phone } from 'lucide-react';
import { get, post, put } from '../../lib/api.js';
import { useAuth } from '../../lib/authStore.js';
import { Badge, Card, StatusBadge } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input, Switch } from '../../components/ui/Form.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { CardSkeletons, Empty, ErrorState, errMsg, toast } from '../../components/ui/Feedback.jsx';
import { Modal } from '../../components/ui/Overlay.jsx';
import { inr, timeAgo } from '../../lib/format.js';

const mapsUrl = (a) => {
  const l = a?.location;
  return l?.lat ? `https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([a?.line1, a?.city, a?.pincode].filter(Boolean).join(' '))}`;
};

export default function Deliveries() {
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const [online, setOnline] = useState(!!user?.rider?.online);
  const [tab, setTab] = useState('active');
  const [otpFor, setOtpFor] = useState(null);
  const [otp, setOtp] = useState('');
  const lastSent = useRef(0);

  const q = useQuery({ queryKey: ['rider-orders', tab], queryFn: () => get('/rider/orders', { history: tab === 'done' ? 'true' : undefined }), refetchInterval: 30_000 });
  const orders = q.data?.data || [];
  const hasOnTheWay = orders.some((o) => o.status === 'out_for_delivery');

  const avail = useMutation({
    mutationFn: (v) => put('/rider/availability', { online: v }),
    onSuccess: (_r, v) => { setOnline(v); toast.success(v ? 'You are online' : 'You are offline'); },
    onError: (e) => toast.error(errMsg(e)),
  });

  // GPS heartbeat — only while online and carrying orders; throttled to one push / 8s (server rate-limits too)
  useEffect(() => {
    if (!online || !hasOnTheWay || !('geolocation' in navigator)) return undefined;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const now = Date.now();
        if (now - lastSent.current < 8000) return;
        lastSent.current = now;
        post('/rider/location', { lat: p.coords.latitude, lng: p.coords.longitude }).catch(() => {});
      },
      () => toast.error('Location unavailable — enable GPS so patients can track you'),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [online, hasOnTheWay]);

  const act = useMutation({
    mutationFn: ({ id, action, otp: code }) => post(`/rider/orders/${id}/action`, { action, otp: code }),
    onSuccess: (_r, v) => { toast.success(v.action === 'pickup' ? 'Picked up — drive safe!' : 'Delivered. Great job!'); setOtpFor(null); setOtp(''); qc.invalidateQueries({ queryKey: ['rider-orders'] }); },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card className="flex items-center gap-3 p-4">
        <span className={`grid h-11 w-11 place-items-center rounded-2xl ${online ? 'bg-emerald-50 text-emerald-600' : 'bg-ink-100 text-ink-500'}`}><Bike className="h-5 w-5" /></span>
        <div className="flex-1"><p className="font-display font-bold text-ink-900">{online ? 'You are online' : 'You are offline'}</p><p className="text-xs text-ink-500">{online ? 'New orders can be assigned to you.' : 'Go online to receive deliveries.'}</p></div>
        <Switch checked={online} disabled={avail.isPending} onChange={(v) => avail.mutate(v)} label={<span className="sr-only">Online</span>} />
      </Card>
      <Tabs tabs={[{ value: 'active', label: 'Active' }, { value: 'done', label: 'Completed' }]} value={tab} onChange={setTab} />
      {q.isLoading && <CardSkeletons count={2} className="h-44" />}
      {q.isError && <ErrorState error={q.error} onRetry={q.refetch} />}
      {!q.isLoading && !q.isError && orders.length === 0 && <Empty icon={PackageCheck} title={tab === 'active' ? 'No deliveries assigned' : 'No completed deliveries yet'} />}
      {orders.map((o) => (
        <Card key={o._id} className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-ink-500">{o.code}</span><StatusBadge status={o.status} />
            {o.payMethod === 'cod' && <Badge tone="amber">Collect {inr(o.total)}</Badge>}
            <span className="ml-auto text-xs text-ink-400">{timeAgo(o.updatedAt)}</span>
          </div>
          <div className="text-sm">
            <p className="flex items-start gap-1.5 font-semibold text-ink-900"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-coral-500" />{o.address?.name}</p>
            <p className="ml-5.5 pl-0.5 text-ink-600">{[o.address?.line1, o.address?.line2, o.address?.city, o.address?.pincode].filter(Boolean).join(', ')}</p>
          </div>
          <p className="text-sm text-ink-500">{o.items.length} item{o.items.length > 1 ? 's' : ''}: {o.items.map((i) => `${i.name} ×${i.qty}`).join(', ')}</p>
          {o.status !== 'delivered' && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" href={mapsUrl(o.address)} target="_blank" rel="noopener noreferrer"><Navigation className="h-4 w-4" /> Navigate</Button>
              {o.address?.phone && <Button size="sm" variant="secondary" href={`tel:${o.address.phone}`}><Phone className="h-4 w-4" /> Call</Button>}
              {o.status === 'packed' && <Button size="sm" loading={act.isPending} onClick={() => act.mutate({ id: o._id, action: 'pickup' })}>Picked up</Button>}
              {o.status === 'out_for_delivery' && <Button size="sm" onClick={() => { setOtpFor(o); setOtp(''); }}>Deliver</Button>}
              {['confirmed'].includes(o.status) && <Badge tone="gray">Waiting for pharmacy to pack</Badge>}
            </div>
          )}
        </Card>
      ))}

      <Modal open={!!otpFor} onClose={() => setOtpFor(null)} size="sm" title="Confirm delivery" footer={<Button className="w-full" disabled={otp.length !== 4} loading={act.isPending} onClick={() => act.mutate({ id: otpFor._id, action: 'deliver', otp })}>Complete delivery</Button>}>
        <p className="mb-3 text-sm text-ink-600">Ask the patient for the 4-digit delivery code shown in their app.</p>
        <Input label="Delivery code" inputMode="numeric" maxLength={4} autoFocus value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))} className="text-center text-2xl font-bold tracking-[0.5em]" />
      </Modal>
    </div>
  );
}
