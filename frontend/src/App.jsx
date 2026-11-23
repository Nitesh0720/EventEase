import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import LandingPage from './pages/LandingPage';
import EventsPage from './pages/EventsPage';
import EventDetailsPage from './pages/EventDetailsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboardPage from './pages/student/StudentDashboardPage';
import StudentCertificatesPage from './pages/StudentCertificatesPage';
import AdminEventsPage from './pages/admin/AdminEventsPage';
import AdminAttendancePage from './pages/admin/AdminAttendancePage';
import AdminCertificatesPage from './pages/admin/AdminCertificatesPage';
import VerifyCertificatePage from './pages/VerifyCertificatePage';
import AdminRoute from './components/AdminRoute';
import StudentRoute from './components/StudentRoute';
import NotFoundPage from './pages/NotFoundPage';

/**
 * Root Application Router Configuration
 * Includes AuthProvider, Public Event Discovery, and Protected Admin Routes
 */
function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          {/* Landing Page */}
          <Route index element={<LandingPage />} />
          {/* Events Catalog View */}
          <Route path="events" element={<EventsPage />} />
          {/* Module 4: Event Details Page */}
          <Route path="events/:id" element={<EventDetailsPage />} />
          {/* Authentication Pages */}
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          {/* Module 5: Student Registrations Dashboard (Protected) */}
          <Route
            path="my-registrations"
            element={
              <StudentRoute>
                <StudentDashboardPage />
              </StudentRoute>
            }
          />
          {/* Module 8: Student Certificates Dashboard (Protected) */}
          <Route
            path="my-certificates"
            element={
              <StudentRoute>
                <StudentCertificatesPage />
              </StudentRoute>
            }
          />
          {/* Module 3: Admin Event Management (Protected) */}
          <Route
            path="admin/events"
            element={
              <AdminRoute>
                <AdminEventsPage />
              </AdminRoute>
            }
          />
          {/* Module 7: Admin QR Attendance Management (Protected) */}
          <Route
            path="admin/attendance"
            element={
              <AdminRoute>
                <AdminAttendancePage />
              </AdminRoute>
            }
          />
          {/* Module 8: Admin Certificate Management (Protected) */}
          <Route
            path="admin/certificates"
            element={
              <AdminRoute>
                <AdminCertificatesPage />
              </AdminRoute>
            }
          />
          {/* Module 8: Public Certificate Verification (Public) */}
          <Route path="verify-certificate/:certificateId" element={<VerifyCertificatePage />} />
          {/* 404 Catch-All */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
