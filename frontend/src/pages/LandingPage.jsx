import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  sampleEvents,
  platformStats,
  howItWorksSteps
} from '../data/sampleEvents';

const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Filter sample events for the featured section
  const categories = ['All', 'Technical', 'Competition', 'Cultural', 'Seminar', 'Workshop'];
  const filteredEvents =
    selectedCategory === 'All'
      ? sampleEvents
      : sampleEvents.filter((evt) => evt.category === selectedCategory);

  return (
    <div className="ee-landing-page">
      {/* 1. HERO SECTION */}
      <section className="ee-hero-section py-5 py-lg-6 border-bottom">
        <div className="container py-lg-4">
          <div className="row align-items-center gy-5">
            <div className="col-12 col-lg-7">
              {/* Institution / Platform Badge */}
              <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-light border text-navy mb-3 small fw-medium">
                <span className="ee-status-dot bg-primary"></span>
                <span>EventEase Official Collegiate Platform</span>
              </div>

              {/* Required Main Heading */}
              <h1 className="display-4 fw-bold text-navy tracking-tight mb-3">
                Discover. Register. Participate.
              </h1>

              {/* Platform Description */}
              <p className="lead text-charcoal mb-4 pe-lg-4">
                EventEase is the college event management system designed for
                modern campus life. Explore academic symposiums, technical
                hackathons, and cultural fests. Register in seconds, receive
                digital QR attendance passes, and verify your participation.
              </p>

              {/* Action Buttons */}
              <div className="d-flex flex-wrap align-items-center gap-3 pt-1">
                <button
                  type="button"
                  className="btn btn-primary btn-lg px-4 py-2-5 fw-semibold ee-btn-primary"
                  onClick={() => navigate('/events')}
                >
                  Explore Events
                </button>
                {isAuthenticated ? (
                  <button
                    type="button"
                    className="btn btn-outline-dark btn-lg px-4 py-2-5 fw-medium ee-btn-outline"
                    onClick={() => navigate('/events')}
                  >
                    View All Activities
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-outline-dark btn-lg px-4 py-2-5 fw-medium ee-btn-outline"
                    onClick={() => navigate('/login')}
                  >
                    Login
                  </button>
                )}
              </div>

              {/* Key Platform Highlights */}
              <div className="pt-4 mt-3 d-flex flex-wrap gap-4 text-charcoal small">
                <div className="d-flex align-items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#1d4ed8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Verified QR Passes</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#1d4ed8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Institutional Single Sign-On</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#1d4ed8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Attendance Records</span>
                </div>
              </div>
            </div>

            {/* Hero Right Visual Preview Card */}
            <div className="col-12 col-lg-5">
              <div className="ee-hero-card p-4 rounded-4 bg-white border shadow-sm">
                <div className="d-flex align-items-center justify-content-between mb-3 pb-3 border-bottom">
                  <div>
                    <span className="badge bg-primary-subtle text-primary fw-semibold px-2-5 py-1">
                      Digital Pass Preview
                    </span>
                    <h6 className="mt-2 mb-0 fw-bold text-navy">
                      TechNova Hackathon 2026
                    </h6>
                  </div>
                  <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 small">
                    Confirmed
                  </span>
                </div>

                <div className="p-3 rounded-3 bg-light border text-center mb-3">
                  <div className="ee-qr-mock mx-auto d-flex flex-column align-items-center justify-content-center p-3 rounded-2 bg-white border">
                    <svg
                      width="120"
                      height="120"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                      <line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" />
                      <line x1="17" y1="7" x2="17.01" y2="7" strokeWidth="3" />
                      <line x1="7" y1="17" x2="7.01" y2="17" strokeWidth="3" />
                      <line x1="17" y1="17" x2="17.01" y2="17" strokeWidth="3" />
                    </svg>
                    <span className="small text-muted mt-2 tracking-wider">
                      PASS-EE-9842-TN
                    </span>
                  </div>
                  <p className="small text-charcoal mb-0 mt-2">
                    Dynamic QR Attendance Pass for Venue Gate Check-in
                  </p>
                </div>

                <div className="d-flex justify-content-between text-charcoal small">
                  <div>
                    <span className="text-muted d-block">Attendee</span>
                    <span className="fw-medium text-navy">College Student</span>
                  </div>
                  <div className="text-end">
                    <span className="text-muted d-block">Status</span>
                    <span className="fw-medium text-navy">Ready for Scan</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. STATS STRIP */}
      <section className="ee-stats-section py-4 bg-white border-bottom">
        <div className="container">
          <div className="row text-center gy-3">
            {platformStats.map((item, idx) => (
              <div key={idx} className="col-6 col-md-3">
                <div className="h2 fw-bold text-navy mb-1">{item.value}</div>
                <div className="text-charcoal small text-uppercase tracking-wider">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS SECTION */}
      <section id="how-it-works" className="ee-section py-5 py-lg-6 bg-light border-bottom">
        <div className="container">
          <div className="text-center max-w-700 mx-auto mb-5">
            <span className="badge bg-primary-subtle text-primary fw-semibold px-3 py-1-5 text-uppercase tracking-wider small">
              Platform Workflow
            </span>
            <h2 className="h1 fw-bold text-navy mt-2 mb-3">
              How EventEase Works
            </h2>
            <p className="text-charcoal mb-0">
              A frictionless four-stage lifecycle connecting student participants
              with departmental event organizers and attendance coordinators.
            </p>
          </div>

          <div className="row g-4">
            {howItWorksSteps.map((stepItem, idx) => (
              <div key={idx} className="col-12 col-md-6 col-lg-3">
                <div className="card h-100 border rounded-4 p-4 ee-step-card bg-white shadow-xs">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <span className="ee-step-number text-primary fw-bold">
                      {stepItem.step}
                    </span>
                    <span className="ee-step-badge text-muted small fw-medium">
                      Stage {idx + 1}
                    </span>
                  </div>
                  <h5 className="fw-bold text-navy mb-2">{stepItem.title}</h5>
                  <p className="text-charcoal small mb-0 leading-relaxed">
                    {stepItem.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. FEATURED EVENTS SECTION */}
      <section id="featured-events" className="ee-section py-5 py-lg-6 bg-white border-bottom">
        <div className="container">
          <div className="d-flex flex-column flex-md-row md-align-items-end justify-content-between gap-3 mb-4">
            <div>
              <span className="badge bg-primary-subtle text-primary fw-semibold px-3 py-1-5 text-uppercase tracking-wider small">
                Campus Highlights
              </span>
              <h2 className="h1 fw-bold text-navy mt-2 mb-1">
                Featured Events
              </h2>
              <p className="text-charcoal mb-0">
                Explore premier competitions, symposiums, and cultural festivals
                scheduled across college departments.
              </p>
            </div>
            <div>
              <button
                type="button"
                className="btn btn-outline-secondary px-3 py-2 small fw-medium text-nowrap"
                onClick={() => navigate('/events')}
              >
                View Full Catalog
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="d-flex flex-wrap gap-2 mb-4 pb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`btn btn-sm rounded-pill px-3 py-1-5 fw-medium ${
                  selectedCategory === cat
                    ? 'btn-primary'
                    : 'btn-outline-secondary'
                }`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Event Cards Grid */}
          <div className="row g-4">
            {filteredEvents.map((event) => {
              const capacityPercentage = Math.round(
                (event.registeredCount / event.totalSpots) * 100
              );

              return (
                <div key={event.id} className="col-12 col-md-6 col-lg-4">
                  <div className="card h-100 border rounded-4 ee-event-card bg-white shadow-xs d-flex flex-column">
                    <div className="card-body p-4 d-flex flex-column">
                      {/* Top Badges */}
                      <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
                        <span className="badge bg-light border text-navy fw-semibold px-2-5 py-1">
                          {event.category}
                        </span>
                        <span
                          className={`badge ${
                            event.status === 'Closing Soon'
                              ? 'bg-danger-subtle text-danger border border-danger-subtle'
                              : 'bg-success-subtle text-success border border-success-subtle'
                          } px-2-5 py-1`}
                        >
                          {event.status}
                        </span>
                      </div>

                      {/* Event Title */}
                      <h5 className="card-title fw-bold text-navy mb-2 leading-snug">
                        {event.title}
                      </h5>

                      {/* Department */}
                      <p className="text-muted small mb-3">
                        {event.department}
                      </p>

                      {/* Description */}
                      <p className="text-charcoal small mb-3 flex-grow-1 leading-relaxed">
                        {event.shortDescription}
                      </p>

                      {/* Event Details: Date & Venue */}
                      <div className="py-2 border-top border-bottom my-2 small text-charcoal d-flex flex-column gap-1-5">
                        <div className="d-flex align-items-center gap-2">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-muted"
                          >
                            <rect
                              x="3"
                              y="4"
                              width="18"
                              height="18"
                              rx="2"
                              ry="2"
                            />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          <span>{event.date}</span>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-muted"
                          >
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          <span className="text-truncate">{event.venue}</span>
                        </div>
                      </div>

                      {/* Capacity / Registration Progress */}
                      <div className="pt-2 mb-3">
                        <div className="d-flex justify-content-between small text-muted mb-1">
                          <span>Capacity</span>
                          <span className="fw-medium text-navy">
                            {event.registeredCount} / {event.totalSpots} spots
                          </span>
                        </div>
                        <div
                          className="progress rounded-pill"
                          style={{ height: '6px' }}
                        >
                          <div
                            className={`progress-bar ${
                              capacityPercentage > 90
                                ? 'bg-danger'
                                : 'bg-primary'
                            }`}
                            role="progressbar"
                            style={{ width: `${capacityPercentage}%` }}
                            aria-valuenow={capacityPercentage}
                            aria-valuemin="0"
                            aria-valuemax="100"
                          ></div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        type="button"
                        className="btn btn-outline-primary w-100 fw-semibold ee-btn-outline-primary"
                        onClick={() => navigate('/events')}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. CALL TO ACTION SECTION */}
      <section className="ee-cta-section py-5 py-lg-6 bg-navy text-white text-center">
        <div className="container py-lg-3 max-w-700 mx-auto">
          <h2 className="display-6 fw-bold text-white mb-3">
            Ready to Experience Campus Events Seamlessly?
          </h2>
          <p className="lead text-muted-light mb-4">
            EventEase simplifies your collegiate journey with direct digital
            registrations, secure QR passes, and verified attendance tracking.
          </p>
          <div className="d-flex flex-wrap justify-content-center gap-3">
            <button
              type="button"
              className="btn btn-light btn-lg px-4 py-2-5 fw-semibold text-navy ee-btn-light"
              onClick={() => navigate('/events')}
            >
              Explore Events Now
            </button>
            {isAuthenticated ? (
              <button
                type="button"
                className="btn btn-outline-light btn-lg px-4 py-2-5 fw-medium"
                onClick={() => navigate('/events')}
              >
                Go to Events Catalog
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-outline-light btn-lg px-4 py-2-5 fw-medium"
                onClick={() => navigate('/login')}
              >
                Sign In to Your Account
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
