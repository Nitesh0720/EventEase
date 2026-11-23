import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const departmentsList = [
  'Computer Science & Engineering',
  'Information Technology',
  'Electronics & Communication Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical & Electronics Engineering',
  'Management & Business Studies',
  'Applied Sciences & Humanities'
];

const yearsList = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: '',
    year: ''
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

    // Validations
    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.password ||
      !formData.department ||
      !formData.year
    ) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    // Email format validation
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setErrorMessage('Please provide a valid college email address.');
      return;
    }

    // Password length validation
    if (formData.password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    // Password match validation
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      await register({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        department: formData.department,
        year: formData.year
      });
      navigate('/');
    } catch (error) {
      const serverMsg =
        error.response?.data?.message ||
        'Registration failed. Please check your details and try again.';
      setErrorMessage(serverMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ee-auth-page py-5 bg-light min-vh-75 d-flex align-items-center">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-9 col-lg-6">
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
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                </div>
                <h2 className="h4 fw-bold text-navy mb-1">
                  Student Registration
                </h2>
                <p className="text-charcoal small mb-0">
                  Create your student profile to discover and attend campus events
                </p>
              </div>

              {/* Administrative policy notice */}
              <div className="alert alert-info py-2 px-3 small rounded-3 mb-3 d-flex align-items-start gap-2">
                <span className="badge bg-primary text-white mt-0-5">Note</span>
                <span>
                  Public registration creates Student accounts. Administrator
                  accounts are provisioned securely by institutional coordinators.
                </span>
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

              {/* Registration Form */}
              <form onSubmit={handleSubmit} noValidate>
                {/* Full Name */}
                <div className="mb-3">
                  <label
                    htmlFor="name"
                    className="form-label text-navy fw-medium small mb-1"
                  >
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className="form-control"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* College Email */}
                <div className="mb-3">
                  <label
                    htmlFor="email"
                    className="form-label text-navy fw-medium small mb-1"
                  >
                    College Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="form-control"
                    placeholder="student@college.edu"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Department and Academic Year */}
                <div className="row g-3 mb-3">
                  <div className="col-12 col-sm-7">
                    <label
                      htmlFor="department"
                      className="form-label text-navy fw-medium small mb-1"
                    >
                      Department *
                    </label>
                    <select
                      id="department"
                      name="department"
                      className="form-select"
                      value={formData.department}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select Department</option>
                      {departmentsList.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-sm-5">
                    <label
                      htmlFor="year"
                      className="form-label text-navy fw-medium small mb-1"
                    >
                      Academic Year *
                    </label>
                    <select
                      id="year"
                      name="year"
                      className="form-select"
                      value={formData.year}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select Year</option>
                      {yearsList.map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Password */}
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label
                      htmlFor="password"
                      className="form-label text-navy fw-medium small mb-0"
                    >
                      Password *
                    </label>
                    <span className="text-muted small">Min 8 characters</span>
                  </div>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    className="form-control"
                    placeholder="Create a strong password (min 8 chars)"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Confirm Password */}
                <div className="mb-4">
                  <label
                    htmlFor="confirmPassword"
                    className="form-label text-navy fw-medium small mb-1"
                  >
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    className="form-control"
                    placeholder="Repeat your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
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
                      <span>Creating Account...</span>
                    </span>
                  ) : (
                    'Register Student Account'
                  )}
                </button>
              </form>

              {/* Login Link */}
              <div className="text-center pt-2 border-top">
                <p className="text-charcoal small mb-0">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="text-primary fw-semibold text-decoration-none"
                  >
                    Sign in here
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

export default RegisterPage;

