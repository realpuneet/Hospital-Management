import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { get, patch, post } from '../../lib/api.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { useAuth } from '../../lib/authStore.js';
import { Avatar, Badge, Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input, Select, Switch } from '../../components/ui/Form.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { CardSkeletons, Empty, ErrorState, errMsg, toast } from '../../components/ui/Feedback.jsx';
import { Modal } from '../../components/ui/Overlay.jsx';
import { Pager } from '../../components/common/Pager.jsx';
import { dateShort } from '../../lib/format.js';

const TABS = [{ value: '', label: 'All' }, { value: 'patient', label: 'Patients' }, { value: 'doctor', label: 'Doctors' }, { value: 'pharmacist', label: 'Pharmacy' }, { value: 'rider', label: 'Riders' }, { value: 'admin', label: 'Admins' }];
const blank = { name: '', email: '', phone: '', password: '', role: 'pharmacist' };

export default function AdminUsers() {
  const qc = useQueryClient();
  const me = useAuth((s) => s.user);
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null);
  const dq = useDebounce(search);
  const params = { page, limit: 20, role: role || undefined, q: dq || undefined };
  const q = useQuery({ queryKey: ['admin-users', params], queryFn: () => get('/admin/users', params), placeholderData: keepPreviousData });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }) => patch(`/admin/users/${id}/active`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (e) => toast.error(errMsg(e)),
  });
  const create = useMutation({
    mutationFn: () => post('/admin/staff', { ...form, phone: form.phone || undefined }),
    onSuccess: () => { toast.success('Staff account created'); setForm(null); qc.invalidateQueries({ queryKey: ['admin-users'] }); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const rows = q.data?.data || [];
  const valid = form && form.name.trim().length >= 2 && /^\S+@\S+\.\S+$/.test(form.email) && form.password.length >= 8;
  const f = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">Users</h1>
        <Button onClick={() => setForm({ ...blank })}><UserPlus className="h-4 w-4" /> Add staff</Button>
      </div>
      <Tabs tabs={TABS} value={role} onChange={(v) => { setRole(v); setPage(1); }} />
      <Input placeholder="Search name, email or phone…" aria-label="Search users" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      {q.isLoading && <CardSkeletons count={5} className="h-16" />}
      {q.isError && <ErrorState error={q.error} onRetry={q.refetch} />}
      {!q.isLoading && !q.isError && rows.length === 0 && <Empty title="No users found" />}
      <div className="space-y-2">
        {rows.map((u) => (
          <Card key={u._id} className="flex items-center gap-3 p-3.5">
            <Avatar name={u.name} src={u.avatar} size={42} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate font-semibold text-ink-900">{u.name}<Badge tone={u.role === 'admin' ? 'coral' : 'gray'}>{u.role}</Badge></p>
              <p className="truncate text-sm text-ink-500">{u.email || u.phone} · joined {dateShort(u.createdAt)}</p>
            </div>
            <Switch checked={u.isActive !== false} disabled={u._id === me?.id || u._id === me?._id || toggle.isPending} onChange={(v) => toggle.mutate({ id: u._id, isActive: v })} label={<span className="sr-only">Active</span>} />
          </Card>
        ))}
      </div>
      <Pager meta={q.data?.meta} onPage={setPage} />

      <Modal open={!!form} onClose={() => setForm(null)} title="Add staff account" footer={<Button className="w-full" disabled={!valid} loading={create.isPending} onClick={() => create.mutate()}>Create account</Button>}>
        {form && (
          <div className="space-y-3">
            <Select label="Role" value={form.role} onChange={f('role')}><option value="pharmacist">Pharmacist</option><option value="rider">Delivery rider</option><option value="admin">Admin</option></Select>
            <Input label="Full name" required value={form.name} onChange={f('name')} />
            <Input label="Email" type="email" required value={form.email} onChange={f('email')} />
            <Input label="Phone" type="tel" value={form.phone} onChange={f('phone')} />
            <Input label="Temporary password" required hint="Min 8 characters" value={form.password} onChange={f('password')} />
          </div>
        )}
      </Modal>
    </div>
  );
}
