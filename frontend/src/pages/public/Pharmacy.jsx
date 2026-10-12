import { useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Minus, Pill, Plus, Search, ShieldAlert, ShoppingCart } from 'lucide-react';
import { get } from '../../lib/api.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { useCart, medId } from '../../features/cart/cartStore.js';
import { Input } from '../../components/ui/Form.jsx';
import { Badge, Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { CardSkeletons, Empty, ErrorState, toast } from '../../components/ui/Feedback.jsx';
import { LoadMore } from '../../components/common/LoadMore.jsx';
import { inr } from '../../lib/format.js';
import { ik } from '../../lib/imagekit.js';
import { cn } from '../../lib/cn.js';

function MedicineCard({ m }) {
  const { items, add, setQty } = useCart();
  const inCart = items.find((i) => medId(i.medicine) === medId(m));
  const out = m.stock <= 0;
  const off = m.mrp > m.price ? Math.round(((m.mrp - m.price) / m.mrp) * 100) : 0;
  return (
    <Card className="flex flex-col p-4">
      <div className="mb-3 grid h-24 place-items-center rounded-xl bg-gradient-to-br from-brand-50 to-white">
        {m.image ? <img src={ik(m.image, 240)} alt="" loading="lazy" className="h-20 object-contain" /> : <Pill className="h-9 w-9 text-brand-300" />}
      </div>
      <h3 className="line-clamp-1 font-display font-bold text-ink-900">{m.name}</h3>
      <p className="line-clamp-1 text-xs text-ink-500">{m.generic} · {m.strength} · {m.form}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {m.requiresPrescription && <Badge tone="coral"><ShieldAlert className="h-3 w-3" /> Rx required</Badge>}
        {!out && m.stock <= (m.lowStockAt || 10) && <Badge tone="amber">Only {m.stock} left</Badge>}
        {out && <Badge tone="gray">Out of stock</Badge>}
      </div>
      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        <div>
          <span className="font-display text-lg font-extrabold text-ink-900">{inr(m.price)}</span>
          {off > 0 && <span className="ml-1.5 text-xs text-ink-400 line-through">{inr(m.mrp)}</span>}
          {off > 0 && <span className="ml-1.5 text-xs font-semibold text-emerald-600">{off}% off</span>}
        </div>
        {inCart ? (
          <div className="flex items-center gap-1 rounded-xl bg-brand-50 p-1">
            <button aria-label="Decrease" className="rounded-lg p-1.5 text-brand-700 hover:bg-white" onClick={() => setQty(medId(m), inCart.qty - 1)}><Minus className="h-4 w-4" /></button>
            <span className="w-6 text-center text-sm font-bold text-brand-800">{inCart.qty}</span>
            <button aria-label="Increase" className="rounded-lg p-1.5 text-brand-700 hover:bg-white disabled:opacity-40" disabled={inCart.qty >= Math.min(10, m.stock)} onClick={() => add(m, 1)}><Plus className="h-4 w-4" /></button>
          </div>
        ) : (
          <Button size="sm" variant="soft" disabled={out} onClick={() => { add(m, 1); toast.success(`${m.name} added`); }}>Add</Button>
        )}
      </div>
    </Card>
  );
}

export default function Pharmacy() {
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const [category, setCategory] = useState('');
  const count = useCart((s) => s.items.reduce((n, i) => n + i.qty, 0));
  const cats = useQuery({ queryKey: ['med-cats'], queryFn: () => get('/medicines/categories'), staleTime: 300_000 });
  const query = useInfiniteQuery({
    queryKey: ['medicines', dq, category],
    queryFn: ({ pageParam }) => get('/medicines', { q: dq || undefined, category: category || undefined, page: pageParam, limit: 24 }),
    initialPageParam: 1,
    getNextPageParam: (l) => (l.meta.page < l.meta.pages ? l.meta.page + 1 : undefined),
  });
  const items = query.data?.pages.flatMap((p) => p.data) || [];

  return (
    <div className="container py-6 sm:py-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">Pharmacy</h1>
        {count > 0 && <Button to="/cart" size="sm"><ShoppingCart className="h-4 w-4" /> Cart ({count})</Button>}
      </div>
      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3.5 top-3 h-5 w-5 text-ink-400" />
        <Input aria-label="Search medicines" placeholder="Search medicine or generic name" className="pl-11" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {['', ...(cats.data?.data || [])].map((c) => (
          <button key={c || 'all'} onClick={() => setCategory(c)} className={cn('whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-semibold transition', category === c ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300')}>{c || 'All'}</button>
        ))}
      </div>
      <div className="mt-6">
        {query.isLoading && <CardSkeletons count={4} className="h-52" />}
        {query.isError && <ErrorState error={query.error} onRetry={query.refetch} />}
        {query.data && items.length === 0 && <Empty icon={Pill} title="No medicines found" text="Try another name or category." />}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{items.map((m) => <MedicineCard key={m._id} m={m} />)}</div>
        <LoadMore query={query} />
      </div>
    </div>
  );
}
