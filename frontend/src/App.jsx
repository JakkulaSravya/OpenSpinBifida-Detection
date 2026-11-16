import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Public pages
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import Register from './pages/Register';

// Patient pages
import PatientDashboard from './pages/patient/PatientDashboard';
import UploadAnalysis from './pages/patient/UploadAnalysis';
import AIProcessing from './pages/patient/AIProcessing';
import Reports from './pages/patient/Reports';
import DoctorListing from './pages/patient/DoctorListing';
import BookAppointment from './pages/patient/BookAppointment';
import PatientAppointments from './pages/patient/PatientAppointments';
import PatientMessages from './pages/patient/PatientMessages';
import PatientSettings from './pages/patient/PatientSettings';
import PaymentPage from './pages/patient/PaymentPage';

// Doctor pages
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import ConsultationRequests from './pages/doctor/ConsultationRequests';
import ScheduleManagement from './pages/doctor/ScheduleManagement';
import CaseHistory from './pages/doctor/CaseHistory';
import DoctorMessages from './pages/doctor/DoctorMessages';
import DoctorSettings from './pages/doctor/DoctorSettings';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Patient */}
          <Route path="/patient/dashboard" element={<ProtectedRoute role="patient"><PatientDashboard /></ProtectedRoute>} />
          <Route path="/patient/upload" element={<ProtectedRoute role="patient"><UploadAnalysis /></ProtectedRoute>} />
          <Route path="/patient/processing" element={<ProtectedRoute role="patient"><AIProcessing /></ProtectedRoute>} />
          <Route path="/patient/reports" element={<ProtectedRoute role="patient"><Reports /></ProtectedRoute>} />
          <Route path="/patient/doctors" element={<ProtectedRoute role="patient"><DoctorListing /></ProtectedRoute>} />
          <Route path="/patient/book" element={<ProtectedRoute role="patient"><BookAppointment /></ProtectedRoute>} />
          <Route path="/patient/appointments" element={<ProtectedRoute role="patient"><PatientAppointments /></ProtectedRoute>} />
          <Route path="/patient/messages" element={<ProtectedRoute role="patient"><PatientMessages /></ProtectedRoute>} />
          <Route path="/patient/settings" element={<ProtectedRoute role="patient"><PatientSettings /></ProtectedRoute>} />
          <Route path="/patient/payment/:appointmentId" element={<ProtectedRoute role="patient"><PaymentPage /></ProtectedRoute>} />

          {/* Doctor */}
          <Route path="/doctor/dashboard" element={<ProtectedRoute role="doctor"><DoctorDashboard /></ProtectedRoute>} />
          <Route path="/doctor/consultations" element={<ProtectedRoute role="doctor"><ConsultationRequests /></ProtectedRoute>} />
          <Route path="/doctor/schedule" element={<ProtectedRoute role="doctor"><ScheduleManagement /></ProtectedRoute>} />
          <Route path="/doctor/cases" element={<ProtectedRoute role="doctor"><CaseHistory /></ProtectedRoute>} />
          <Route path="/doctor/messages" element={<ProtectedRoute role="doctor"><DoctorMessages /></ProtectedRoute>} />
          <Route path="/doctor/settings" element={<ProtectedRoute role="doctor"><DoctorSettings /></ProtectedRoute>} />

          {/* Default */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
