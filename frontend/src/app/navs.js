import { LayoutDashboard, CalendarDays, Users, Stethoscope, Building2, Pill, Package, ClipboardList, Settings, MailCheck, Clock, FileText, UserCircle, Bell, Truck, Boxes } from 'lucide-react';

export const DOCTOR_NAV = [
  { to: '/doctor', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/doctor/appointments', label: 'Appointments', icon: CalendarDays },
  { to: '/doctor/schedule', label: 'Timings & leave', icon: Clock },
  { to: '/doctor/prescriptions', label: 'Prescriptions', icon: FileText },
  { to: '/doctor/profile', label: 'My profile', icon: UserCircle },
  { to: '/doctor/notifications', label: 'Notifications', icon: Bell },
];
export const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/appointments', label: 'Appointments', icon: CalendarDays },
  { to: '/admin/doctors', label: 'Doctors', icon: Stethoscope },
  { to: '/admin/departments', label: 'Departments', icon: Building2 },
  { to: '/admin/medicines', label: 'Medicines', icon: Pill },
  { to: '/admin/orders', label: 'Medicine orders', icon: Package },
  { to: '/admin/users', label: 'Users & staff', icon: Users },
  { to: '/admin/logs', label: 'Message logs', icon: MailCheck },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
  { to: '/admin/notifications', label: 'Notifications', icon: Bell },
];
export const PHARMACIST_NAV = [
  { to: '/pharmacist', label: 'Orders', icon: ClipboardList, end: true },
  { to: '/pharmacist/inventory', label: 'Inventory', icon: Boxes },
  { to: '/pharmacist/notifications', label: 'Notifications', icon: Bell },
];
export const RIDER_NAV = [
  { to: '/rider', label: 'Deliveries', icon: Truck, end: true },
  { to: '/rider/notifications', label: 'Notifications', icon: Bell },
];
