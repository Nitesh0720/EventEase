import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const [isNavCollapsed, setIsNavCollapsed] = useState(true);
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  const handleNavCollapse = () => setIsNavCollapsed(!isNavCollapsed);
  const closeNav = () => setIsNavCollapsed(true);

  const handleLogout = () => {
    closeNav();
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom sticky-top ee-navbar">
      <div className="container">
        {/* Brand Logo & Name */}
        <Link
          to="/"
          className="navbar-brand d-flex align-items-center gap-2"
          onClick={closeNav}
        >
          <span className="ee-brand-mark d-inline-flex align-items-center justify-content-center">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </span>
          <span className="ee-brand-text">EventEase</span>
        </Link>

        {/* Mobile Hamburger Toggle */}
        <button
          className="navbar-toggler border-0 shadow-none"
          type="button"
          aria-controls="eventEaseNav"
          aria-expanded={!isNavCollapsed}
          aria-label="Toggle navigation"
          onClick={handleNavCollapse}
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Navigation Links and Action Buttons */}
        <div
          className={`${isNavCollapsed ? 'collapse' : ''} navbar-collapse`}
          id="eventEaseNav"
        >
          <ul className="navbar-nav mx-auto mb-2 mb-lg-0 align-items-lg-center">
            <li className="nav-item">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `nav-link px-3 ee-nav-link ${isActive ? 'active fw-semibold' : ''}`
                }
                onClick={closeNav}
                end
              >
                Home
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink
                to="/events"
                className={({ isActive }) =>
                  `nav-link px-3 ee-nav-link ${isActive ? 'active fw-semibold' : ''}`
                }
                onClick={closeNav}
              >
                Browse Events
              </NavLink>
            </li>
            <li className="nav-item">
              <a
                href="/#how-it-works"
                className="nav-link px-3 ee-nav-link"
                onClick={closeNav}
              >
                How It Works
              </a>
            </li>
            <li className="nav-item">
              <a
                href="/#featured-events"
                className="nav-link px-3 ee-nav-link"
                onClick={closeNav}
              >
                Featured
              </a>
            </li>

            {/* Student Links */}
            {isAuthenticated && user?.role === 'Student' && (
              <>
                <li className="nav-item">
                  <NavLink
                    to="/my-registrations"
                    className={({ isActive }) =>
                      `nav-link px-3 ee-nav-link text-primary fw-semibold ${
                        isActive ? 'active' : ''
                      }`
                    }
                    onClick={closeNav}
                  >
                    My Registrations
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink
                    to="/my-certificates"
                    className={({ isActive }) =>
                      `nav-link px-3 ee-nav-link text-primary fw-semibold ${
                        isActive ? 'active' : ''
                      }`
                    }
                    onClick={closeNav}
                  >
                    My Certificates
                  </NavLink>
                </li>
              </>
            )}

            {/* Admin Management Links */}
            {isAdmin && (
              <>
                <li className="nav-item">
                  <NavLink
                    to="/admin/events"
                    className={({ isActive }) =>
                      `nav-link px-3 ee-nav-link text-primary fw-semibold ${
                        isActive ? 'active' : ''
                      }`
                    }
                    onClick={closeNav}
                  >
                    Manage Events
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink
                    to="/admin/attendance"
                    className={({ isActive }) =>
                      `nav-link px-3 ee-nav-link text-primary fw-semibold ${
                        isActive ? 'active' : ''
                      }`
                    }
                    onClick={closeNav}
                  >
                    Attendance Scanner
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink
                    to="/admin/certificates"
                    className={({ isActive }) =>
                      `nav-link px-3 ee-nav-link text-primary fw-semibold ${
                        isActive ? 'active' : ''
                      }`
                    }
                    onClick={closeNav}
                  >
                    Certificates
                  </NavLink>
                </li>
              </>
            )}
          </ul>

          {/* User Auth Section */}
          <div className="d-flex flex-column flex-lg-row align-items-stretch align-items-lg-center gap-2 pt-2 pt-lg-0">
            {isAuthenticated ? (
              <div className="d-flex align-items-center gap-2">
                {/* User Role & Name Pill */}
                <div className="d-flex align-items-center gap-2 px-3 py-1-5 rounded-pill bg-light border text-navy small">
                  <span
                    className={`badge ${
                      isAdmin
                        ? 'bg-danger text-white'
                        : 'bg-primary text-white'
                    } rounded-pill px-2 py-0-5`}
                  >
                    {user?.role}
                  </span>
                  <span
                    className="fw-semibold text-truncate"
                    style={{ maxWidth: '140px' }}
                  >
                    {user?.name}
                  </span>
                </div>

                {/* Logout Button */}
                <button
                  type="button"
                  className="btn btn-outline-danger px-3 py-1-5 small fw-medium"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-outline-secondary px-3 py-2 fw-medium ee-btn-secondary"
                  onClick={() => {
                    closeNav();
                    navigate('/register');
                  }}
                >
                  Register
                </button>
                <button
                  type="button"
                  className="btn btn-primary px-4 py-2 fw-medium ee-btn-primary"
                  onClick={() => {
                    closeNav();
                    navigate('/login');
                  }}
                >
                  Login
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
