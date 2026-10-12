import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Mail, MessageCircle, Pencil, Plus, Trash2, LogOut } from 'lucide-react';
import { del, patch, post } from '../../lib/api.js';
import { useAuth } from '../../lib/authStore.js';
import { disconnectSocket } from '../../lib/socket.js';
import { Avatar, Badge, Card, SectionTitle } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input, Select, Switch, TagInput } from '../../components/ui/Form.jsx';
import { ImageUpload } from '../../components/ui/ImageUpload.jsx';
import { Modal } from '../../components/ui/Overlay.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { errMsg, toast } from '../../components/ui/Feedback.jsx';
import { AddressForm } from '../../components/common/AddressForm.jsx';
import { ageFrom } from '../../lib/format.js';

const dobVal = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

function Personal() {
  const { user, setUser } = useAuth();
  const [allergies, setAllergies] = useState(user.allergies || []);
  const [conditions, setConditions] = useState(user.chronicConditions || []);
  const [avatar, setAvatar] = useState(user.avatar);
  const { register, handleSubmit } = useForm({ defaultValues: { name: user.name, email: user.email || '', phone: user.phone || '', gender: user.gender || '', dob: dobVal(user.dob), bloodGroup: user.bloodGroup || '' } });
  const m = useMutation({
    mutationFn: (v) => patch('/me/profile', {
      name: v.name, email: v.email || undefined, phone: v.phone || undefined, gender: v.gender || undefined,
      dob: v.dob || undefined, bloodGroup: v.bloodGroup || null, allergies, chronicConditions: conditions, avatar,
    }),
    onSuccess: (r) => { setUser(r.data); toast.success('Profile updated'); },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <form onSubmit={handleSubmit((v) => m.mutate(v))} className="space-y-4">
      <ImageUpload label="Photo" shape="round" value={avatar} onChange={setAvatar} />
      <Input label="Full name" {...register('name', { required: true })} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Email" type="email" {...register('email')} />
        <Input label="Mobile" inputMode="tel" {...register('phone')} />
        <Select label="Gender" {...register('gender')}><option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></Select>
        <Input label="Date of birth" type="date" max={new Date().toISOString().slice(0, 10)} hint={user.dob ? `${ageFrom(user.dob)} years` : undefined} {...register('dob')} />
        <Select label="Blood group" {...register('bloodGroup')}><option value="">Unknown</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => <option key={b}>{b}</option>)}</Select>
      </div>
      <TagInput label="Allergies" value={allergies} onChange={setAllergies} placeholder="e.g. Penicillin" />
      <TagInput label="Chronic conditions" value={conditions} onChange={setConditions} placeholder="e.g. Diabetes" />
      <p className="text-xs text-ink-500">Allergies and conditions are shared with your doctor during consultations.</p>
      <Button type="submit" loading={m.isPending}>Save changes</Button>
    </form>
  );
}

