/* Idempotent seed: `npm run seed`. Safe to run repeatedly (upserts by email/slug/name). */
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Department } from '../models/Department.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { Medicine } from '../models/Medicine.js';
import { slugify } from './helpers.js';
import { logger } from './logger.js';
import { EXTRA_DOCTORS, EXTRA_PHARMACISTS, EXTRA_RIDERS, EXTRA_PATIENTS, buildMedicines } from './seedData.js';

const hash = (p) => bcrypt.hash(p, 10);

const DEPARTMENTS = [
  ['General Medicine', 'stethoscope', 'Fever, infections, diabetes, BP and everyday health concerns.'],
  ['Cardiology', 'heart', 'Heart health, BP, ECG and cardiac care.'],
  ['Dermatology', 'sparkles', 'Skin, hair and nail conditions.'],
  ['Pediatrics', 'baby', 'Care for infants, children and teens.'],
  ['Orthopedics', 'bone', 'Bones, joints, sports injuries and spine.'],
  ['Gynecology', 'flower', "Women's health, pregnancy and fertility."],
  ['ENT', 'ear', 'Ear, nose and throat care.'],
  ['Neurology', 'brain', 'Headache, epilepsy, stroke and nerve disorders.'],
];

const week = (morning, evening, days = [1, 2, 3, 4, 5], sat = true) => [
  ...days.map((d) => ({ day: d, ranges: [morning, evening].filter(Boolean) })),
  ...(sat ? [{ day: 6, ranges: [morning].filter(Boolean) }] : []),
];
const M = { start: '09:00', end: '13:00' };
const E = { start: '17:00', end: '20:00' };

const DOCTORS = [
  { name: 'Anita Sharma', email: 'anita.sharma', dept: 'General Medicine', spec: 'General Physician', q: ['MBBS', 'MD (Medicine)'], exp: 14, fee: [500, 400], modes: ['in_person', 'video'], conditions: ['Fever', 'Diabetes', 'Hypertension', 'Thyroid'], weekly: week(M, E) },
  { name: 'Rohit Verma', email: 'rohit.verma', dept: 'Cardiology', spec: 'Interventional Cardiologist', q: ['MBBS', 'DM (Cardiology)'], exp: 18, fee: [900, 700], modes: ['in_person', 'video'], conditions: ['Chest pain', 'Heart failure', 'Arrhythmia'], weekly: week(M, E, [1, 3, 5], false) },
  { name: 'Neha Kapoor', email: 'neha.kapoor', dept: 'Dermatology', spec: 'Dermatologist', q: ['MBBS', 'MD (Dermatology)'], exp: 9, fee: [600, 450], modes: ['in_person', 'video'], conditions: ['Acne', 'Eczema', 'Hair fall'], weekly: week(null, E, [1, 2, 3, 4, 5], true) },
  { name: 'Sanjay Gupta', email: 'sanjay.gupta', dept: 'Pediatrics', spec: 'Pediatrician', q: ['MBBS', 'DCH'], exp: 12, fee: [500, 400], modes: ['in_person', 'video'], conditions: ['Vaccination', 'Child fever', 'Growth'], weekly: week(M, E) },
  { name: 'Meera Nair', email: 'meera.nair', dept: 'Gynecology', spec: 'Obstetrician & Gynecologist', q: ['MBBS', 'MS (OBG)'], exp: 15, fee: [800, 600], modes: ['in_person', 'video'], conditions: ['Pregnancy care', 'PCOS'], weekly: week(M, E, [1, 2, 4, 5]) },
  { name: 'Arjun Mehta', email: 'arjun.mehta', dept: 'Orthopedics', spec: 'Orthopedic Surgeon', q: ['MBBS', 'MS (Ortho)'], exp: 16, fee: [800, 0], modes: ['in_person'], conditions: ['Knee pain', 'Fractures', 'Back pain'], weekly: week(M, E, [2, 3, 4, 5, 6].filter((d) => d !== 6), true) },
  { name: 'Farah Khan', email: 'farah.khan', dept: 'ENT', spec: 'ENT Specialist', q: ['MBBS', 'MS (ENT)'], exp: 8, fee: [600, 450], modes: ['in_person', 'video'], conditions: ['Sinusitis', 'Hearing loss', 'Tonsillitis'], weekly: week(M, null) },
  { name: 'Vikram Rao', email: 'vikram.rao', dept: 'Neurology', spec: 'Neurologist', q: ['MBBS', 'DM (Neurology)'], exp: 20, fee: [1000, 800], modes: ['in_person', 'video'], conditions: ['Migraine', 'Epilepsy', 'Stroke'], weekly: week(E, null, [1, 2, 3, 4, 5], false) },
];

