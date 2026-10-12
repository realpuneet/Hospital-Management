import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, PackagePlus, Pencil, Plus } from 'lucide-react';
import { get, patch, post } from '../../lib/api.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { Badge, Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input, Switch, Textarea } from '../../components/ui/Form.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { CardSkeletons, Empty, ErrorState, errMsg, toast } from '../../components/ui/Feedback.jsx';
import { Modal } from '../../components/ui/Overlay.jsx';
import { Pager } from '../../components/common/Pager.jsx';
import { inr } from '../../lib/format.js';

const blank = { name: '', generic: '', manufacturer: '', category: '', form: '', strength: '', packSize: '', description: '', mrp: 0, price: 0, stock: 0, lowStockAt: 10, requiresPrescription: false, isActive: true };
const clean = (m) => ({
  name: m.name.trim(), generic: m.generic || undefined, manufacturer: m.manufacturer || undefined, category: m.category || undefined, form: m.form || undefined,
  strength: m.strength || undefined, packSize: m.packSize || undefined, description: m.description || undefined, mrp: Number(m.mrp), price: Number(m.price),
  stock: Number(m.stock) || 0, lowStockAt: Number(m.lowStockAt) || 0, requiresPrescription: !!m.requiresPrescription, isActive: !!m.isActive,
});

/** Inventory — used by admin (/admin/medicines) and pharmacist (/pharmacist/inventory). */
export default function Medicines() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null);
  const [adj, setAdj] = useState(null);
  const dq = useDebounce(search);
  const params = { page, limit: 20, q: dq || undefined, lowStock: tab === 'low' ? 'true' : undefined };
  const q = useQuery({ queryKey: ['pharmacy-medicines', params], queryFn: () => get('/pharmacy/medicines', params), placeholderData: keepPreviousData });
  const refresh = () => qc.invalidateQueries({ queryKey: ['pharmacy-medicines'] });
  const f = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const save = useMutation({
    mutationFn: () => (form._id ? patch(`/pharmacy/medicines/${form._id}`, clean(form)) : post('/pharmacy/medicines', clean(form))),
    onSuccess: () => { toast.success('Medicine saved'); setForm(null); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const stock = useMutation({
    mutationFn: () => post(`/pharmacy/medicines/${adj.m._id}/stock`, { delta: Number(adj.delta), reason: adj.reason || undefined }),
    onSuccess: () => { toast.success('Stock updated'); setAdj(null); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const rows = q.data?.data || [];
  const validForm = form && form.name.trim().length >= 2 && Number(form.price) >= 0 && Number(form.mrp) >= Number(form.price);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">Medicine inventory</h1>
        <Button onClick={() => setForm({ ...blank })}><Plus className="h-4 w-4" /> Add</Button>
      </div>
      <Tabs tabs={[{ value: 'all', label: 'All medicines' }, { value: 'low', label: 'Low stock' }]} value={tab} onChange={(v) => { setTab(v); setPage(1); }} />
      <Input placeholder="Search name or generic…" aria-label="Search medicines" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      {q.isLoading && <CardSkeletons count={5} className="h-16" />}
      {q.isError && <ErrorState error={q.error} onRetry={q.refetch} />}
      {!q.isLoading && !q.isError && rows.length === 0 && <Empty title={tab === 'low' ? 'Nothing is running low' : 'No medicines found'} />}
      <div className="space-y-2">
        {rows.map((m) => {
          const low = m.stock <= m.lowStockAt;
          return (
            <Card key={m._id} className="flex items-center gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold text-ink-900">{m.name} {m.strength}{m.requiresPrescription && <Badge tone="coral">Rx</Badge>}{m.isActive === false && <Badge tone="gray">Hidden</Badge>}</p>
                <p className="truncate text-sm text-ink-500">{m.generic || m.category} · {inr(m.price)} <span className="line-through">{m.mrp > m.price ? inr(m.mrp) : ''}</span></p>
              </div>
              <div className="text-right">
                <p className={low ? 'flex items-center justify-end gap-1 font-bold text-red-600' : 'font-bold text-ink-900'}>{low && <AlertTriangle className="h-4 w-4" />}{m.stock}</p>
                <p className="text-[11px] text-ink-400">in stock</p>
              </div>
              <Button size="icon" variant="secondary" aria-label={`Adjust stock for ${m.name}`} onClick={() => setAdj({ m, delta: '', reason: '' })}><PackagePlus className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" aria-label={`Edit ${m.name}`} onClick={() => setForm({ ...blank, ...m })}><Pencil className="h-4 w-4" /></Button>
            </Card>
          );
        })}
      </div>
      <Pager meta={q.data?.meta} onPage={setPage} />

      <Modal open={!!form} onClose={() => setForm(null)} size="lg" title={form?._id ? 'Edit medicine' : 'New medicine'} footer={<Button className="w-full" disabled={!validForm} loading={save.isPending} onClick={() => save.mutate()}>Save</Button>}>
        {form && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Brand name" required value={form.name} onChange={f('name')} />
              <Input label="Generic / salt" value={form.generic || ''} onChange={f('generic')} />
              <Input label="Manufacturer" value={form.manufacturer || ''} onChange={f('manufacturer')} />
              <Input label="Category" value={form.category || ''} onChange={f('category')} />
              <Input label="Form" hint="Tablet, syrup…" value={form.form || ''} onChange={f('form')} />
              <Input label="Strength" value={form.strength || ''} onChange={f('strength')} />
              <Input label="Pack size" value={form.packSize || ''} onChange={f('packSize')} />
              <Input label="Low-stock alert at" type="number" min="0" value={form.lowStockAt ?? 0} onChange={f('lowStockAt')} />
              <Input label="MRP (₹)" type="number" min="0" step="0.01" value={form.mrp} onChange={f('mrp')} error={Number(form.mrp) < Number(form.price) ? 'MRP must be ≥ price' : undefined} />
              <Input label="Selling price (₹)" type="number" min="0" step="0.01" value={form.price} onChange={f('price')} />
              {!form._id && <Input label="Opening stock" type="number" min="0" value={form.stock} onChange={f('stock')} />}
            </div>
            <Textarea label="Description" rows={2} value={form.description || ''} onChange={f('description')} />
            <Switch checked={!!form.requiresPrescription} onChange={(v) => setForm((s) => ({ ...s, requiresPrescription: v }))} label="Prescription required" description="Orders need a valid prescription from this hospital." />
            <Switch checked={form.isActive !== false} onChange={(v) => setForm((s) => ({ ...s, isActive: v }))} label="Available in the store" />
          </div>
        )}
      </Modal>

      <Modal open={!!adj} onClose={() => setAdj(null)} size="sm" title="Adjust stock" footer={<Button className="w-full" disabled={!Number(adj?.delta)} loading={stock.isPending} onClick={() => stock.mutate()}>Apply</Button>}>
        {adj && (
          <div className="space-y-3">
            <p className="text-sm text-ink-600"><b>{adj.m.name}</b> — currently {adj.m.stock} in stock. Use a negative number to remove (damage, expiry).</p>
            <Input label="Change (+/−)" type="number" value={adj.delta} onChange={(e) => setAdj((s) => ({ ...s, delta: e.target.value }))} />
            <Input label="Reason" value={adj.reason} onChange={(e) => setAdj((s) => ({ ...s, reason: e.target.value }))} />
          </div>
        )}
      </Modal>
    </div>
  );
}