function Notify() {
  const { user, setUser } = useAuth();
  const p = user.prefs || {};
  const [waNum, setWaNum] = useState(p.whatsappNumber || user.phone || '');
  const m = useMutation({
    mutationFn: (patchBody) => patch('/me/preferences', patchBody),
    onSuccess: (r) => { setUser(r.data); toast.success('Saved'); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const set = (k) => (v) => m.mutate({ [k]: v });
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <SectionTitle title="Appointment confirmations" subtitle="In-app alerts are always on. Email and WhatsApp are optional." />
        <Switch checked={p.emailConfirmations} onChange={set('emailConfirmations')} label={<span className="flex items-center gap-1.5"><Mail className="h-4 w-4" /> Email confirmations</span>} description={user.email ? `Booking, reschedule, cancellation and prescription alerts to ${user.email}` : 'Add an email address in the Personal tab first'} disabled={!user.email} />
        <Switch checked={p.whatsappConfirmations} onChange={set('whatsappConfirmations')} label={<span className="flex items-center gap-1.5"><MessageCircle className="h-4 w-4" /> WhatsApp confirmations</span>} description="Instant confirmations on WhatsApp" />
        <div className="mt-2 flex items-end gap-2">
          <Input wrapperClass="flex-1" label="WhatsApp number" inputMode="tel" value={waNum} onChange={(e) => setWaNum(e.target.value)} hint="Include country code if outside India" />
          <Button variant="secondary" loading={m.isPending} onClick={() => m.mutate({ whatsappNumber: waNum })}>Update</Button>
        </div>
        <p className="mt-2 text-xs text-ink-400">You can also change these for each booking at checkout.</p>
      </Card>
      <Card className="p-5">
        <SectionTitle title="Reminders" />
        <Switch checked={p.emailReminders} onChange={set('emailReminders')} label="Email reminders" description="Appointment & medicine reminders by email" disabled={!user.email} />
        <Switch checked={p.whatsappReminders} onChange={set('whatsappReminders')} label="WhatsApp reminders" description="Appointment & medicine reminders on WhatsApp" />
        <Switch checked={p.medicineReminders} onChange={set('medicineReminders')} label="Medicine dose reminders" description="Notify me at each dose time" />
        <Switch checked={p.orderUpdates} onChange={set('orderUpdates')} label="Order updates by email" description="Status changes for medicine deliveries" disabled={!user.email} />
      </Card>
    </div>
  );
}

function Addresses() {
  const { user, setUser } = useAuth();
  const [edit, setEdit] = useState(null); // null | 'new' | address
  const save = useMutation({
    mutationFn: (v) => (edit === 'new' ? post('/me/addresses', v) : patch(`/me/addresses/${edit._id}`, v)),
    onSuccess: (r) => { setUser({ ...user, addresses: r.data }); setEdit(null); toast.success('Address saved'); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const remove = useMutation({ mutationFn: (id) => del(`/me/addresses/${id}`), onSuccess: (r) => setUser({ ...user, addresses: r.data }), onError: (e) => toast.error(errMsg(e)) });
  return (
    <div className="space-y-3">
      {user.addresses?.map((a) => (
        <Card key={a._id} className="flex items-start justify-between gap-3 p-4">
          <div className="text-sm"><p className="font-semibold text-ink-900">{a.label} {a.isDefault && <Badge tone="brand">Default</Badge>}</p><p className="text-ink-600">{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city} {a.pincode}</p></div>
          <div className="flex gap-1"><Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEdit(a)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label="Delete" onClick={() => remove.mutate(a._id)}><Trash2 className="h-4 w-4 text-red-500" /></Button></div>
        </Card>
      ))}
      <Button variant="secondary" onClick={() => setEdit('new')}><Plus className="h-4 w-4" /> Add address</Button>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit === 'new' ? 'New address' : 'Edit address'}>
        {edit && <AddressForm initial={edit === 'new' ? undefined : edit} busy={save.isPending} onSubmit={(v) => save.mutate(v)} />}
      </Modal>
    </div>
  );
}

function Family() {
  const { user, setUser } = useAuth();
  const [edit, setEdit] = useState(null);
  const { register, handleSubmit, reset } = useForm();
  const open = (m) => { setEdit(m); reset(m === 'new' ? { relation: 'Child', gender: 'other' } : { name: m.name, relation: m.relation, gender: m.gender, dob: dobVal(m.dob) }); };
  const save = useMutation({
    mutationFn: (v) => { const b = { ...v, dob: v.dob || undefined }; return edit === 'new' ? post('/me/members', b) : patch(`/me/members/${edit._id}`, b); },
    onSuccess: (r) => { setUser({ ...user, familyMembers: r.data }); setEdit(null); toast.success('Saved'); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const remove = useMutation({ mutationFn: (id) => del(`/me/members/${id}`), onSuccess: (r) => setUser({ ...user, familyMembers: r.data }), onError: (e) => toast.error(errMsg(e)) });
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-500">Book appointments for family members from your account.</p>
      {user.familyMembers?.map((m) => (
        <Card key={m._id} className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3"><Avatar name={m.name} size={40} /><div className="text-sm"><p className="font-semibold text-ink-900">{m.name}</p><p className="text-ink-500">{m.relation}{m.dob ? ` · ${ageFrom(m.dob)} yrs` : ''}</p></div></div>
          <div className="flex gap-1"><Button size="icon" variant="ghost" aria-label="Edit" onClick={() => open(m)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label="Delete" onClick={() => remove.mutate(m._id)}><Trash2 className="h-4 w-4 text-red-500" /></Button></div>
        </Card>
      ))}
      <Button variant="secondary" onClick={() => open('new')}><Plus className="h-4 w-4" /> Add member</Button>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit === 'new' ? 'Add family member' : 'Edit member'} footer={<Button className="w-full" loading={save.isPending} onClick={handleSubmit((v) => save.mutate(v))}>Save</Button>}>
        <form className="space-y-4" onSubmit={handleSubmit((v) => save.mutate(v))}>
          <Input label="Name" required {...register('name', { required: true })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Relation" {...register('relation')} />
            <Select label="Gender" {...register('gender')}><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></Select>
          </div>
          <Input label="Date of birth" type="date" {...register('dob')} />
        </form>
      </Modal>
    </div>
  );
}

function Security() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const clear = useAuth((s) => s.clear);
  const { register, handleSubmit, reset } = useForm();
  const change = useMutation({
    mutationFn: (v) => post('/me/password', v),
    onSuccess: () => { toast.success('Password changed — please login again'); reset(); disconnectSocket(); clear(); nav('/login'); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const logout = async () => { await post('/auth/logout').catch(() => {}); disconnectSocket(); clear(); qc.clear(); nav('/login'); };
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <SectionTitle title="Change password" />
        <form className="space-y-4" onSubmit={handleSubmit((v) => change.mutate(v))}>
          <Input label="Current password" type="password" autoComplete="current-password" {...register('currentPassword')} />
          <Input label="New password" type="password" autoComplete="new-password" hint="Min 8 characters with a letter and a number" {...register('newPassword', { required: true, minLength: 8 })} />
          <Button type="submit" loading={change.isPending}>Update password</Button>
        </form>
      </Card>
      <Button variant="secondary" onClick={logout} className="w-full"><LogOut className="h-4 w-4" /> Logout</Button>
    </div>
  );
}

export default function Profile() {
  const user = useAuth((s) => s.user);
  const [tab, setTab] = useState('personal');
  const patient = user.role === 'patient';
  const tabs = patient
    ? [{ value: 'personal', label: 'Personal' }, { value: 'notify', label: 'Notifications' }, { value: 'addresses', label: 'Addresses' }, { value: 'family', label: 'Family' }, { value: 'security', label: 'Security' }]
    : [{ value: 'personal', label: 'Personal' }, { value: 'security', label: 'Security' }];
  return (
    <div className="container max-w-3xl py-6 sm:py-10">
      <div className="mb-5 flex items-center gap-4">
        <Avatar name={user.name} src={user.avatar} size={64} />
        <div><h1 className="font-display text-2xl font-extrabold text-ink-900">{user.name}</h1><p className="text-sm text-ink-500">{user.email || user.phone}</p></div>
      </div>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      <div className="mt-5">
        {tab === 'personal' && <Card className="p-5"><Personal /></Card>}
        {tab === 'notify' && <Notify />}
        {tab === 'addresses' && <Addresses />}
        {tab === 'family' && <Family />}
        {tab === 'security' && <Security />}
      </div>
    </div>
  );
}
