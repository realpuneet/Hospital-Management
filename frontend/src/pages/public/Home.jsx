import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck, FileText, MailCheck, Pill, ShieldCheck, Truck, Video, Bell, Heart, Baby, Bone, Brain, Ear, Flower2, Sparkles, Stethoscope } from 'lucide-react';
import { get } from '../../lib/api.js';
import { useAuth } from '../../lib/authStore.js';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { SectionTitle } from '../../components/ui/Card.jsx';
import { CardSkeletons } from '../../components/ui/Feedback.jsx';
import { Counter, Magnetic, Marquee, Reveal, SplitText, StaggerList } from '../../components/motion/index.jsx';
import { DoctorCard } from '../../components/common/DoctorCard.jsx';
import { useMotion } from '../../hooks/useMotion.js';
import { gsap } from '../../lib/gsap.js';

const ICONS = { stethoscope: Stethoscope, heart: Heart, sparkles: Sparkles, baby: Baby, bone: Bone, flower: Flower2, ear: Ear, brain: Brain };

const FEATURES = [
  { icon: CalendarCheck, title: 'Live slot booking', text: 'See real-time availability and book in 3 taps. Slots update instantly when someone else books.' },
  { icon: Video, title: 'Video consultations', text: 'Consult from home. A secure meeting link opens 10 minutes before your slot.' },
  { icon: MailCheck, title: 'Email & WhatsApp confirmations', text: 'Optional. Choose how you want confirmations, reschedule alerts and reminders.' },
  { icon: FileText, title: 'Prescriptions you can read', text: 'Clear digital prescriptions with dosage, timing and a read-aloud option.' },
  { icon: Bell, title: 'Medicine reminders', text: 'Never miss a dose. Tick doses off and track your adherence.' },
  { icon: Truck, title: 'Medicine delivery', text: 'Order from your prescription and track the rider live until the doorstep.' },
];

export default function Home() {
  const user = useAuth((s) => s.user);
  const depts = useQuery({ queryKey: ['departments'], queryFn: () => get('/departments'), staleTime: 300_000 });
  const docs = useQuery({ queryKey: ['doctors', 'featured'], queryFn: () => get('/doctors', { limit: 6, sort: 'rating' }) });

  const hero = useMotion(() => {
    gsap.from('[data-hero-fade]', { opacity: 0, y: 24, duration: 0.9, stagger: 0.12, delay: 0.5, ease: 'power3.out' });
    gsap.to('[data-blob]', { y: -18, x: 10, duration: 5, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: 1.2 });
  });

  return (
    <>
      <section ref={hero} className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-ink-50">
        <div data-blob className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-200/50 blur-3xl" />
        <div data-blob className="pointer-events-none absolute -left-24 top-40 h-72 w-72 rounded-full bg-coral-100/70 blur-3xl" />
        <div className="container relative grid items-center gap-10 py-12 sm:py-20 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <p data-hero-fade className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-700 shadow-card"><ShieldCheck className="h-4 w-4" /> Verified doctors · Secure records</p>
            <SplitText text="Your health, scheduled and delivered." className="font-display text-4xl font-extrabold leading-[1.08] text-ink-900 sm:text-6xl" />
            <p data-hero-fade className="mt-5 max-w-xl text-lg text-ink-600">Book trusted doctors, consult in person or on video, read your prescriptions and get medicines delivered — all from your phone.</p>
            <div data-hero-fade className="mt-8 flex flex-wrap gap-3">
              <Magnetic><Button to="/doctors" size="lg">Book appointment <ArrowRight className="h-4 w-4" /></Button></Magnetic>
              <Magnetic><Button to="/pharmacy" size="lg" variant="secondary"><Pill className="h-4 w-4" /> Order medicines</Button></Magnetic>
            </div>
            {!user && <p data-hero-fade className="mt-4 text-sm text-ink-500">New patient? <Link to="/register" className="font-semibold text-brand-700">Create a free account</Link></p>}
          </div>
          <div data-hero-fade className="grid grid-cols-2 gap-3">
            {[
              { n: 50000, s: '+', t: 'Consultations done' },
              { n: 120, s: '+', t: 'Specialist doctors' },
              { n: 98, s: '%', t: 'On-time slots' },
              { n: 30, s: ' min', t: 'Avg. medicine delivery' },
            ].map((x) => (
              <Card key={x.t} className="p-5">
                <div className="font-display text-3xl font-extrabold text-brand-700"><Counter value={x.n} suffix={x.s} /></div>
                <p className="mt-1 text-sm text-ink-500">{x.t}</p>
              </Card>
            ))}
          </div>
        </div>
        <Marquee className="border-y border-brand-100 bg-white/70 py-3" items={['Cardiology', 'Dermatology', 'Pediatrics', 'Orthopedics', 'Gynecology', 'ENT', 'Neurology', 'General Medicine', 'Video Consults', 'Home Delivery']} />
      </section>

      <section className="container py-12">
        <Reveal><SectionTitle title="Find care by department" subtitle="Pick a speciality to see available doctors" action={<Link className="text-sm font-semibold text-brand-700" to="/doctors">All doctors →</Link>} /></Reveal>
        {depts.isLoading ? <CardSkeletons count={2} className="h-24" /> : (
          <StaggerList className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(depts.data?.data || []).map((d) => {
              const Icon = ICONS[d.icon] || Stethoscope;
              return (
                <Link key={d._id} to={`/doctors?department=${d._id}`} className="group rounded-2xl border border-ink-100 bg-white p-4 shadow-card transition hover:-translate-y-1 hover:border-brand-300 hover:shadow-pop">
                  <span className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white"><Icon className="h-5 w-5" /></span>
                  <p className="font-display font-bold text-ink-900">{d.name}</p>
                </Link>
              );
            })}
          </StaggerList>
        )}
      </section>

      <section className="container py-8">
        <Reveal><SectionTitle title="Top rated doctors" /></Reveal>
        {docs.isLoading ? <CardSkeletons count={2} className="h-44" /> : (
          <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(docs.data?.data || []).map((d) => <DoctorCard key={d._id} doctor={d} />)}
          </StaggerList>
        )}
      </section>

      <section className="container py-12">
        <Reveal><SectionTitle title="Everything in one place" subtitle="From the first booking to the last tablet" /></Reveal>
        <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="p-5">
              <span className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600"><f.icon className="h-5 w-5" /></span>
              <h3 className="font-display text-lg font-bold text-ink-900">{f.title}</h3>
              <p className="mt-1 text-sm text-ink-500">{f.text}</p>
            </Card>
          ))}
        </StaggerList>
      </section>

      <section className="container pb-8">
        <Reveal>
          <div className="rounded-3xl bg-gradient-to-br from-brand-700 to-brand-500 p-8 text-center text-white sm:p-12">
            <h2 className="font-display text-3xl font-extrabold">Feeling unwell? See a doctor today.</h2>
            <p className="mx-auto mt-2 max-w-lg text-brand-50">Same-day slots are available with most specialists.</p>
            <Button to="/doctors" size="lg" variant="secondary" className="mt-6">Find a doctor</Button>
          </div>
        </Reveal>
      </section>
    </>
  );
}
