import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, put } from '../../lib/api.js';
import { Card, SectionTitle } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input, Switch, Textarea } from '../../components/ui/Form.jsx';
import { ErrorState, Skeleton, errMsg, toast } from '../../components/ui/Feedback.jsx';

const NUM = ['slotHoldMinutes', 'bookingWindowDays', 'minLeadMinutes', 'freeCancelHours', 'maxReschedules', 'deliveryFee', 'freeDeliveryAbove', 'gstPercent'];

export default function AdminSettings() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-settings'], queryFn: () => get('/admin/settings') });
  const [s, setS] = useState(null);
  useEffect(() => { if (q.data) setS(q.data.data); }, [q.data]);
  const save = useMutation({
    mutationFn: () => put('/admin/settings', Object.fromEntries(Object.entries(s).map(([k, v]) => [k, NUM.includes(k) ? Number(v) : v]))),
    onSuccess: (r) => { toast.success('Settings saved'); setS(r.data); qc.invalidateQueries({ queryKey: ['settings'] }); qc.invalidateQueries({ queryKey: ['admin-settings'] }); },
    onError: (e) => toast.error(errMsg(e)),
  });
  if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;
  if (!s) return <Skeleton className="h-96" />;
  const f = (k) => (e) => setS((x) => ({ ...x, [k]: e.target.value }));
  const n = (k, label, hint, props = {}) => <Input label={label} hint={hint} type="number" min="0" value={s[k] ?? ''} onChange={f(k)} {...props} />;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-display text-2xl font-extrabold text-ink-900">Settings</h1>
      <Card className="space-y-3 p-5">
        <SectionTitle title="Hospital" />
        <Input label="Hospital name" value={s.hospitalName || ''} onChange={f('hospitalName')} />
        <Input label="Helpline" value={s.helpline || ''} onChange={f('helpline')} />
        <Textarea label="Address" rows={2} value={s.address || ''} onChange={f('address')} />
      </Card>
      <Card className="space-y-3 p-5">
        <SectionTitle title="Booking rules" />
        <div className="grid gap-3 sm:grid-cols-2">
          {n('slotHoldMinutes', 'Payment hold (minutes)', 'How long a slot is held while paying')}
          {n('bookingWindowDays', 'Booking window (days)', 'How far ahead patients can book')}
          {n('minLeadMinutes', 'Minimum lead time (minutes)')}
          {n('freeCancelHours', 'Free cancellation (hours before)')}
          {n('maxReschedules', 'Max reschedules per booking')}
        </div>
        <Switch checked={!!s.paymentRequired} onChange={(v) => setS((x) => ({ ...x, paymentRequired: v }))} label="Require online payment to confirm" description="Off = booking is confirmed immediately and the fee is paid at the clinic." />
      </Card>
      <Card className="space-y-3 p-5">
        <SectionTitle title="Medicine delivery" />
        <div className="grid gap-3 sm:grid-cols-3">
          {n('deliveryFee', 'Delivery fee (₹)')}
          {n('freeDeliveryAbove', 'Free above (₹)')}
          {n('gstPercent', 'GST %', undefined, { step: '0.1' })}
        </div>
        <Switch checked={!!s.codEnabled} onChange={(v) => setS((x) => ({ ...x, codEnabled: v }))} label="Allow cash on delivery" />
      </Card>
      <Button size="lg" className="w-full sm:w-auto" loading={save.isPending} onClick={() => save.mutate()}>Save settings</Button>
    </div>
  );
}
