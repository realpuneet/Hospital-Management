import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { del, get, patch, post } from '../../lib/api.js';
import { Badge, Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input, Switch, Textarea } from '../../components/ui/Form.jsx';
import { CardSkeletons, Empty, ErrorState, errMsg, toast } from '../../components/ui/Feedback.jsx';
import { ConfirmDialog, Modal } from '../../components/ui/Overlay.jsx';

const blank = { name: '', description: '', icon: '', sortOrder: 0, isActive: true };

export default function AdminDepartments() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState(null); // null | {…form, _id?}
  const [rm, setRm] = useState(null);
  const q = useQuery({ queryKey: ['departments', 'admin'], queryFn: () => get('/admin/departments') });
  const refresh = () => qc.invalidateQueries({ queryKey: ['departments'] });

  const save = useMutation({
    mutationFn: () => {
      const { _id, ...b } = edit;
      const body = { name: b.name.trim(), description: b.description || undefined, icon: b.icon || undefined, sortOrder: Number(b.sortOrder) || 0, isActive: !!b.isActive };
      return _id ? patch(`/admin/departments/${_id}`, body) : post('/admin/departments', body);
    },
    onSuccess: () => { toast.success('Department saved'); setEdit(null); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const remove = useMutation({
    mutationFn: () => del(`/admin/departments/${rm._id}`),
    onSuccess: () => { toast.success('Department deleted'); setRm(null); refresh(); },
    onError: (e) => { toast.error(errMsg(e)); setRm(null); },
  });
  const items = q.data?.data || [];
  const f = (k) => (e) => setEdit((s) => ({ ...s, [k]: e.target.value }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">Departments</h1>
        <Button onClick={() => setEdit({ ...blank })}><Plus className="h-4 w-4" /> Add</Button>
      </div>
      {q.isLoading && <CardSkeletons count={4} className="h-16" />}
      {q.isError && <ErrorState error={q.error} onRetry={q.refetch} />}
      {!q.isLoading && !q.isError && items.length === 0 && <Empty title="No departments" text="Create departments before adding doctors." />}
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((d) => (
          <Card key={d._id} className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-semibold text-ink-900">{d.name}{d.isActive === false && <Badge tone="gray">Hidden</Badge>}</p>
              <p className="line-clamp-1 text-sm text-ink-500">{d.description || '—'}</p>
            </div>
            <Button size="icon" variant="ghost" aria-label={`Edit ${d.name}`} onClick={() => setEdit({ ...blank, ...d })}><Pencil className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" aria-label={`Delete ${d.name}`} className="text-red-600" onClick={() => setRm(d)}><Trash2 className="h-4 w-4" /></Button>
          </Card>
        ))}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?._id ? 'Edit department' : 'New department'} footer={<Button className="w-full" loading={save.isPending} disabled={!edit?.name || edit.name.trim().length < 2} onClick={() => save.mutate()}>Save</Button>}>
        {edit && (
          <div className="space-y-3">
            <Input label="Name" required value={edit.name} onChange={f('name')} />
            <Textarea label="Description" rows={2} value={edit.description || ''} onChange={f('description')} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Icon key" hint="e.g. heart, brain, bone" value={edit.icon || ''} onChange={f('icon')} />
              <Input label="Sort order" type="number" value={edit.sortOrder ?? 0} onChange={f('sortOrder')} />
            </div>
            <Switch checked={!!edit.isActive} onChange={(v) => setEdit((s) => ({ ...s, isActive: v }))} label="Visible to patients" />
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!rm} onClose={() => setRm(null)} onConfirm={() => remove.mutate()} loading={remove.isPending} danger title={`Delete ${rm?.name}?`} message="Departments that still have doctors cannot be deleted — hide them instead." confirmLabel="Delete" />
    </div>
  );
}