const MEDICINES = [
  // name, generic, category, form, strength, mrp, price, stock, rx, manufacturer
  ['Paracetamol 500', 'Paracetamol', 'Fever & Pain', 'Tablet', '500 mg', 30, 24, 500, false, 'Cipla'],
  ['Dolo 650', 'Paracetamol', 'Fever & Pain', 'Tablet', '650 mg', 34, 30, 600, false, 'Micro Labs'],
  ['Ibuprofen 400', 'Ibuprofen', 'Fever & Pain', 'Tablet', '400 mg', 40, 34, 300, false, 'Abbott'],
  ['Diclofenac Gel', 'Diclofenac', 'Fever & Pain', 'Gel', '30 g', 120, 98, 120, false, 'Novartis'],
  ['Cetirizine 10', 'Cetirizine', 'Allergy & Cold', 'Tablet', '10 mg', 28, 22, 400, false, 'Dr Reddys'],
  ['Montelukast 10', 'Montelukast', 'Allergy & Cold', 'Tablet', '10 mg', 180, 150, 150, true, 'Sun Pharma'],
  ['Levocetirizine 5', 'Levocetirizine', 'Allergy & Cold', 'Tablet', '5 mg', 70, 58, 250, false, 'Cipla'],
  ['Cough Syrup DX', 'Dextromethorphan', 'Allergy & Cold', 'Syrup', '100 ml', 95, 80, 200, false, 'Cipla'],
  ['Amoxicillin 500', 'Amoxicillin', 'Antibiotics', 'Capsule', '500 mg', 120, 98, 200, true, 'GSK'],
  ['Azithromycin 500', 'Azithromycin', 'Antibiotics', 'Tablet', '500 mg', 120, 105, 180, true, 'Zydus'],
  ['Cefixime 200', 'Cefixime', 'Antibiotics', 'Tablet', '200 mg', 150, 128, 150, true, 'Alkem'],
  ['Ciprofloxacin 500', 'Ciprofloxacin', 'Antibiotics', 'Tablet', '500 mg', 90, 74, 140, true, 'Cipla'],
  ['Metformin 500', 'Metformin', 'Diabetes', 'Tablet', '500 mg', 45, 38, 400, true, 'USV'],
  ['Glimepiride 2', 'Glimepiride', 'Diabetes', 'Tablet', '2 mg', 110, 92, 250, true, 'Sanofi'],
  ['Sitagliptin 50', 'Sitagliptin', 'Diabetes', 'Tablet', '50 mg', 260, 224, 100, true, 'MSD'],
  ['Amlodipine 5', 'Amlodipine', 'Heart & BP', 'Tablet', '5 mg', 55, 46, 350, true, 'Pfizer'],
  ['Telmisartan 40', 'Telmisartan', 'Heart & BP', 'Tablet', '40 mg', 130, 112, 260, true, 'Glenmark'],
  ['Atorvastatin 10', 'Atorvastatin', 'Heart & BP', 'Tablet', '10 mg', 140, 118, 300, true, 'Pfizer'],
  ['Aspirin 75', 'Aspirin', 'Heart & BP', 'Tablet', '75 mg', 25, 20, 400, true, 'Bayer'],
  ['Pantoprazole 40', 'Pantoprazole', 'Digestive', 'Tablet', '40 mg', 120, 98, 450, false, 'Alkem'],
  ['Omeprazole 20', 'Omeprazole', 'Digestive', 'Capsule', '20 mg', 80, 64, 300, false, 'Dr Reddys'],
  ['ORS Powder', 'Oral Rehydration Salts', 'Digestive', 'Powder', '21 g', 25, 21, 500, false, 'FDC'],
  ['Domperidone 10', 'Domperidone', 'Digestive', 'Tablet', '10 mg', 60, 50, 260, false, 'Zydus'],
  ['Vitamin D3 60K', 'Cholecalciferol', 'Vitamins', 'Capsule', '60000 IU', 130, 108, 350, false, 'Cipla'],
  ['Vitamin B12', 'Methylcobalamin', 'Vitamins', 'Tablet', '1500 mcg', 140, 118, 300, false, 'Mankind'],
  ['Multivitamin', 'Multivitamin', 'Vitamins', 'Tablet', 'Daily', 220, 180, 250, false, 'Abbott'],
  ['Iron + Folic Acid', 'Ferrous Ascorbate', 'Vitamins', 'Tablet', '100 mg', 95, 78, 280, false, 'Emcure'],
  ['Calcium + D3', 'Calcium Carbonate', 'Vitamins', 'Tablet', '500 mg', 110, 92, 300, false, 'Torrent'],
  ['Betadine Ointment', 'Povidone Iodine', 'First Aid', 'Ointment', '20 g', 75, 66, 150, false, 'Win-Medicare'],
  ['Bandage Roll', 'Crepe Bandage', 'First Aid', 'Bandage', '6 cm', 55, 45, 200, false, 'Dynamic'],
  ['Antiseptic Liquid', 'Chloroxylenol', 'First Aid', 'Liquid', '250 ml', 110, 92, 140, false, 'Reckitt'],
  ['Clotrimazole Cream', 'Clotrimazole', 'Skin Care', 'Cream', '15 g', 85, 70, 160, false, 'Glenmark'],
  ['Mometasone Cream', 'Mometasone', 'Skin Care', 'Cream', '15 g', 160, 135, 90, true, 'Glenmark'],
  ['Adapalene Gel', 'Adapalene', 'Skin Care', 'Gel', '15 g', 190, 160, 100, true, 'Galderma'],
  ['Sunscreen SPF 50', 'Zinc Oxide', 'Skin Care', 'Lotion', '50 g', 420, 360, 80, false, 'Sebamed'],
  ['Salbutamol Inhaler', 'Salbutamol', 'Respiratory', 'Inhaler', '100 mcg', 150, 128, 120, true, 'Cipla'],
  ['Levothyroxine 50', 'Levothyroxine', 'Thyroid', 'Tablet', '50 mcg', 190, 168, 230, true, 'Abbott'],
  ['Digital Thermometer', 'Thermometer', 'Devices', 'Device', '1 unit', 250, 199, 60, false, 'Omron'],
  ['Glucometer Strips', 'Test strips', 'Devices', 'Strips', '50 pcs', 899, 780, 60, false, 'Accu-Chek'],
  ['Surgical Mask (50)', 'Mask', 'Devices', 'Box', '50 pcs', 199, 150, 100, false, '3M'],
];

