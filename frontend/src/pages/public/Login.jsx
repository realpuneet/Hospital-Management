import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MessageCircle, KeyRound } from 'lucide-react';
import { post } from '../../lib/api.js';
import { useAuth, homeFor } from '../../lib/authStore.js';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Form.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { errMsg, toast } from '../../components/ui/Feedback.jsx';

const pwSchema = z.object({ identifier: z.string().min(3, 'Enter your email or phone'), password: z.string().min(1, 'Enter your password') });
const phoneSchema = z.object({ phone: z.string().regex(/^\+?[\d\s-]{10,15}$/, 'Enter a valid mobile number') });

function useAfterLogin() {
  const nav = useNavigate();
  const { state } = useLocation();
  const setSession = useAuth((s) => s.setSession);
  return (session) => {
    setSession(session);
    nav(state?.from && session.user.role === 'patient' ? state.from : homeFor(session.user.role), { replace: true });
  };
}

function PasswordForm() {
  const done = useAfterLogin();
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(pwSchema) });
  const submit = async (v) => {
    setBusy(true);
    try { done((await post('/auth/login', v)).data); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <Input label="Email or mobile" autoComplete="username" inputMode="email" error={errors.identifier?.message} {...register('identifier')} />
      <Input label="Password" type="password" autoComplete="current-password" error={errors.password?.message} {...register('password')} />
      <Button type="submit" size="lg" className="w-full" loading={busy}>Login</Button>
    </form>
  );
}

function OtpForm() {
  const done = useAfterLogin();
  const [stage, setStage] = useState('phone');
  const [phone, setPhone] = useState('');
  const [devOtp, setDevOtp] = useState(null);
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(phoneSchema) });

  const send = async (v) => {
    setBusy(true);
    try {
      const r = await post('/auth/otp/request', v);
      setPhone(v.phone);
      setDevOtp(r.data.devOtp || null);
      setStage('otp');
      toast.success('OTP sent on WhatsApp');
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const verify = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { done((await post('/auth/otp/verify', { phone, otp })).data); } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  if (stage === 'phone') {
    return (
      <form onSubmit={handleSubmit(send)} className="space-y-4" noValidate>
        <Input label="Mobile number" inputMode="tel" autoComplete="tel" placeholder="98765 43210" error={errors.phone?.message} {...register('phone')} />
        <Button type="submit" size="lg" className="w-full" loading={busy}><MessageCircle className="h-4 w-4" /> Send OTP on WhatsApp</Button>
        <p className="text-center text-xs text-ink-500">New here? We'll create your account automatically.</p>
      </form>
    );
  }
  return (
    <form onSubmit={verify} className="space-y-4">
      <p className="text-sm text-ink-600">Enter the 6 digit code sent to <b>{phone}</b></p>
      <Input label="OTP" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} className="text-center text-xl tracking-[0.5em]" />
      {devOtp && <p className="rounded-xl bg-amber-50 p-2 text-center text-xs text-amber-700">Dev mode OTP: <b>{devOtp}</b></p>}
      <Button type="submit" size="lg" className="w-full" loading={busy} disabled={otp.length !== 6}>Verify & continue</Button>
      <button type="button" className="w-full text-sm font-semibold text-brand-700" onClick={() => setStage('phone')}>Change number</button>
    </form>
  );
}

export default function Login() {
  const [tab, setTab] = useState('password');
  return (
    <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-8">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600"><KeyRound className="h-6 w-6" /></span>
          <h1 className="font-display text-2xl font-extrabold text-ink-900">Welcome back</h1>
          <p className="mt-1 text-sm text-ink-500">Login to manage appointments, prescriptions and orders</p>
        </div>
        <Tabs className="mb-5" tabs={[{ value: 'password', label: 'Password' }, { value: 'otp', label: 'WhatsApp OTP' }]} value={tab} onChange={setTab} />
        {tab === 'password' ? <PasswordForm /> : <OtpForm />}
        <p className="mt-6 text-center text-sm text-ink-500">No account? <Link to="/register" className="font-semibold text-brand-700">Create one</Link></p>
      </Card>
    </div>
  );
}
