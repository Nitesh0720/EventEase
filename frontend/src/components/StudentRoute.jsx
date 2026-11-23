import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

/**
 * StudentRoute Guard
 * Restricts access exclusively to authenticated users with role === 'Student'
 */
const StudentRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="py-5 text-center">
        <LoadingSpinner message="Verifying student credentials..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'Student') {
    return (
      <div className="container py-5 text-center min-vh-50 d-flex flex-column align-items-center justify-content-center">
        <div className="badge bg-warning-subtle text-warning-emphasis px-3 py-2 mb-3 fw-semibold">
          Student Portal
        </div>
        <h2 className="fw-bold text-navy mb-2">Student Access Only</h2>
        <p className="text-charcoal max-w-500 mb-4">
          Your account ({user?.email}) is registered as an <strong>{user?.role}</strong>.
          Personal event registrations and student passes are available exclusively to enrolled student accounts.
        </p>
        <a href="/" className="btn btn-primary px-4 py-2 fw-semibold">
          Return to Home
        </a>
      </div>
    );
  }

  return children;
};

export default StudentRoute;

