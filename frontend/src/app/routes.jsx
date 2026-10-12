import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { RequireAuth, RequireRole, StaffRedirect } from './guards.jsx';
import { SiteLayout } from './layouts/SiteLayout.jsx';
import { StaffLayout } from './layouts/StaffLayout.jsx';
import { ADMIN_NAV, DOCTOR_NAV, PHARMACIST_NAV, RIDER_NAV } from './navs.js';
import { PageLoader } from '../components/ui/Feedback.jsx';

const L = (loader) => lazy(loader);
// public
const Home = L(() => import('../pages/public/Home.jsx'));
const Doctors = L(() => import('../pages/public/Doctors.jsx'));
const DoctorDetail = L(() => import('../pages/public/DoctorDetail.jsx'));
const Pharmacy = L(() => import('../pages/public/Pharmacy.jsx'));
const Login = L(() => import('../pages/public/Login.jsx'));
const Register = L(() => import('../pages/public/Register.jsx'));
const NotFound = L(() => import('../pages/public/NotFound.jsx'));
// patient
const Book = L(() => import('../pages/patient/Book.jsx'));
const Appointments = L(() => import('../pages/patient/Appointments.jsx'));
const AppointmentDetail = L(() => import('../pages/patient/AppointmentDetail.jsx'));
const Prescriptions = L(() => import('../pages/patient/Prescriptions.jsx'));
const PrescriptionDetail = L(() => import('../pages/patient/PrescriptionDetail.jsx'));
const Medications = L(() => import('../pages/patient/Medications.jsx'));
const Cart = L(() => import('../pages/patient/Cart.jsx'));
const Orders = L(() => import('../pages/patient/Orders.jsx'));
const OrderDetail = L(() => import('../pages/patient/OrderDetail.jsx'));
const Profile = L(() => import('../pages/patient/Profile.jsx'));
const Notifications = L(() => import('../pages/shared/Notifications.jsx'));
// doctor
const DoctorDashboard = L(() => import('../pages/doctor/Dashboard.jsx'));
const DoctorAppointments = L(() => import('../pages/doctor/Appointments.jsx'));
const Consult = L(() => import('../pages/doctor/Consult.jsx'));
const DoctorSchedule = L(() => import('../pages/doctor/Schedule.jsx'));
const DoctorPrescriptions = L(() => import('../pages/doctor/Prescriptions.jsx'));
const DoctorProfile = L(() => import('../pages/doctor/Profile.jsx'));
// admin / pharmacist
const AdminDashboard = L(() => import('../pages/admin/Dashboard.jsx'));
const AdminAppointments = L(() => import('../pages/admin/Appointments.jsx'));
const AdminDoctors = L(() => import('../pages/admin/Doctors.jsx'));
const AdminDepartments = L(() => import('../pages/admin/Departments.jsx'));
const AdminUsers = L(() => import('../pages/admin/Users.jsx'));
const AdminLogs = L(() => import('../pages/admin/Logs.jsx'));
const AdminSettings = L(() => import('../pages/admin/Settings.jsx'));
const MedicineAdmin = L(() => import('../pages/admin/Medicines.jsx'));
const OrderQueue = L(() => import('../pages/admin/OrderQueue.jsx'));
// rider
const RiderHome = L(() => import('../pages/rider/Deliveries.jsx'));

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<StaffRedirect><Home /></StaffRedirect>} />
          <Route path="/doctors" element={<Doctors />} />
          <Route path="/doctors/:id" element={<DoctorDetail />} />
          <Route path="/pharmacy" element={<Pharmacy />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/cart" element={<Cart />} />

          <Route element={<RequireRole roles={['patient']} />}>
            <Route path="/book/:doctorId" element={<Book />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/appointments/:id" element={<AppointmentDetail />} />
            <Route path="/prescriptions" element={<Prescriptions />} />
            <Route path="/medications" element={<Medications />} />
            <Route path="/orders" element={<Orders />} />
          </Route>
          <Route element={<RequireAuth />}>
            <Route path="/prescriptions/:id" element={<PrescriptionDetail />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/notifications" element={<Notifications />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route element={<RequireRole roles={['doctor']} />}>
          <Route element={<StaffLayout nav={DOCTOR_NAV} title="Doctor workspace" />}>
            <Route path="/doctor" element={<DoctorDashboard />} />
            <Route path="/doctor/appointments" element={<DoctorAppointments />} />
            <Route path="/doctor/consult/:id" element={<Consult />} />
            <Route path="/doctor/schedule" element={<DoctorSchedule />} />
            <Route path="/doctor/prescriptions" element={<DoctorPrescriptions />} />
            <Route path="/doctor/prescriptions/:id" element={<PrescriptionDetail />} />
            <Route path="/doctor/profile" element={<DoctorProfile />} />
            <Route path="/doctor/notifications" element={<Notifications />} />
          </Route>
        </Route>

        <Route element={<RequireRole roles={['admin']} />}>
          <Route element={<StaffLayout nav={ADMIN_NAV} title="Admin console" />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/appointments" element={<AdminAppointments />} />
            <Route path="/admin/doctors" element={<AdminDoctors />} />
            <Route path="/admin/departments" element={<AdminDepartments />} />
            <Route path="/admin/medicines" element={<MedicineAdmin />} />
            <Route path="/admin/orders" element={<OrderQueue />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/logs" element={<AdminLogs />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/notifications" element={<Notifications />} />
          </Route>
        </Route>

        <Route element={<RequireRole roles={['pharmacist']} />}>
          <Route element={<StaffLayout nav={PHARMACIST_NAV} title="Pharmacy desk" />}>
            <Route path="/pharmacist" element={<OrderQueue />} />
            <Route path="/pharmacist/inventory" element={<MedicineAdmin />} />
            <Route path="/pharmacist/notifications" element={<Notifications />} />
          </Route>
        </Route>

        <Route element={<RequireRole roles={['rider']} />}>
          <Route element={<StaffLayout nav={RIDER_NAV} title="Delivery partner" />}>
            <Route path="/rider" element={<RiderHome />} />
            <Route path="/rider/notifications" element={<Notifications />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
