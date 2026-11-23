import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Client-side validations
    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Please provide your college email address.');
      return;
    }

    if (!formData.password) {
      setErrorMessage('Please provide your password.');
      return;
    }

    if (formData.password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    try {
      setIsSubmitting(true);
      await login(trimmedEmail, formData.password);
      navigate('/');
    } catch (error) {
      const serverMsg =
        error.response?.data?.message ||
        'Unable to sign in. Please verify your credentials and try again.';
      setErrorMessage(serverMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ee-auth-page py-5 bg-light min-vh-75 d-flex align-items-center">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-5">
            <div className="card border rounded-4 bg-white shadow-sm p-4 p-md-5">
              {/* Header */}
              <div className="text-center mb-4">
                <div className="d-inline-flex align-items-center justify-content-center ee-brand-mark mb-3 bg-primary text-white">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <h2 className="h4 fw-bold text-navy mb-1">
                  Sign In to EventEase
                </h2>
                <p className="text-charcoal small mb-0">
                  Access your student or administrator account
                </p>
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div
                  className="alert alert-danger py-2 px-3 small rounded-3 mb-3"
                  role="alert"
                >
                  {errorMessage}
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-3">
                  <label
                    htmlFor="email"
                    className="form-label text-navy fw-medium small mb-1"
                  >
                    College Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="form-control"
                    placeholder="student@college.edu or admin@eventease.edu"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label
                      htmlFor="password"
                      className="form-label text-navy fw-medium small mb-0"
                    >
                      Password
                    </label>
                    <span className="text-muted small">Min 8 characters</span>
                  </div>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    className="form-control"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="current-password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2-5 fw-semibold ee-btn-primary mb-3"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="d-flex align-items-center justify-content-center gap-2">
                      <span
                        className="spinner-border spinner-border-sm"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      <span>Signing In...</span>
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              {/* Registration Link */}
              <div className="text-center pt-2 border-top">
                <p className="text-charcoal small mb-0">
                  Don't have a student account?{' '}
                  <Link
                    to="/register"
                    className="text-primary fw-semibold text-decoration-none"
                  >
                    Register here
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

