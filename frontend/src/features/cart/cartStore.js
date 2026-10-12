import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const safeStorage = {
  getItem: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
  removeItem: (k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

export const useCart = create(
  persist(
    (set, get) => ({
      items: [], // { medicine, qty }
      prescriptionId: null,
      add: (medicine, qty = 1) =>
        set((s) => {
          const ex = s.items.find((i) => i.medicine.id === medicine.id || i.medicine._id === medicine._id);
          if (ex) return { items: s.items.map((i) => (i === ex ? { ...i, qty: Math.min(10, i.qty + qty, medicine.stock || 10), medicine } : i)) };
          return { items: [...s.items, { medicine, qty: Math.min(qty, 10) }] };
        }),
      setQty: (id, qty) => set((s) => ({ items: qty <= 0 ? s.items.filter((i) => (i.medicine.id || i.medicine._id) !== id) : s.items.map((i) => ((i.medicine.id || i.medicine._id) === id ? { ...i, qty: Math.min(qty, 10) } : i)) })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => (i.medicine.id || i.medicine._id) !== id) })),
      setPrescription: (prescriptionId) => set({ prescriptionId }),
      clear: () => set({ items: [], prescriptionId: null }),
      count: () => get().items.reduce((n, i) => n + i.qty, 0),
      subtotal: () => get().items.reduce((n, i) => n + i.qty * i.medicine.price, 0),
      needsRx: () => get().items.some((i) => i.medicine.requiresPrescription),
    }),
    { name: 'cp-cart', storage: createJSONStorage(() => safeStorage), partialize: (s) => ({ items: s.items, prescriptionId: s.prescriptionId }) },
  ),
);
export const medId = (m) => m.id || m._id;
