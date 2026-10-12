import { useSearchParams } from 'react-router-dom';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, Stethoscope } from 'lucide-react';
import { get } from '../../lib/api.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { Input, Select } from '../../components/ui/Form.jsx';
import { Empty, ErrorState, CardSkeletons } from '../../components/ui/Feedback.jsx';
import { DoctorCard } from '../../components/common/DoctorCard.jsx';
import { LoadMore } from '../../components/common/LoadMore.jsx';
import { useState } from 'react';
import { cn } from '../../lib/cn.js';

export default function Doctors() {
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState(sp.get('q') || '');
  const dq = useDebounce(q);
  const department = sp.get('department') || '';
  const mode = sp.get('mode') || '';
  const sort = sp.get('sort') || 'rating';
  const [showFilters, setShowFilters] = useState(false);

  const setParam = (k, v) => {
    const n = new URLSearchParams(sp);
    v ? n.set(k, v) : n.delete(k);
    setSp(n, { replace: true });
  };

  const depts = useQuery({ queryKey: ['departments'], queryFn: () => get('/departments'), staleTime: 300_000 });
  const query = useInfiniteQuery({
    queryKey: ['doctors', { dq, department, mode, sort }],
    queryFn: ({ pageParam }) => get('/doctors', { q: dq || undefined, department: department || undefined, mode: mode || undefined, sort, page: pageParam, limit: 12 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.pages ? last.meta.page + 1 : undefined),
  });
  const items = query.data?.pages.flatMap((p) => p.data) || [];

  return (
    <div className="container py-6 sm:py-10">
      <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">Find a doctor</h1>
      <div className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-3 h-5 w-5 text-ink-400" />
          <Input aria-label="Search doctors" placeholder="Search by name, speciality or condition" className="pl-11" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters} className={cn('flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold sm:hidden', showFilters ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 bg-white text-ink-700')}><SlidersHorizontal className="h-4 w-4" /> Filters</button>
      </div>

      <div className={cn('mt-3 grid-cols-3 gap-3 sm:grid', showFilters ? 'grid' : 'hidden')}>
        <Select aria-label="Department" value={department} onChange={(e) => setParam('department', e.target.value)}>
          <option value="">All departments</option>
          {(depts.data?.data || []).map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
        </Select>
        <Select aria-label="Consultation type" value={mode} onChange={(e) => setParam('mode', e.target.value)}>
          <option value="">Clinic or video</option>
          <option value="in_person">In-clinic</option>
          <option value="video">Video consult</option>
        </Select>
        <Select aria-label="Sort" value={sort} onChange={(e) => setParam('sort', e.target.value)}>
          <option value="rating">Top rated</option>
          <option value="experience">Most experienced</option>
          <option value="fee">Lowest fee</option>
          <option value="name">Name</option>
        </Select>
      </div>

      <div className="mt-6">
        {query.isLoading && <CardSkeletons count={4} className="h-44" />}
        {query.isError && <ErrorState error={query.error} onRetry={query.refetch} />}
        {query.data && items.length === 0 && <Empty icon={Stethoscope} title="No doctors found" text="Try a different name, speciality or clear the filters." />}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((d) => <DoctorCard key={d._id} doctor={d} />)}</div>
        <LoadMore query={query} />
      </div>
    </div>
  );
}
