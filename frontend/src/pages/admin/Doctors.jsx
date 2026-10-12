import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import { get, patch, post } from '../../lib/api.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { Avatar, Badge, Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Checkbox, Input, Select, Switch, TagInput, Textarea } from '../../components/ui/Form.jsx';
import { CardSkeletons, Empty, ErrorState, errMsg, toast } from '../../components/ui/Feedback.jsx';
import { Modal } from '../../components/ui/Overlay.jsx';
import { Pager } from '../../components/common/Pager.jsx';
import { WeeklyEditor, weeklyValid } from '../../components/common/WeeklyEditor.jsx';
import { ImageUpload } from '../../components/ui/ImageUpload.jsx';
import { inr } from '../../lib/format.js';

const blank = {
  name: '', email: '', phone: '', password: '', department: '', specialization: '', registrationNo: '', experienceYears: 0, bio: '', room: '',
  qualifications: [], languages: [], conditionsTreated: [], fees: { in_person: 500, video: 400 }, modes: ['in_person'], slotMinutes: 15, avatar: null,
  weekly: [{ day: 1, ranges: [{ start: '09:00', end: '13:00' }] }], isActive: true, isAcceptingBookings: true,
};

export default function AdminDoctors() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null);
  const dq = useDebounce(search);
  const params = { page, limit: 20, q: dq || undefined };
  const q = useQuery({ queryKey: ['admin-doctors', params], queryFn: () => get('/admin/doctors', params), placeholderData: keepPreviousData });
  const depts = useQuery({ queryKey: ['departments', 'admin'], queryFn: () => get('/admin/departments') });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const isNew = form && !form._id;

  const save = useMutation({
    mutationFn: () => {
      const f = form;
      const common = {
        name: f.name.trim(), department: f.department?._id || f.department, specialization: f.specialization || undefined, registrationNo: f.registrationNo || undefined,
        experienceYears: Number(f.experienceYears) || 0, bio: f.bio || undefined, room: f.room || undefined, qualifications: f.qualifications, languages: f.languages,
        conditionsTreated: f.conditionsTreated, fees: { in_person: Number(f.fees?.in_person) || 0, video: Number(f.fees?.video) || 0 }, modes: f.modes,
        slotMinutes: Number(f.slotMinutes) || 15, avatar: f.avatar || null, weekly: f.weekly,
      };
      if (isNew) return post('/admin/doctors', { ...common, email: f.email.trim(), phone: f.phone || undefined, password: f.password });
      return patch(`/admin/doctors/${f._id}`, { ...common, isActive: f.isActive, isAcceptingBookings: f.isAcceptingBookings });
    },
    onSuccess: () => { toast.success(isNew ? 'Doctor added' : 'Doctor updated'); setForm(null); qc.invalidateQueries({ queryKey: ['admin-doctors'] }); },
    onError: (e) => toast.error(errMsg(e)),
  });

  const valid = form && form.name.trim().length >= 2 && (form.department?._id || form.department) && form.modes.length > 0 && weeklyValid(form.weekly) && (!isNew || (/^\S+@\S+\.\S+$/.test(form.email) && form.password.length >= 8));
  const rows = q.data?.data || [];
  const toggleMode = (m) => set('modes', form.modes.includes(m) ? form.modes.filter((x) => x !== m) : [...form.modes, m]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">Doctors</h1>
        <Button onClick={() => setForm(JSON.parse(JSON.stringify(blank)))}><Plus className="h-4 w-4" /> Add doctor</Button>
      </div>
      <Input placeholder="Search by name…" aria-label="Search doctors" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      {q.isLoading && <CardSkeletons count={4} className="h-20" />}
      {q.isError && <ErrorState error={q.error} onRetry={q.refetch} />}
      {!q.isLoading && !q.isError && rows.length === 0 && <Empty title="No doctors" text="Add the first doctor to start taking appointments." />}
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((d) => (
          <Card key={d._id} className="flex items-center gap-3 p-4">
            <Avatar name={d.name} src={d.avatar} size={52} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink-900">{d.name}</p>
              <p className="truncate text-sm text-ink-500">{d.specialization} · {d.department?.name}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Badge tone="brand">{inr(d.fees?.in_person)} / {inr(d.fees?.video)}</Badge>
                {d.user?.isActive === false || d.isActive === false ? <Badge tone="red">Inactive</Badge> : !d.isAcceptingBookings ? <Badge tone="amber">Paused</Badge> : <Badge tone="green">Live</Badge>}
              </div>
            </div>
            <Button size="icon" variant="ghost" aria-label={`Edit ${d.name}`} onClick={() => setForm({ ...blank, ...JSON.parse(JSON.stringify(d)), department: d.department?._id, isActive: d.isActive !== false })}><Pencil className="h-4 w-4" /></Button>
          </Card>
        ))}
      </div>
      <Pager meta={q.data?.meta} onPage={setPage} />

      <Modal open={!!form} onClose={() => setForm(null)} size="xl" title={isNew ? 'Add doctor' : `Edit ${form?.name || 'doctor'}`} footer={<Button className="w-full" disabled={!valid} loading={save.isPending} onClick={() => save.mutate()}>{isNew ? 'Create doctor account' : 'Save changes'}</Button>}>
        {form && (
          <div className="space-y-5">
            <ImageUpload label="Photo" shape="circle" value={form.avatar} onChange={(v) => set('avatar', v)} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Full name" required value={form.name} onChange={(e) => set('name', e.target.value)} />
              <Select label="Department" required value={form.department?._id || form.department || ''} onChange={(e) => set('department', e.target.value)}>
                <option value="">Select…</option>
                {(depts.data?.data || []).map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
              </Select>
              {isNew && <Input label="Login email" required type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />}
              {isNew && <Input label="Phone" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} />}
              {isNew && <Input label="Temporary password" required type="text" hint="Min 8 characters — doctor can change it later" value={form.password} onChange={(e) => set('password', e.target.value)} />}
              <Input label="Specialization" value={form.specialization || ''} onChange={(e) => set('specialization', e.target.value)} />
              <Input label="Registration no." value={form.registrationNo || ''} onChange={(e) => set('registrationNo', e.target.value)} />
              <Input label="Experience (years)" type="number" min="0" value={form.experienceYears ?? 0} onChange={(e) => set('experienceYears', e.target.value)} />
              <Input label="Room / cabin" value={form.room || ''} onChange={(e) => set('room', e.target.value)} />
            </div>
            <Textarea label="About" rows={3} value={form.bio || ''} onChange={(e) => set('bio', e.target.value)} />
            <div className="grid gap-3 sm:grid-cols-2">
              <TagInput label="Qualifications" value={form.qualifications || []} onChange={(v) => set('qualifications', v)} />
              <TagInput label="Languages" value={form.languages || []} onChange={(v) => set('languages', v)} />
            </div>
            <TagInput label="Conditions treated" value={form.conditionsTreated || []} onChange={(v) => set('conditionsTreated', v)} />
            <div className="grid gap-3 sm:grid-cols-3">
              <Input label="In-clinic fee (₹)" type="number" min="0" value={form.fees?.in_person ?? 0} onChange={(e) => set('fees', { ...form.fees, in_person: e.target.value })} />
              <Input label="Video fee (₹)" type="number" min="0" value={form.fees?.video ?? 0} onChange={(e) => set('fees', { ...form.fees, video: e.target.value })} />
              <Select label="Slot length" value={form.slotMinutes} onChange={(e) => set('slotMinutes', e.target.value)}>{[10, 15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}</Select>
            </div>
            <div className="flex flex-wrap gap-5">
              <Checkbox checked={form.modes.includes('in_person')} onChange={() => toggleMode('in_person')} label="In-clinic visits" />
              <Checkbox checked={form.modes.includes('video')} onChange={() => toggleMode('video')} label="Video consults" />
            </div>
            {!isNew && (
              <div className="space-y-2">
                <Switch checked={!!form.isAcceptingBookings} onChange={(v) => set('isAcceptingBookings', v)} label="Accepting new bookings" />
                <Switch checked={!!form.isActive} onChange={(v) => set('isActive', v)} label="Listed on the website" />
              </div>
            )}
            <div>
              <p className="mb-1 font-display font-bold text-ink-900">Weekly timings</p>
              <WeeklyEditor value={form.weekly} onChange={(v) => set('weekly', v)} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
