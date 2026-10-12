import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus } from 'lucide-react';
import { post } from '../../lib/api.js';
import { useAuth } from '../../lib/authStore.js';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Form.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { errMsg, toast } from '../../components/ui/Feedback.jsx';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter your full name'),
  phone: z.string().regex(/^\+?[\d\s-]{10,15}$/, 'Enter a valid mobile number'),
  email: z.string().trim().email('Enter a valid email').or(z.literal('')),
  password: z.string().min(8, 'At least 8 characters').regex(/[A-Za-z]/, 'Include a letter').regex(/\d/, 'Include a number'),
});

export default function Register() {
  const nav = useNavigate();
  const setSession = useAuth((s) => s.setSession);
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });
  const submit = async (v) => {
    setBusy(true);
    try {
      const r = await post('/auth/register', { ...v, email: v.email || undefined });
      setSession(r.data);
      toast.success('Account created');
      nav('/', { replace: true });
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-8">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600"><UserPlus className="h-6 w-6" /></span>
          <h1 className="font-display text-2xl font-extrabold text-ink-900">Create your account</h1>
          <p className="mt-1 text-sm text-ink-500">Book doctors and track your care in one place</p>
        </div>
        <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
          <Input label="Full name" autoComplete="name" required error={errors.name?.message} {...register('name')} />
          <Input label="Mobile number" inputMode="tel" autoComplete="tel" required hint="Used for WhatsApp confirmations (optional channel)" error={errors.phone?.message} {...register('phone')} />
          <Input label="Email" type="email" autoComplete="email" hint="Optional – for email confirmations and receipts" error={errors.email?.message} {...register('email')} />
          <Input label="Password" type="password" autoComplete="new-password" required error={errors.password?.message} {...register('password')} />
          <Button type="submit" size="lg" className="w-full" loading={busy}>Create account</Button>
        </form>
        <p className="mt-6 text-center text-sm text-ink-500">Already registered? <Link to="/login" className="font-semibold text-brand-700">Login</Link></p>
      </Card>
    </div>
  );
}
