import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocketEvent } from '../hooks/useSocketEvent.js';
import { toast } from '../components/ui/Feedback.jsx';

/** Keeps server state fresh from socket events and surfaces live toasts. Renders nothing. */
export function RealtimeBridge() {
  const qc = useQueryClient();
  const onNotification = useCallback((n) => {
    toast.info(n.title + (n.body ? ` — ${n.body}` : ''));
    qc.invalidateQueries({ queryKey: ['notifications'] });
  }, [qc]);
  const onAppt = useCallback(() => {
    ['appointments', 'appointment', 'doctor-appointments', 'doctor-dashboard', 'admin-appointments'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  }, [qc]);
  const onOrder = useCallback(() => {
    ['orders', 'order', 'pharmacy-orders', 'rider-orders', 'admin-dashboard'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  }, [qc]);
  const onRx = useCallback(() => qc.invalidateQueries({ queryKey: ['prescriptions'] }), [qc]);

  useSocketEvent('notification:new', onNotification);
  useSocketEvent('appointment:updated', onAppt);
  useSocketEvent('appointment:new', onAppt);
  useSocketEvent('order:updated', onOrder);
  useSocketEvent('order:new', onOrder);
  useSocketEvent('order:assigned', onOrder);
  useSocketEvent('prescription:ready', onRx);
  return null;
}
