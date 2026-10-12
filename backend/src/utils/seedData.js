/* Bulk demo data for `npm run seed`: extra doctors, staff, riders, patients and a 400+ item medicine catalogue.
 * Names are fictional but realistic. Everything is deterministic so re-running the seed is idempotent. */

const M = { start: '09:00', end: '13:00' };
const E = { start: '17:00', end: '20:00' };
const A = { start: '14:00', end: '17:00' };
const week = (ranges, days, sat = true) => [
  ...days.map((day) => ({ day, ranges })),
  ...(sat ? [{ day: 6, ranges: [ranges[0]] }] : []),
];
const PATTERNS = [
  () => week([M, E], [1, 2, 3, 4, 5]),
  () => week([M], [1, 2, 3, 4, 5], false),
  () => week([E], [1, 2, 3, 4, 5]),
  () => week([A, E], [2, 3, 4, 5], false),
  () => week([M, A], [1, 3, 5]),
  () => week([M, E], [1, 2, 4, 5], false),
];

// dept, specialization, qualifications, conditions
const DEPT_INFO = {
  'General Medicine': ['General Physician', ['MBBS', 'MD (Medicine)'], ['Fever', 'Diabetes', 'Hypertension', 'Thyroid', 'Infections']],
  Cardiology: ['Cardiologist', ['MBBS', 'DM (Cardiology)'], ['Chest pain', 'Heart failure', 'Arrhythmia', 'High cholesterol']],
  Dermatology: ['Dermatologist', ['MBBS', 'MD (Dermatology)'], ['Acne', 'Eczema', 'Hair fall', 'Psoriasis']],
  Pediatrics: ['Pediatrician', ['MBBS', 'MD (Pediatrics)'], ['Vaccination', 'Child fever', 'Growth', 'Asthma in children']],
  Orthopedics: ['Orthopedic Surgeon', ['MBBS', 'MS (Ortho)'], ['Knee pain', 'Fractures', 'Back pain', 'Arthritis']],
  Gynecology: ['Obstetrician & Gynecologist', ['MBBS', 'MS (OBG)'], ['Pregnancy care', 'PCOS', 'Menstrual disorders']],
  ENT: ['ENT Specialist', ['MBBS', 'MS (ENT)'], ['Sinusitis', 'Hearing loss', 'Tonsillitis', 'Vertigo']],
  Neurology: ['Neurologist', ['MBBS', 'DM (Neurology)'], ['Migraine', 'Epilepsy', 'Stroke', 'Neuropathy']],
};

// [dept, name, years, in-person fee, video fee, modes]
const RAW_DOCTORS = [
  ['General Medicine', 'Rajesh Malhotra', 22, 600, 450], ['General Medicine', 'Sunita Deshmukh', 17, 500, 400],
  ['General Medicine', 'Amit Bhatnagar', 11, 450, 350], ['General Medicine', 'Kavita Iyer', 9, 400, 300],
  ['Cardiology', 'Suresh Chandra', 25, 1100, 900], ['Cardiology', 'Priya Menon', 15, 900, 750],
  ['Cardiology', 'Dinesh Agarwal', 19, 1000, 800], ['Cardiology', 'Ritu Saxena', 12, 850, 700],
  ['Dermatology', 'Shalini Bose', 14, 700, 550], ['Dermatology', 'Karan Oberoi', 8, 600, 450],
  ['Dermatology', 'Pooja Nambiar', 11, 650, 500], ['Dermatology', 'Imran Qureshi', 10, 600, 480],
  ['Pediatrics', 'Anjali Kulkarni', 16, 550, 450], ['Pediatrics', 'Manoj Tiwari', 13, 500, 400],
  ['Pediatrics', 'Deepa Krishnan', 10, 500, 400], ['Pediatrics', 'Harish Pandey', 18, 600, 500],
  ['Orthopedics', 'Vivek Choudhary', 21, 900, 0], ['Orthopedics', 'Neelam Reddy', 12, 800, 650],
  ['Orthopedics', 'Gaurav Bansal', 14, 850, 700], ['Orthopedics', 'Sandeep Joshi', 17, 900, 0],
  ['Gynecology', 'Radhika Shetty', 19, 850, 650], ['Gynecology', 'Aarti Mishra', 13, 750, 600],
  ['Gynecology', 'Fatima Sheikh', 11, 700, 550], ['Gynecology', 'Lakshmi Venkatesh', 22, 950, 750],
  ['ENT', 'Arvind Kapoor', 20, 700, 550], ['ENT', 'Smita Patil', 9, 550, 450],
  ['ENT', 'Tarun Khanna', 12, 600, 480], ['ENT', 'Nandini Rao', 15, 650, 520],
  ['Neurology', 'Ashok Varma', 24, 1200, 1000], ['Neurology', 'Meenakshi Sundaram', 16, 1000, 800],
  ['Neurology', 'Rahul Dixit', 13, 900, 750], ['Neurology', 'Sana Ahmed', 10, 850, 700],
];