async function upsertUser(email, data, password) {
  let u = await User.findOne({ email });
  if (u) return u;
  u = await User.create({ email, emailVerified: true, ...data, passwordHash: await hash(password) });
  return u;
}

export async function seed({ log = true } = {}) {
  const say = (m) => log && logger.info(m);

  await upsertUser(env.SEED_ADMIN_EMAIL, { name: 'Hospital Admin', role: 'admin', phone: '919000000001' }, env.SEED_ADMIN_PASSWORD);
  await upsertUser('pharmacy@carepulse.local', { name: 'Pharmacy Desk', role: 'pharmacist', phone: '919000000002' }, 'Pharma@12345');
  const riderPw = 'Rider@12345';
  await upsertUser('rider1@carepulse.local', { name: 'Ravi Kumar', role: 'rider', phone: '919000000003', rider: { online: true, location: { lat: 28.6139, lng: 77.209 } } }, riderPw);
  await upsertUser('rider2@carepulse.local', { name: 'Imran Ali', role: 'rider', phone: '919000000004', rider: { online: true, location: { lat: 28.62, lng: 77.22 } } }, riderPw);
  await upsertUser('patient@carepulse.local', {
    name: 'Demo Patient', role: 'patient', phone: '919999999999', gender: 'male', bloodGroup: 'B+',
    prefs: { emailConfirmations: true, whatsappConfirmations: false, whatsappNumber: '919999999999' },
    addresses: [{ label: 'Home', line1: '12, Green Park', city: 'New Delhi', state: 'Delhi', pincode: '110016', isDefault: true, location: { lat: 28.5494, lng: 77.2001 } }],
  }, 'Patient@12345');
  for (const [email, name, phone] of EXTRA_PHARMACISTS) await upsertUser(email, { name, role: 'pharmacist', phone }, 'Pharma@12345');
  for (const [email, name, phone, lat, lng] of EXTRA_RIDERS) await upsertUser(email, { name, role: 'rider', phone, rider: { online: true, location: { lat, lng } } }, riderPw);
  for (const [email, name, phone, gender, bloodGroup] of EXTRA_PATIENTS) {
    await upsertUser(email, { name, role: 'patient', phone, gender, bloodGroup, prefs: { emailConfirmations: true, whatsappConfirmations: false } }, 'Patient@12345');
  }
  say('users ready');

  const deptIds = {};
  for (const [i, [name, icon, description]] of DEPARTMENTS.entries()) {
    const d = await Department.findOneAndUpdate({ slug: slugify(name) }, { $setOnInsert: { name, slug: slugify(name), icon, description, sortOrder: i } }, { upsert: true, new: true });
    deptIds[name] = d._id;
  }
  say(`${DEPARTMENTS.length} departments`);

  const allDoctors = [...DOCTORS, ...EXTRA_DOCTORS];
  for (const d of allDoctors) {
    const email = `${d.email}@carepulse.local`;
    const user = await upsertUser(email, { name: `${d.name}`, role: 'doctor' }, 'Doctor@12345');
    if (await DoctorProfile.exists({ user: user._id })) continue;
    await DoctorProfile.create({
      user: user._id, name: d.name, slug: slugify(`dr-${d.name}`), department: deptIds[d.dept], specialization: d.spec,
      qualifications: d.q, registrationNo: d.reg || `REG-${Math.floor(10000 + Math.random() * 89999)}`, experienceYears: d.exp,
      bio: `${d.name} is a ${d.spec} with ${d.exp} years of experience, known for patient-first care and clear explanations.`,
      languages: ['English', 'Hindi'], conditionsTreated: d.conditions, fees: { in_person: d.fee[0], video: d.fee[1] },
      modes: d.modes, slotMinutes: 15, room: `OPD ${100 + Math.floor(Math.random() * 20)}`, weekly: d.weekly,
      rating: { avg: Number((4 + Math.random()).toFixed(1)), count: 20 + Math.floor(Math.random() * 200) },
    });
  }
  say(`${allDoctors.length} doctors`);

  const allMedicines = [...MEDICINES, ...buildMedicines()];
  const ops = allMedicines.map(([name, generic, category, form, strength, mrp, price, stock, rx, manufacturer]) => {
    const slug = slugify(`${name}-${strength}`);
    const packSize = { Tablet: '10 tablets', Capsule: '10 capsules', Syrup: '1 bottle', Injection: '1 vial', Drops: '1 bottle' }[form] || '1 unit';
    return { updateOne: { filter: { slug }, update: { $setOnInsert: { name, slug, generic, category, form, strength, mrp, price, stock, requiresPrescription: rx, manufacturer, packSize } }, upsert: true } };
  });
  if (new Set(ops.map((o) => o.updateOne.filter.slug)).size !== ops.length) throw new Error('Duplicate medicine slugs in seed data');
  await Medicine.bulkWrite(ops, { ordered: false });
  say(`${allMedicines.length} medicines`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  connectDB()
    .then(() => seed())
    .then(() => {
      logger.info('Seed complete. Logins -> admin: %s / %s | patient@carepulse.local / Patient@12345 | doctors: <name>@carepulse.local / Doctor@12345 | pharmacy@carepulse.local / Pharma@12345 | rider1@carepulse.local / Rider@12345', env.SEED_ADMIN_EMAIL, env.SEED_ADMIN_PASSWORD);
      return disconnectDB();
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
