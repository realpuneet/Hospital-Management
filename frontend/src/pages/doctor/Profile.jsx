import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, patch } from '../../lib/api.js';
import { Card, SectionTitle } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { TagInput, Textarea } from '../../components/ui/Form.jsx';
import { ImageUpload } from '../../components/ui/ImageUpload.jsx';
import { ErrorState, Skeleton, errMsg, toast } from '../../components/ui/Feedback.jsx';
import { inr } from '../../lib/format.js';

export default function DoctorProfile() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['doctor-profile'], queryFn: () => get('/doctor/profile') });
  const [f, setF] = useState(null);
  useEffect(() => {
    const p = q.data?.data;
    if (p) setF({ bio: p.bio || '', languages: p.languages || [], qualifications: p.qualifications || [], conditionsTreated: p.conditionsTreated || [], avatar: p.avatar || null });
  }, [q.data]);
  const save = useMutation({
    mutationFn: () => patch('/doctor/profile', f),
    onSuccess: () => { toast.success('Profile updated'); qc.invalidateQueries({ queryKey: ['doctor-profile'] }); },
    onError: (e) => toast.error(errMsg(e)),
  });
  if (q.isLoading || !f) return <Skeleton className="h-96" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const p = q.data.data;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="font-display text-2xl font-extrabold text-ink-900">My profile</h1>
      <Card className="space-y-4 p-5">
        <ImageUpload label="Photo" shape="round" value={f.avatar} onChange={(avatar) => setF({ ...f, avatar })} />
        <Textarea label="About" rows={5} value={f.bio} maxLength={2000} onChange={(e) => setF({ ...f, bio: e.target.value })} />
        <TagInput label="Qualifications" value={f.qualifications} onChange={(qualifications) => setF({ ...f, qualifications })} />
        <TagInput label="Languages" value={f.languages} onChange={(languages) => setF({ ...f, languages })} />
        <TagInput label="Conditions treated" value={f.conditionsTreated} onChange={(conditionsTreated) => setF({ ...f, conditionsTreated })} max={30} />
        <Button loading={save.isPending} onClick={() => save.mutate()}>Save profile</Button>
      </Card>
      <Card className="p-5">
        <SectionTitle title="Managed by administration" subtitle="Contact the hospital admin to change these." />
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-ink-500">Department</dt><dd className="font-semibold">{p.department?.name}</dd></div>
          <div><dt className="text-ink-500">Registration no.</dt><dd className="font-semibold">{p.registrationNo || '—'}</dd></div>
          <div><dt className="text-ink-500">Clinic fee</dt><dd className="font-semibold">{inr(p.fees?.in_person)}</dd></div>
          <div><dt className="text-ink-500">Video fee</dt><dd className="font-semibold">{inr(p.fees?.video)}</dd></div>
        </dl>
      </Card>
    </div>
  );
}
