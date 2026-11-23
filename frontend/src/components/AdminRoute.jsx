import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

/**
 * AdminRoute Guard
 * Restricts access exclusively to authenticated users with role === 'Admin'
 */
const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="py-5 text-center">
        <LoadingSpinner message="Verifying administrative credentials..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="container py-5 text-center min-vh-50 d-flex flex-column align-items-center justify-content-center">
        <div className="badge bg-danger-subtle text-danger px-3 py-2 mb-3 fw-semibold">
          Access Denied
        </div>
        <h2 className="fw-bold text-navy mb-2">Administrator Access Required</h2>
        <p className="text-charcoal max-w-500 mb-4">
          Your account ({user?.email}) has the <strong>Student</strong> role.
          Administrative privileges are required to manage campus events.
        </p>
        <a href="/" className="btn btn-primary px-4 py-2 fw-semibold">
          Return to Portal
        </a>
      </div>
    );
  }

  return children;
};

export default AdminRoute;

