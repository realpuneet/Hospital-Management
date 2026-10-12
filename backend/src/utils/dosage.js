/** "1-0-1" (morning-noon-night) -> reminder times. Explicit timings win. */
export function timesFromDosage(dosage = '1-0-1', timings = []) {
  if (timings?.length) return [...new Set(timings)].sort();
  const parts = String(dosage).split('-').map((x) => parseFloat(x) || 0);
  const slots = ['08:00', '14:00', '21:00'];
  if (parts.length === 4) slots.splice(2, 0, '18:00'); // 1-1-1-1 => morning/noon/evening/night
  const out = parts.map((n, i) => (n > 0 ? slots[i] : null)).filter(Boolean);
  return out.length ? out : ['09:00'];
}
