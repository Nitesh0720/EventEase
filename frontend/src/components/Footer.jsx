import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = 2026;

  return (
    <footer className="ee-footer bg-navy text-light pt-5 pb-4 mt-auto">
      <div className="container">
        <div className="row gy-4 gx-lg-5">
          {/* Brand Info */}
          <div className="col-12 col-md-5">
            <div className="d-flex align-items-center gap-2 mb-3">
              <span className="ee-brand-mark d-inline-flex align-items-center justify-content-center bg-primary text-white">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </span>
              <span className="h5 mb-0 text-white fw-bold tracking-tight">
                EventEase
              </span>
            </div>
            <p className="text-muted-light small mb-3 leading-relaxed">
              EventEase is the official College Event Management System equipped
              with QR-based automated attendance. Built for students to discover
              collegiate activities and for faculty administrators to orchestrate
              campus events seamlessly.
            </p>
            <div className="d-flex align-items-center gap-2 text-muted-light small">
              <span className="badge bg-secondary-subtle text-secondary px-2 py-1">
                Module 1 Active
              </span>
              <span>Platform Foundation v1.0</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="col-6 col-md-3">
            <h6 className="text-white fw-semibold mb-3 small text-uppercase tracking-wider">
              Navigation
            </h6>
            <ul className="list-unstyled small mb-0 d-flex flex-column gap-2">
              <li>
                <Link to="/" className="ee-footer-link">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/events" className="ee-footer-link">
                  Explore Events
                </Link>
              </li>
              <li>
                <a href="/#how-it-works" className="ee-footer-link">
                  How It Works
                </a>
              </li>
              <li>
                <a href="/#featured-events" className="ee-footer-link">
                  Featured Activities
                </a>
              </li>
            </ul>
          </div>

          {/* Platform Pillars */}
          <div className="col-6 col-md-4">
            <h6 className="text-white fw-semibold mb-3 small text-uppercase tracking-wider">
              Core Capabilities
            </h6>
            <ul className="list-unstyled small mb-0 d-flex flex-column gap-2 text-muted-light">
              <li>Centralized Campus Event Catalog</li>
              <li>Single-Click Student Registration</li>
              <li>Dynamic QR-Based Check-In Passes</li>
              <li>Real-Time Attendance Audit Trails</li>
              <li>Automated Activity Certification</li>
            </ul>
          </div>
        </div>

        <hr className="my-4 border-secondary opacity-25" />

        {/* Bottom bar */}
        <div className="d-flex flex-column flex-md-row align-items-center justify-content-between gap-2 small text-muted-light">
          <div>
            &copy; {currentYear} EventEase College Event Management System. All
            rights reserved.
          </div>
          <div className="d-flex align-items-center gap-3">
            <span>Student Life & Event Administration Cell</span>
            <span className="opacity-50">|</span>
            <span>Academic Portal</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

