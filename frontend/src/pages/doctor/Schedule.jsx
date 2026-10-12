import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarOff, Plus, Trash2 } from 'lucide-react';
import { del, get, post, put } from '../../lib/api.js';
import { Badge, Card, SectionTitle } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input, Select, Switch } from '../../components/ui/Form.jsx';
import { Modal } from '../../components/ui/Overlay.jsx';
import { ErrorState, Skeleton, errMsg, toast } from '../../components/ui/Feedback.jsx';
import { WeeklyEditor, weeklyValid } from '../../components/common/WeeklyEditor.jsx';
import { istDate, prettyDate, timeOnly, to12h } from '../../lib/format.js';

export default function Schedule() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['doctor-profile'], queryFn: () => get('/doctor/profile') });
  const [weekly, setWeekly] = useState([]);
  const [slotMinutes, setSlotMinutes] = useState(15);
  const [modes, setModes] = useState(['in_person']);
  const [accepting, setAccepting] = useState(true);
  const [room, setRoom] = useState('');
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leave, setLeave] = useState({ date: '', reason: '', partial: false, start: '10:00', end: '12:00' });
  const [conflict, setConflict] = useState(null);

  useEffect(() => {
    const p = q.data?.data;
    if (!p) return;
    setWeekly((p.weekly || []).map((d) => ({ day: d.day, ranges: d.ranges.map((r) => ({ start: r.start, end: r.end })) })));
    setSlotMinutes(p.slotMinutes);
    setModes(p.modes);
    setAccepting(p.isAcceptingBookings);
    setRoom(p.room || '');
  }, [q.data]);

  const save = useMutation({
    mutationFn: () => put('/doctor/schedule', { weekly, slotMinutes: Number(slotMinutes), modes, isAcceptingBookings: accepting, room }),
    onSuccess: () => { toast.success('Timings saved — patients see the new slots instantly'); qc.invalidateQueries({ queryKey: ['doctor-profile'] }); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const addLeave = useMutation({
    mutationFn: (force) => post('/doctor/leaves', { date: leave.date, reason: leave.reason || undefined, fullDay: !leave.partial, ranges: leave.partial ? [{ start: leave.start, end: leave.end }] : [], force }),
    onSuccess: (r) => {
      if (!r.data.added) { setConflict(r.data); return; }
      toast.success(r.data.affected ? `Leave added · ${r.data.affected} appointment(s) cancelled & patients notified` : 'Leave added');
      setConflict(null); setLeaveOpen(false); qc.invalidateQueries({ queryKey: ['doctor-profile'] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const removeLeave = useMutation({ mutationFn: (date) => del(`/doctor/leaves/${date}`), onSuccess: () => { toast.success('Leave removed'); qc.invalidateQueries({ queryKey: ['doctor-profile'] }); }, onError: (e) => toast.error(errMsg(e)) });

  if (q.isLoading) return <div className="space-y-4"><Skeleton className="h-40" /><Skeleton className="h-96" /></div>;
  if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const p = q.data.data;
  const today = istDate();
  const upcomingLeaves = (p.leaves || []).filter((l) => l.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const toggleMode = (m) => setModes((arr) => (arr.includes(m) ? (arr.length > 1 ? arr.filter((x) => x !== m) : arr) : [...arr, m]));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-900">Timings & leave</h1>
        <p className="text-sm text-ink-500">Your weekly consulting hours drive the slots patients can book.</p>
      </div>

      <Card className="p-5">
        <SectionTitle title="Booking settings" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Slot length" value={slotMinutes} onChange={(e) => setSlotMinutes(e.target.value)}>{[10, 15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} minutes</option>)}</Select>
          <Input label="Room / floor" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g. OPD 104, 1st floor" />
        </div>
        <div className="mt-3 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className="h-5 w-5 accent-brand-600" checked={modes.includes('in_person')} onChange={() => toggleMode('in_person')} /> In-clinic visits</label>
          <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className="h-5 w-5 accent-brand-600" checked={modes.includes('video')} onChange={() => toggleMode('video')} /> Video consultations</label>
        </div>
        <Switch checked={accepting} onChange={setAccepting} label="Accepting new bookings" description="Turn off to pause all new bookings without changing timings" />
      </Card>

      <Card className="p-5">
        <SectionTitle title="Weekly timings" subtitle="Add one or more blocks for each working day (IST)" />
        <WeeklyEditor value={weekly} onChange={setWeekly} />
        <Button className="mt-4" loading={save.isPending} disabled={!weeklyValid(weekly)} onClick={() => save.mutate()}>Save timings</Button>
      </Card>

      <Card className="p-5">
        <SectionTitle title="Leave & days off" action={<Button size="sm" onClick={() => { setLeave({ date: '', reason: '', partial: false, start: '10:00', end: '12:00' }); setConflict(null); setLeaveOpen(true); }}><Plus className="h-4 w-4" /> Add leave</Button>} />
        {upcomingLeaves.length === 0 && <p className="text-sm text-ink-500"><CalendarOff className="mr-1 inline h-4 w-4" />No upcoming leave.</p>}
        <ul className="divide-y divide-ink-100">
          {upcomingLeaves.map((l) => (
            <li key={l.date} className="flex items-center justify-between gap-3 py-3 text-sm">
              <div><p className="font-semibold text-ink-900">{prettyDate(l.date)}</p><p className="text-ink-500">{l.fullDay === false ? <Badge tone="amber">{l.ranges.map((r) => `${to12h(r.start)}–${to12h(r.end)}`).join(', ')}</Badge> : <Badge tone="red">Full day</Badge>} {l.reason}</p></div>
              <Button size="icon" variant="ghost" aria-label="Remove leave" onClick={() => removeLeave.mutate(l.date)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
            </li>
          ))}
        </ul>
      </Card>

      <Modal open={leaveOpen} onClose={() => setLeaveOpen(false)} title="Add leave"
        footer={conflict ? (
          <div className="flex flex-wrap justify-end gap-2"><Button variant="secondary" onClick={() => setConflict(null)}>Go back</Button><Button variant="danger" loading={addLeave.isPending} onClick={() => addLeave.mutate(true)}>Cancel {conflict.affected} & add leave</Button></div>
        ) : <Button className="w-full" disabled={!leave.date} loading={addLeave.isPending} onClick={() => addLeave.mutate(false)}>Add leave</Button>}>
        {conflict ? (
          <div className="space-y-3">
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{conflict.affected} booked appointment{conflict.affected > 1 ? 's' : ''} fall on this leave. Cancelling notifies patients (email/WhatsApp if they opted in) and refunds payments in full.</p>
            <ul className="divide-y divide-ink-100 text-sm">{conflict.appointments.map((a) => <li key={a._id} className="py-2">{timeOnly(a.startAt)} · {a.code}</li>)}</ul>
          </div>
        ) : (
          <div className="space-y-4">
            <Input label="Date" type="date" min={today} value={leave.date} onChange={(e) => setLeave({ ...leave, date: e.target.value })} required />
            <Input label="Reason (shown to affected patients)" value={leave.reason} onChange={(e) => setLeave({ ...leave, reason: e.target.value })} />
            <Switch checked={leave.partial} onChange={(v) => setLeave({ ...leave, partial: v })} label="Only part of the day" />
            {leave.partial && <div className="flex items-center gap-2"><input type="time" className="h-11 rounded-xl border border-ink-200 px-3" value={leave.start} onChange={(e) => setLeave({ ...leave, start: e.target.value })} /><span>to</span><input type="time" className="h-11 rounded-xl border border-ink-200 px-3" value={leave.end} onChange={(e) => setLeave({ ...leave, end: e.target.value })} /></div>}
          </div>
        )}
      </Modal>
    </div>
  );
}