export const EXTRA_DOCTORS = RAW_DOCTORS.map(([dept, name, exp, inPerson, video], i) => {
  const [spec, q, conditions] = DEPT_INFO[dept];
  return {
    name, email: name.toLowerCase().replace(/[^a-z]+/g, '.'), dept, spec, q, exp, conditions,
    fee: [inPerson, video], modes: video ? ['in_person', 'video'] : ['in_person'],
    weekly: PATTERNS[i % PATTERNS.length](), reg: `MCI-${70000 + i * 137}`,
  };
});

export const EXTRA_PHARMACISTS = [
  ['pharmacy2@carepulse.local', 'Anil Gupta', '919000000010'],
  ['pharmacy3@carepulse.local', 'Rekha Pillai', '919000000011'],
];

export const EXTRA_RIDERS = [
  ['rider3@carepulse.local', 'Sunil Yadav', '919000000005', 28.6304, 77.2177],
  ['rider4@carepulse.local', 'Mohit Sharma', '919000000006', 28.5672, 77.321],
  ['rider5@carepulse.local', 'Deepak Singh', '919000000007', 28.7041, 77.1025],
  ['rider6@carepulse.local', 'Arif Hussain', '919000000008', 28.4595, 77.0266],
];

export const EXTRA_PATIENTS = [
  ['patient2@carepulse.local', 'Neha Arora', '919888800001', 'female', 'O+'],
  ['patient3@carepulse.local', 'Rohan Mehra', '919888800002', 'male', 'A+'],
  ['patient4@carepulse.local', 'Ayesha Siddiqui', '919888800003', 'female', 'AB+'],
];

