import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LocateFixed } from 'lucide-react';
import { Input } from '../ui/Form.jsx';
import { Button } from '../ui/Button.jsx';
import { toast } from '../ui/Feedback.jsx';

const schema = z.object({
  label: z.string().max(30).optional(),
  line1: z.string().trim().min(3, 'Enter house / street'),
  line2: z.string().max(200).optional(),
  city: z.string().trim().min(2, 'Enter city'),
  state: z.string().max(60).optional(),
  pincode: z.string().regex(/^\d{6}$/, 'Enter 6 digit pincode'),
});

export function AddressForm({ initial, onSubmit, busy, submitLabel = 'Save address' }) {
  const { register, handleSubmit, setValue, getValues, formState: { errors } } = useForm({ resolver: zodResolver(schema), defaultValues: { label: 'Home', ...initial } });
  const coords = useRef(initial?.location);

  const locate = () => {
    if (!navigator.geolocation) return toast.error('Location is not supported on this device');
    navigator.geolocation.getCurrentPosition(
      (p) => { coords.current = { lat: p.coords.latitude, lng: p.coords.longitude }; setValue('label', getValues('label') || 'Home'); toast.success('Location pinned — helps the rider find you'); },
      () => toast.error('Could not get your location'),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };
  return (
    <form onSubmit={handleSubmit((v) => onSubmit({ ...v, ...(coords.current ? { location: coords.current } : {}) }))} className="space-y-4" noValidate>
      <Input label="Label" placeholder="Home, Office…" {...register('label')} />
      <Input label="House no. & street" required error={errors.line1?.message} {...register('line1')} />
      <Input label="Area / landmark" {...register('line2')} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="City" required error={errors.city?.message} {...register('city')} />
        <Input label="Pincode" inputMode="numeric" maxLength={6} required error={errors.pincode?.message} {...register('pincode')} />
      </div>
      <Input label="State" {...register('state')} />
      <Button type="button" variant="soft" size="sm" onClick={locate}><LocateFixed className="h-4 w-4" /> Pin my current location</Button>
      <Button type="submit" className="w-full" loading={busy}>{submitLabel}</Button>
    </form>
  );
}
