import { Medicine } from '../models/Medicine.js';
import { ApiError } from '../utils/ApiError.js';
import { cacheGetOrSet, invalidateNamespace } from '../utils/cache.js';
import { escapeRegex, slugify } from '../utils/helpers.js';
import { pageMeta, pageParams } from '../utils/pagination.js';

const NS = 'medicines';

export async function listMedicines(query) {
  const { page, limit, skip } = pageParams(query, { defaultLimit: 24, maxLimit: 60 });
  const filter = { isActive: true };
  if (query.category) filter.category = query.category;
  if (query.rx === 'true') filter.requiresPrescription = true;
  if (query.rx === 'false') filter.requiresPrescription = false;
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ name: rx }, { generic: rx }, { category: rx }];
  }
  const sort = { price: { price: 1 }, '-price': { price: -1 }, name: { name: 1 } }[query.sort] || { name: 1 };
  const key = JSON.stringify({ filter: query, page, limit });
  const cacheable = !query.q;
  const load = async () => {
    const [items, total] = await Promise.all([
      Medicine.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Medicine.countDocuments(filter),
    ]);
    return { items, meta: pageMeta(total, page, limit) };
  };
  return cacheable ? cacheGetOrSet(NS, key, 60, load) : load();
}

export const listCategories = () =>
  cacheGetOrSet(NS, 'categories', 300, async () => (await Medicine.distinct('category', { isActive: true })).filter(Boolean).sort());

export async function getMedicine(id) {
  const m = await Medicine.findOne({ _id: id, isActive: true }).lean();
  if (!m) throw ApiError.notFound('Medicine not found');
  return m;
}

/* ------------------------------ staff (admin / pharmacist) ------------------------------ */
export async function adminList(query) {
  const { page, limit, skip } = pageParams(query);
  const filter = {};
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ name: rx }, { generic: rx }];
  }
  if (query.lowStock === 'true') filter.$expr = { $lte: ['$stock', '$lowStockAt'] };
  if (query.isActive === 'true' || query.isActive === 'false') filter.isActive = query.isActive === 'true';
  const [items, total] = await Promise.all([
    Medicine.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Medicine.countDocuments(filter),
  ]);
  return { items, meta: pageMeta(total, page, limit) };
}

export async function createMedicine(data) {
  const slug = `${slugify(`${data.name}-${data.strength || ''}`)}-${Math.random().toString(36).slice(2, 6)}`;
  const m = await Medicine.create({ ...data, slug });
  await invalidateNamespace(NS);
  return m;
}
export async function updateMedicine(id, patch) {
  const m = await Medicine.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true });
  if (!m) throw ApiError.notFound('Medicine not found');
  await invalidateNamespace(NS);
  return m;
}
export async function adjustStock(id, delta, reason) {
  const m = await Medicine.findOneAndUpdate(
    delta < 0 ? { _id: id, stock: { $gte: -delta } } : { _id: id },
    { $inc: { stock: delta } },
    { new: true },
  );
  if (!m) throw ApiError.conflict('Insufficient stock for this adjustment');
  await invalidateNamespace(NS);
  return { ...m.toJSON(), adjustReason: reason };
}
export async function deleteMedicine(id) {
  await updateMedicine(id, { isActive: false });
}
export const lowStock = () => Medicine.find({ isActive: true, $expr: { $lte: ['$stock', '$lowStockAt'] } }).sort({ stock: 1 }).limit(50).lean();
export { NS as MEDICINE_NS };