// generic, category, form, rx, strengths[], base price (INR, smallest strength), brands [name, manufacturer]
const G = [
  // Fever & Pain
  ['Paracetamol', 'Fever & Pain', 'Tablet', false, ['500 mg', '650 mg', '1000 mg'], 22, [['Crocin', 'GSK'], ['Calpol', 'GSK'], ['Pacimol', 'Ipca']]],
  ['Ibuprofen', 'Fever & Pain', 'Tablet', false, ['200 mg', '400 mg', '600 mg'], 28, [['Brufen', 'Abbott'], ['Ibugesic', 'Cipla']]],
  ['Diclofenac', 'Fever & Pain', 'Tablet', true, ['50 mg', '75 mg', '100 mg SR'], 30, [['Voveran', 'Novartis'], ['Dynapar', 'Troikaa']]],
  ['Aceclofenac', 'Fever & Pain', 'Tablet', true, ['100 mg', '200 mg SR'], 55, [['Zerodol', 'Ipca'], ['Hifenac', 'Intas']]],
  ['Naproxen', 'Fever & Pain', 'Tablet', true, ['250 mg', '500 mg'], 60, [['Naprosyn', 'Roche'], ['Xenobid', 'Sun Pharma']]],
  ['Etoricoxib', 'Fever & Pain', 'Tablet', true, ['60 mg', '90 mg', '120 mg'], 90, [['Nucoxia', 'Zydus'], ['Etoshine', 'Alkem']]],
  ['Tramadol', 'Fever & Pain', 'Capsule', true, ['50 mg', '100 mg SR'], 70, [['Ultracet', 'Janssen'], ['Domadol', 'Wockhardt']]],
  ['Paracetamol Syrup', 'Fever & Pain', 'Syrup', false, ['125 mg/5 ml', '250 mg/5 ml'], 45, [['Calpol Syrup', 'GSK'], ['Crocin Syrup', 'GSK']]],
  // Antibiotics
  ['Amoxicillin', 'Antibiotics', 'Capsule', true, ['250 mg', '500 mg'], 70, [['Mox', 'Ranbaxy'], ['Novamox', 'Cipla']]],
  ['Amoxicillin + Clavulanate', 'Antibiotics', 'Tablet', true, ['375 mg', '625 mg', '1000 mg'], 140, [['Augmentin', 'GSK'], ['Clavam', 'Alkem']]],
  ['Azithromycin', 'Antibiotics', 'Tablet', true, ['250 mg', '500 mg'], 85, [['Azithral', 'Alembic'], ['Zithromax', 'Pfizer']]],
  ['Cefixime', 'Antibiotics', 'Tablet', true, ['100 mg', '200 mg', '400 mg'], 95, [['Taxim-O', 'Alkem'], ['Zifi', 'FDC']]],
  ['Cefuroxime', 'Antibiotics', 'Tablet', true, ['250 mg', '500 mg'], 160, [['Zocef', 'Alkem'], ['Ceftum', 'GSK']]],
  ['Ciprofloxacin', 'Antibiotics', 'Tablet', true, ['250 mg', '500 mg', '750 mg'], 65, [['Ciplox', 'Cipla'], ['Cifran', 'Sun Pharma']]],
  ['Levofloxacin', 'Antibiotics', 'Tablet', true, ['250 mg', '500 mg', '750 mg'], 110, [['Levaquin', 'Janssen'], ['Levoflox', 'Cipla']]],
  ['Doxycycline', 'Antibiotics', 'Capsule', true, ['100 mg', '200 mg'], 60, [['Doxy-1', 'Lupin'], ['Microdox', 'Micro Labs']]],
  ['Metronidazole', 'Antibiotics', 'Tablet', true, ['200 mg', '400 mg', '500 mg'], 25, [['Flagyl', 'Abbott'], ['Metrogyl', 'JB Chemicals']]],
  ['Cephalexin', 'Antibiotics', 'Capsule', true, ['250 mg', '500 mg'], 75, [['Sporidex', 'Ranbaxy'], ['Phexin', 'Glaxo']]],
  ['Nitrofurantoin', 'Antibiotics', 'Capsule', true, ['50 mg', '100 mg'], 85, [['Niftran', 'Ipca'], ['Furadantin', 'Cipla']]],
  ['Clindamycin', 'Antibiotics', 'Capsule', true, ['150 mg', '300 mg'], 130, [['Dalacin', 'Pfizer'], ['Clinda', 'Lupin']]],
  // Allergy & Cold
  ['Cetirizine', 'Allergy & Cold', 'Tablet', false, ['5 mg', '10 mg'], 18, [['Okacet', 'Cipla'], ['Alerid', 'Cipla'], ['Zyrtec', 'GSK']]],
  ['Levocetirizine', 'Allergy & Cold', 'Tablet', false, ['2.5 mg', '5 mg'], 45, [['Xyzal', 'UCB'], ['Levocet', 'Hetero']]],
  ['Fexofenadine', 'Allergy & Cold', 'Tablet', false, ['60 mg', '120 mg', '180 mg'], 95, [['Allegra', 'Sanofi'], ['Fexova', 'Cipla']]],
  ['Montelukast', 'Allergy & Cold', 'Tablet', true, ['4 mg', '5 mg', '10 mg'], 110, [['Montair', 'Cipla'], ['Singulair', 'MSD']]],
  ['Chlorpheniramine', 'Allergy & Cold', 'Tablet', false, ['4 mg'], 12, [['Piriton', 'GSK'], ['Cpm', 'Zydus']]],
  ['Dextromethorphan Syrup', 'Allergy & Cold', 'Syrup', false, ['100 ml', '200 ml'], 85, [['Benadryl DR', 'Johnson & Johnson'], ['Tixylix', 'Cipla']]],
  ['Ambroxol Syrup', 'Allergy & Cold', 'Syrup', false, ['30 mg/5 ml', '15 mg/5 ml'], 70, [['Ambrodil', 'Aristo'], ['Mucolite', 'Cipla']]],
  ['Xylometazoline Nasal Drops', 'Allergy & Cold', 'Drops', false, ['0.05%', '0.1%'], 55, [['Otrivin', 'GSK'], ['Nasivion', 'Merck']]],
  // Diabetes
  ['Metformin', 'Diabetes', 'Tablet', true, ['500 mg', '850 mg', '1000 mg SR'], 28, [['Glycomet', 'USV'], ['Glucophage', 'Merck']]],
  ['Glimepiride', 'Diabetes', 'Tablet', true, ['1 mg', '2 mg', '3 mg'], 70, [['Amaryl', 'Sanofi'], ['Glimy', 'Lupin']]],
  ['Gliclazide', 'Diabetes', 'Tablet', true, ['40 mg', '80 mg', '60 mg MR'], 65, [['Diamicron', 'Servier'], ['Reclide', 'Dr Reddys']]],
  ['Sitagliptin', 'Diabetes', 'Tablet', true, ['25 mg', '50 mg', '100 mg'], 190, [['Januvia', 'MSD'], ['Zita', 'Zydus']]],
  ['Vildagliptin', 'Diabetes', 'Tablet', true, ['50 mg'], 140, [['Galvus', 'Novartis'], ['Jalra', 'USV']]],
  ['Teneligliptin', 'Diabetes', 'Tablet', true, ['20 mg'], 90, [['Tenepia', 'Zydus'], ['Ziten', 'Zydus']]],
  ['Dapagliflozin', 'Diabetes', 'Tablet', true, ['5 mg', '10 mg'], 180, [['Forxiga', 'AstraZeneca'], ['Oxra', 'Zydus']]],
  ['Pioglitazone', 'Diabetes', 'Tablet', true, ['15 mg', '30 mg'], 60, [['Pioz', 'USV'], ['Pioglar', 'Ranbaxy']]],
  ['Insulin Glargine', 'Diabetes', 'Injection', true, ['100 IU/ml 3 ml', '100 IU/ml 10 ml'], 650, [['Lantus', 'Sanofi'], ['Basalog', 'Biocon']]],
  ['Insulin Human Mixtard', 'Diabetes', 'Injection', true, ['30/70 3 ml', '30/70 10 ml'], 250, [['Mixtard', 'Novo Nordisk'], ['Huminsulin', 'Eli Lilly']]],
  // Heart & BP
  ['Amlodipine', 'Heart & BP', 'Tablet', true, ['2.5 mg', '5 mg', '10 mg'], 35, [['Amlong', 'Micro Labs'], ['Norvasc', 'Pfizer']]],
  ['Telmisartan', 'Heart & BP', 'Tablet', true, ['20 mg', '40 mg', '80 mg'], 85, [['Telma', 'Glenmark'], ['Micardis', 'Boehringer']]],
  ['Losartan', 'Heart & BP', 'Tablet', true, ['25 mg', '50 mg', '100 mg'], 60, [['Losar', 'Unichem'], ['Repace', 'Sun Pharma']]],
  ['Olmesartan', 'Heart & BP', 'Tablet', true, ['20 mg', '40 mg'], 110, [['Olmezest', 'Sun Pharma'], ['Olsar', 'Zydus']]],
  ['Metoprolol', 'Heart & BP', 'Tablet', true, ['25 mg', '50 mg', '100 mg'], 45, [['Metolar', 'Cipla'], ['Betaloc', 'AstraZeneca']]],
  ['Atenolol', 'Heart & BP', 'Tablet', true, ['25 mg', '50 mg', '100 mg'], 30, [['Aten', 'Zydus'], ['Tenormin', 'AstraZeneca']]],
  ['Bisoprolol', 'Heart & BP', 'Tablet', true, ['2.5 mg', '5 mg', '10 mg'], 70, [['Concor', 'Merck'], ['Bisoheart', 'Sun Pharma']]],
  ['Ramipril', 'Heart & BP', 'Capsule', true, ['2.5 mg', '5 mg', '10 mg'], 95, [['Cardace', 'Sanofi'], ['Ramace', 'Aventis']]],
  ['Atorvastatin', 'Heart & BP', 'Tablet', true, ['10 mg', '20 mg', '40 mg', '80 mg'], 90, [['Lipitor', 'Pfizer'], ['Atorva', 'Zydus'], ['Storvas', 'Sun Pharma']]],
  ['Rosuvastatin', 'Heart & BP', 'Tablet', true, ['5 mg', '10 mg', '20 mg', '40 mg'], 110, [['Rosuvas', 'Sun Pharma'], ['Crestor', 'AstraZeneca']]],
  ['Clopidogrel', 'Heart & BP', 'Tablet', true, ['75 mg', '150 mg'], 80, [['Plavix', 'Sanofi'], ['Clopilet', 'Sun Pharma']]],
  ['Aspirin', 'Heart & BP', 'Tablet', true, ['75 mg', '150 mg'], 18, [['Ecosprin', 'USV'], ['Disprin', 'Reckitt']]],
  ['Furosemide', 'Heart & BP', 'Tablet', true, ['20 mg', '40 mg', '80 mg'], 22, [['Lasix', 'Sanofi'], ['Frusenex', 'Cipla']]],
  ['Spironolactone', 'Heart & BP', 'Tablet', true, ['25 mg', '50 mg', '100 mg'], 55, [['Aldactone', 'Pfizer'], ['Spirono', 'Cipla']]],
  ['Isosorbide Mononitrate', 'Heart & BP', 'Tablet', true, ['10 mg', '20 mg', '30 mg SR'], 48, [['Monotrate', 'Torrent'], ['Imdur', 'AstraZeneca']]],
  // Digestive
  ['Pantoprazole', 'Digestive', 'Tablet', false, ['20 mg', '40 mg'], 85, [['Pan', 'Alkem'], ['Pantocid', 'Sun Pharma'], ['Protonix', 'Pfizer']]],
  ['Omeprazole', 'Digestive', 'Capsule', false, ['10 mg', '20 mg', '40 mg'], 55, [['Omez', 'Dr Reddys'], ['Prilosec', 'AstraZeneca']]],
  ['Esomeprazole', 'Digestive', 'Tablet', false, ['20 mg', '40 mg'], 95, [['Nexpro', 'Torrent'], ['Raciper', 'Dr Reddys']]],
  ['Rabeprazole', 'Digestive', 'Tablet', false, ['10 mg', '20 mg'], 75, [['Razo', 'Dr Reddys'], ['Rablet', 'Lupin']]],
  ['Ranitidine', 'Digestive', 'Tablet', false, ['150 mg', '300 mg'], 20, [['Rantac', 'JB Chemicals'], ['Zinetac', 'GSK']]],
  ['Domperidone', 'Digestive', 'Tablet', false, ['10 mg', '30 mg SR'], 40, [['Domstal', 'Torrent'], ['Motilium', 'Janssen']]],
  ['Ondansetron', 'Digestive', 'Tablet', true, ['4 mg', '8 mg'], 50, [['Emeset', 'Cipla'], ['Zofran', 'GSK']]],
  ['Loperamide', 'Digestive', 'Capsule', false, ['2 mg'], 20, [['Imodium', 'Janssen'], ['Eldoper', 'Eldoper']]],
  ['Racecadotril', 'Digestive', 'Capsule', true, ['10 mg', '30 mg', '100 mg'], 60, [['Redotil', 'Dr Reddys'], ['Hidrasec', 'Abbott']]],
  ['Lactulose Solution', 'Digestive', 'Syrup', false, ['100 ml', '200 ml', '450 ml'], 110, [['Duphalac', 'Abbott'], ['Looz', 'Mankind']]],
  ['Bisacodyl', 'Digestive', 'Tablet', false, ['5 mg', '10 mg'], 15, [['Dulcolax', 'Sanofi']]],
  ['Oral Rehydration Salts', 'Digestive', 'Powder', false, ['21 g', '4.1 g'], 22, [['Electral', 'FDC'], ['Walyte', 'Wockhardt']]],
  ['Antacid Gel', 'Digestive', 'Syrup', false, ['170 ml', '200 ml'], 90, [['Digene', 'Abbott'], ['Gelusil', 'Pfizer'], ['Mucaine', 'Pfizer']]],
  ['Mebeverine', 'Digestive', 'Tablet', true, ['135 mg', '200 mg SR'], 65, [['Colospa', 'Abbott'], ['Mebex', 'Cipla']]],
  // Vitamins & Supplements
  ['Cholecalciferol', 'Vitamins', 'Capsule', false, ['1000 IU', '60000 IU', '2000 IU'], 55, [['Calcirol', 'Cadila'], ['Uprise D3', 'Alkem'], ['D-Rise', 'USV']]],
  ['Methylcobalamin', 'Vitamins', 'Tablet', false, ['500 mcg', '1500 mcg'], 90, [['Mecobalamin', 'Mankind'], ['Nurokind', 'Mankind']]],
  ['Folic Acid', 'Vitamins', 'Tablet', false, ['5 mg'], 12, [['Folvite', 'Pfizer'], ['Folinext', 'Zydus']]],
  ['Ferrous Ascorbate + Folic Acid', 'Vitamins', 'Tablet', false, ['100 mg', '150 mg'], 85, [['Orofer XT', 'Emcure'], ['Fefol', 'GSK']]],
  ['Calcium Carbonate + D3', 'Vitamins', 'Tablet', false, ['500 mg', '1000 mg'], 95, [['Shelcal', 'Torrent'], ['Calcimax', 'Meyer']]],
  ['Multivitamin & Minerals', 'Vitamins', 'Capsule', false, ['Daily', 'Senior', 'Women'], 190, [['Becosules', 'Pfizer'], ['Supradyn', 'Bayer'], ['Zincovit', 'Apex']]],
  ['Vitamin C', 'Vitamins', 'Tablet', false, ['500 mg', '1000 mg'], 40, [['Celin', 'GSK'], ['Limcee', 'Abbott']]],
  ['Zinc Sulphate', 'Vitamins', 'Tablet', false, ['20 mg', '50 mg'], 30, [['Zinconia', 'Cadila'], ['Z&D', 'Cipla']]],
  ['Omega-3 Fatty Acids', 'Vitamins', 'Capsule', false, ['500 mg', '1000 mg'], 220, [['Maxepa', 'Merck'], ['Omega Fit', 'Zydus']]],
  ['Protein Powder', 'Vitamins', 'Powder', false, ['200 g', '400 g', '1 kg'], 450, [['Protinex', 'Danone'], ['Ensure', 'Abbott']]],
  // Skin Care
  ['Clotrimazole', 'Skin Care', 'Cream', false, ['1% 15 g', '1% 30 g'], 60, [['Candid', 'Glenmark'], ['Canesten', 'Bayer']]],
  ['Terbinafine', 'Skin Care', 'Cream', false, ['1% 10 g', '1% 15 g'], 130, [['Terbicip', 'Cipla'], ['Lamisil', 'Novartis']]],
  ['Mometasone', 'Skin Care', 'Cream', true, ['0.1% 10 g', '0.1% 15 g'], 120, [['Elocon', 'MSD'], ['Momate', 'Glenmark']]],
  ['Betamethasone', 'Skin Care', 'Cream', true, ['0.05% 15 g', '0.1% 20 g'], 75, [['Betnovate', 'GSK'], ['Betnesol', 'GSK']]],
  ['Adapalene', 'Skin Care', 'Gel', true, ['0.1% 15 g', '0.3% 15 g'], 165, [['Differin', 'Galderma'], ['Adaferin', 'Galderma']]],
  ['Clindamycin Gel', 'Skin Care', 'Gel', true, ['1% 15 g', '1% 20 g'], 150, [['Clindac A', 'Lupin'], ['Clinagel', 'Dr Reddys']]],
  ['Permethrin Lotion', 'Skin Care', 'Lotion', true, ['5% 30 ml', '5% 60 ml'], 140, [['Scabper', 'Glaxo'], ['Permite', 'Dr Reddys']]],
  ['Calamine Lotion', 'Skin Care', 'Lotion', false, ['100 ml', '200 ml'], 80, [['Lacto Calamine', 'Piramal'], ['Caladryl', 'Piramal']]],
  ['Moisturising Cream', 'Skin Care', 'Cream', false, ['100 g', '200 g', '500 g'], 280, [['Cetaphil', 'Galderma'], ['Moisturex', 'USV']]],
  ['Sunscreen SPF 50', 'Skin Care', 'Lotion', false, ['50 g', '100 g'], 380, [['Sunstop', 'Sebamed'], ['Re\'equil', 'Ranbaxy']]],
  ['Minoxidil', 'Skin Care', 'Solution', false, ['2% 60 ml', '5% 60 ml'], 450, [['Tugain', 'Cipla'], ['Mintop', 'Dr Reddys']]],
  ['Ketoconazole Shampoo', 'Skin Care', 'Shampoo', false, ['2% 60 ml', '2% 100 ml'], 190, [['Nizral', 'Janssen'], ['Ketocip', 'Cipla']]],
  // Respiratory
  ['Salbutamol Inhaler', 'Respiratory', 'Inhaler', true, ['100 mcg 200 MDI'], 150, [['Asthalin', 'Cipla'], ['Ventolin', 'GSK']]],
  ['Budesonide + Formoterol', 'Respiratory', 'Inhaler', true, ['80/4.5', '160/4.5', '400/6'], 450, [['Foracort', 'Cipla'], ['Symbicort', 'AstraZeneca']]],
  ['Ipratropium + Levosalbutamol', 'Respiratory', 'Inhaler', true, ['Respules 2.5 ml', 'MDI 200 doses'], 180, [['Duolin', 'Cipla'], ['Ipravent', 'Lupin']]],
  ['Theophylline', 'Respiratory', 'Tablet', true, ['100 mg SR', '200 mg SR', '300 mg SR'], 40, [['Deriphyllin', 'Zydus'], ['Unicontin', 'Modi-Mundi']]],
  ['Acetylcysteine', 'Respiratory', 'Tablet', true, ['200 mg', '600 mg effervescent'], 95, [['Mucomix', 'Sun Pharma'], ['Mucinac', 'Cipla']]],
  ['Salbutamol Syrup', 'Respiratory', 'Syrup', true, ['2 mg/5 ml 100 ml'], 40, [['Asthalin Syrup', 'Cipla'], ['Salbair', 'Cipla']]],
  // Thyroid & Hormones
  ['Levothyroxine', 'Thyroid', 'Tablet', true, ['25 mcg', '50 mcg', '75 mcg', '100 mcg', '125 mcg'], 110, [['Thyronorm', 'Abbott'], ['Eltroxin', 'GSK']]],
  ['Carbimazole', 'Thyroid', 'Tablet', true, ['5 mg', '10 mg'], 70, [['Neomercazole', 'Abbott'], ['Thyrocab', 'Mankind']]],
  ['Prednisolone', 'Hormones', 'Tablet', true, ['5 mg', '10 mg', '20 mg'], 25, [['Wysolone', 'Pfizer'], ['Omnacortil', 'Macleods']]],
  ['Dexamethasone', 'Hormones', 'Tablet', true, ['0.5 mg', '4 mg'], 15, [['Dexona', 'Zydus'], ['Decdan', 'Cadila']]],
  ['Medroxyprogesterone', 'Hormones', 'Tablet', true, ['5 mg', '10 mg'], 90, [['Meprate', 'Zydus'], ['Provera', 'Pfizer']]],
  ['Norethisterone', 'Hormones', 'Tablet', true, ['5 mg'], 75, [['Regestrone', 'Zydus'], ['Primolut N', 'Bayer']]],
  // Neuro & Mental health
  ['Gabapentin', 'Neurology', 'Capsule', true, ['100 mg', '300 mg', '400 mg'], 95, [['Gabapin', 'Intas'], ['Neurontin', 'Pfizer']]],
  ['Pregabalin', 'Neurology', 'Capsule', true, ['50 mg', '75 mg', '150 mg'], 110, [['Lyrica', 'Pfizer'], ['Pregalin', 'Sun Pharma']]],
  ['Levetiracetam', 'Neurology', 'Tablet', true, ['250 mg', '500 mg', '750 mg'], 120, [['Keppra', 'UCB'], ['Levipil', 'Sun Pharma']]],
  ['Sodium Valproate', 'Neurology', 'Tablet', true, ['200 mg', '300 mg CR', '500 mg CR'], 85, [['Valparin', 'Sanofi'], ['Encorate', 'Sun Pharma']]],
  ['Carbamazepine', 'Neurology', 'Tablet', true, ['100 mg', '200 mg', '400 mg CR'], 50, [['Tegretol', 'Novartis'], ['Zen Retard', 'Torrent']]],
  ['Sumatriptan', 'Neurology', 'Tablet', true, ['25 mg', '50 mg', '100 mg'], 130, [['Suminat', 'Sun Pharma'], ['Imigran', 'GSK']]],
  ['Flunarizine', 'Neurology', 'Tablet', true, ['5 mg', '10 mg'], 70, [['Sibelium', 'Janssen'], ['Flunarin', 'Cipla']]],
  ['Betahistine', 'Neurology', 'Tablet', true, ['8 mg', '16 mg', '24 mg'], 85, [['Vertin', 'Abbott'], ['Betavert', 'Intas']]],
  ['Escitalopram', 'Mental Health', 'Tablet', true, ['5 mg', '10 mg', '20 mg'], 85, [['Nexito', 'Sun Pharma'], ['Lexapro', 'Lundbeck']]],
  ['Sertraline', 'Mental Health', 'Tablet', true, ['25 mg', '50 mg', '100 mg'], 90, [['Serta', 'Sun Pharma'], ['Zoloft', 'Pfizer']]],
  ['Alprazolam', 'Mental Health', 'Tablet', true, ['0.25 mg', '0.5 mg'], 40, [['Alprax', 'Torrent'], ['Restyl', 'Cipla']]],
  ['Melatonin', 'Mental Health', 'Tablet', false, ['3 mg', '5 mg'], 160, [['Meloset', 'Lupin'], ['Sleepwell', 'Zydus']]],
  // Muscle & Bone
  ['Thiocolchicoside', 'Muscle & Bone', 'Tablet', true, ['4 mg', '8 mg'], 85, [['Thiocol', 'Sun Pharma'], ['Myoril', 'Sanofi']]],
  ['Chlorzoxazone + Paracetamol', 'Muscle & Bone', 'Tablet', true, ['250/325 mg', '500/325 mg'], 55, [['Myospaz', 'Ipca'], ['Zoxan', 'Cipla']]],
  ['Alendronate', 'Muscle & Bone', 'Tablet', true, ['35 mg', '70 mg'], 120, [['Fosamax', 'MSD'], ['Osteofos', 'Cipla']]],
  ['Glucosamine + Chondroitin', 'Muscle & Bone', 'Tablet', false, ['750/600 mg', '1500/1200 mg'], 320, [['Cartigen', 'Alkem'], ['Joint Active', 'Zydus']]],
  ['Diclofenac Gel', 'Muscle & Bone', 'Gel', false, ['1% 30 g', '1% 50 g'], 90, [['Volini', 'Sun Pharma'], ['Voveran Emulgel', 'Novartis']]],
  ['Methyl Salicylate Spray', 'Muscle & Bone', 'Spray', false, ['35 g', '55 g'], 170, [['Moov', 'Reckitt'], ['Iodex', 'GSK']]],
  // Eye & Ear
  ['Moxifloxacin Eye Drops', 'Eye & Ear', 'Drops', true, ['0.5% 5 ml'], 95, [['Vigamox', 'Alcon'], ['Moxicip', 'Cipla']]],
  ['Carboxymethylcellulose Eye Drops', 'Eye & Ear', 'Drops', false, ['0.5% 10 ml', '1% 10 ml'], 140, [['Refresh Tears', 'Allergan'], ['Optive', 'Allergan']]],
  ['Ciprofloxacin Ear Drops', 'Eye & Ear', 'Drops', true, ['0.3% 5 ml', '0.3% 10 ml'], 55, [['Ciplox Ear', 'Cipla'], ['Otogesic', 'Wockhardt']]],
  ['Clotrimazole Ear Drops', 'Eye & Ear', 'Drops', true, ['1% 10 ml'], 60, [['Candibiotic', 'Glenmark'], ['Clotrin', 'FDC']]],
  // Women's health
  ['Tranexamic Acid', 'Womens Health', 'Tablet', true, ['250 mg', '500 mg'], 110, [['Pause', 'Intas'], ['Tranexa', 'Zydus']]],
  ['Progesterone', 'Womens Health', 'Capsule', true, ['100 mg', '200 mg', '400 mg'], 260, [['Susten', 'Sun Pharma'], ['Duphaston', 'Abbott']]],
  ['Mefenamic Acid', 'Womens Health', 'Tablet', true, ['250 mg', '500 mg'], 45, [['Meftal', 'Blue Cross'], ['Ponstan', 'Pfizer']]],
  ['Clomiphene', 'Womens Health', 'Tablet', true, ['25 mg', '50 mg', '100 mg'], 95, [['Fertomid', 'Cipla'], ['Siphene', 'Serum']]],
  // First Aid & Devices
  ['Povidone Iodine', 'First Aid', 'Ointment', false, ['5% 15 g', '5% 20 g'], 60, [['Betadine', 'Win-Medicare'], ['Wokadine', 'Wockhardt']]],
  ['Antiseptic Liquid', 'First Aid', 'Liquid', false, ['100 ml', '250 ml', '550 ml'], 80, [['Dettol', 'Reckitt'], ['Savlon', 'ITC']]],
  ['Crepe Bandage', 'First Aid', 'Bandage', false, ['6 cm', '10 cm', '15 cm'], 55, [['Dynaplast', 'Dynamic'], ['Elastocrepe', 'Smith & Nephew']]],
  ['Adhesive Bandage', 'First Aid', 'Bandage', false, ['10 strips', '100 strips'], 25, [['Band-Aid', 'J&J'], ['Handyplast', 'Win-Medicare']]],
  ['Sterile Gauze', 'First Aid', 'Bandage', false, ['10 x 10 cm (10)', '10 x 10 cm (50)'], 40, [['Medisafe', 'Medisafe'], ['Surgi-Pad', 'Dynamic']]],
  ['Digital Thermometer', 'Devices', 'Device', false, ['Standard', 'Flexi-tip'], 220, [['Omron MC-246', 'Omron'], ['Dr Morepen MT-110', 'Morepen']]],
  ['Blood Pressure Monitor', 'Devices', 'Device', false, ['Upper arm', 'Wrist'], 1650, [['Omron HEM', 'Omron'], ['Dr Morepen BP', 'Morepen']]],
  ['Glucometer Strips', 'Devices', 'Strips', false, ['25 strips', '50 strips', '100 strips'], 480, [['Accu-Chek Active', 'Roche'], ['OneTouch Select', 'LifeScan']]],
  ['Pulse Oximeter', 'Devices', 'Device', false, ['Fingertip'], 1100, [['Dr Trust', 'Dr Trust'], ['Mediclone', 'Mediclone']]],
  ['Surgical Mask', 'Devices', 'Box', false, ['50 pcs', '100 pcs'], 150, [['3M Mask', '3M'], ['Venus', 'Venus']]],
  ['Nebuliser', 'Devices', 'Device', false, ['Compressor'], 1650, [['Omron NE-C101', 'Omron'], ['Philips Respironics', 'Philips']]],
  ['Hand Sanitizer', 'First Aid', 'Liquid', false, ['100 ml', '500 ml'], 70, [['Dettol Sanitizer', 'Reckitt'], ['Lifebuoy', 'HUL']]],
];

const LOW_RX_STOCK = [60, 120, 180, 240, 320];
const strengthNum = (s) => Number((s.match(/[\d.]+/) || [1])[0]);

export function buildMedicines() {
  const out = [];
  G.forEach(([generic, category, form, rx, strengths, base, brands], gi) => {
    brands.forEach(([brand, manufacturer], bi) => {
      strengths.forEach((strength, si) => {
        const factor = 1 + si * 0.55 + bi * 0.08;
        const mrp = Math.max(5, Math.round(base * factor));
        const price = Math.max(4, Math.round(mrp * (0.82 + ((gi + bi + si) % 4) * 0.03)));
        const stock = LOW_RX_STOCK[(gi + si + bi) % LOW_RX_STOCK.length] + ((gi * 7 + si * 3) % 50);
        const name = form === 'Device' || form === 'Strips' || form === 'Box' ? brand : `${brand} ${strengthNum(strength) || ''}`.trim();
        out.push([name, generic, category, form, strength, mrp, price, stock, rx, manufacturer]);
      });
    });
  });
  return out;
}
