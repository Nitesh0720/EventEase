import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  fetchEventById,
  registerForEvent,
  checkEventRegistration,
  cancelRegistration,
  fetchDigitalPass
} from '../services/api';
import { sampleEvents } from '../data/sampleEvents';
import LoadingSpinner from '../components/LoadingSpinner';
import DigitalPassModal from '../components/student/DigitalPassModal';

const EventDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin } = useAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSampleEvent, setIsSampleEvent] = useState(false);
  const [shareFeedback, setShareFeedback] = useState({ type: '', message: '' });

  // Module 5: Registration state
  const [registrationState, setRegistrationState] = useState({
    isRegistered: false,
    registration: null
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Module 6: Digital Pass modal state
  const [showPassModal, setShowPassModal] = useState(false);
  const [passData, setPassData] = useState(null);
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState('');

  const handleOpenPassModal = async () => {
    if (!registrationState.registration?._id) return;
    setShowPassModal(true);
    setPassLoading(true);
    setPassError('');
    setPassData(null);
    try {
      const res = await fetchDigitalPass(registrationState.registration._id);
      if (res.success && res.data) {
        setPassData(res.data);
      } else {
        setPassError('Failed to load pass details.');
      }
    } catch (err) {
      setPassError(
        err.response?.data?.message || 'Unable to retrieve verified digital pass.'
      );
    } finally {
      setPassLoading(false);
    }
  };

  const handleClosePassModal = () => {
    setShowPassModal(false);
    setPassData(null);
    setPassError('');
  };

  const loadEventAndRegistration = async () => {
    setLoading(true);
    setError('');
    setActionError('');
    setActionSuccess('');
    setShareFeedback({ type: '', message: '' });

    // Check if ID matches a sample event directly
    const matchingSample = sampleEvents.find((s) => s.id === id);
    if (matchingSample) {
      setEvent(matchingSample);
      setIsSampleEvent(true);
      setLoading(false);
      return;
    }

    // Otherwise attempt to fetch from backend API
    try {
      const res = await fetchEventById(id);
      if (res.success && res.event) {
        setEvent(res.event);
        setIsSampleEvent(false);

        // Check registration status if user is an authenticated student
        if (isAuthenticated && user?.role === 'Student') {
          try {
            const regRes = await checkEventRegistration(id);
            if (regRes.success && regRes.data) {
              setRegistrationState({
                isRegistered: regRes.data.isRegistered,
                registration: regRes.data.registration
              });
            }
          } catch (checkErr) {
            console.error('Error verifying registration:', checkErr);
          }
        }
      } else {
        setError('Event not found or is no longer accessible.');
      }
    } catch (err) {
      // Fallback: check if id matches sample event
      const sampleFallback = sampleEvents.find((s) => s.id === id);
      if (sampleFallback) {
        setEvent(sampleFallback);
        setIsSampleEvent(true);
      } else {
        const errMsg =
          err.response?.data?.message ||
          'The requested event could not be found or is not currently published.';
        setError(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEventAndRegistration();
  }, [id, isAuthenticated, user]);

  // Share Event handler
  const handleShareEvent = async () => {
    try {
      if (navigator.clipboard && window.location.href) {
        await navigator.clipboard.writeText(window.location.href);
        setShareFeedback({
          type: 'success',
          message: 'Event link copied to clipboard successfully.'
        });
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch (err) {
      setShareFeedback({
        type: 'danger',
        message: 'Unable to copy link automatically. Please copy the URL from your address bar.'
      });
    }

    setTimeout(() => {
      setShareFeedback({ type: '', message: '' });
    }, 4000);
  };

  // Handle student event registration
  const handleRegister = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setActionLoading(true);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await registerForEvent(id);
      if (res.success) {
        setActionSuccess(
          `Registration confirmed! Your registration code is ${res.data?.registration?.registrationCode}.`
        );
        setRegistrationState({
          isRegistered: true,
          registration: res.data?.registration
        });
        // Update local event registered count
        setEvent((prev) => ({
          ...prev,
          registeredCount: (prev.registeredCount || 0) + 1
        }));
      } else {
        setActionError(res.message || 'Registration failed.');
      }
    } catch (err) {
      setActionError(
        err.response?.data?.message || 'Unable to complete registration. Please try again.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Handle student registration cancellation
  const handleConfirmCancel = async () => {
    if (!registrationState.registration?._id) return;

    setActionLoading(true);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await cancelRegistration(
        registrationState.registration._id,
        cancelReason
      );
      if (res.success) {
        setActionSuccess('Registration cancelled successfully. Your seat has been released.');
        setShowCancelModal(false);
        setCancelReason('');
        setRegistrationState({
          isRegistered: false,
          registration: res.data?.registration
        });
        // Decrement local event registered count
        setEvent((prev) => ({
          ...prev,
          registeredCount: Math.max(0, (prev.registeredCount || 0) - 1)
        }));
      } else {
        setActionError(res.message || 'Failed to cancel registration.');
      }
    } catch (err) {
      setActionError(
        err.response?.data?.message || 'Error processing cancellation. Please try again.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-5 bg-light min-vh-75 d-flex align-items-center justify-content-center">
        <LoadingSpinner message="Loading event details..." />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="container py-5 min-vh-75 d-flex align-items-center justify-content-center">
        <div className="card border rounded-4 p-5 bg-white shadow-xs text-center max-w-500 mx-auto">
          <div className="badge bg-danger-subtle text-danger px-3 py-1-5 fw-semibold mb-3">
            Event Unavailable
          </div>
          <h2 className="h4 fw-bold text-navy mb-2">Event Not Found</h2>
          <p className="text-charcoal small mb-4">
            {error || 'The event you are looking for does not exist or has been cancelled.'}
          </p>
          <div className="d-flex justify-content-center gap-2">
            <button
              type="button"
              className="btn btn-primary px-4 fw-medium ee-btn-primary"
              onClick={() => navigate('/events')}
            >
              Back to Events Catalog
            </button>
            <Link to="/" className="btn btn-outline-secondary px-4 fw-medium">
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate registration status using actual registrationDeadline date and time
  const now = new Date();
  let deadlineDate = null;
  let isRegistrationOpen = false;
  let formattedDeadline = 'Not specified';

  if (event.registrationDeadline) {
    deadlineDate = new Date(event.registrationDeadline);
    if (!isNaN(deadlineDate.getTime())) {
      isRegistrationOpen = deadlineDate > now;
      formattedDeadline = deadlineDate.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  } else if (isSampleEvent) {
    isRegistrationOpen = true;
    formattedDeadline = '24 hours prior to event';
  }

  // Check if event start date/time has passed
  let isEventStarted = false;
  if (event.date) {
    const [sh, sm] = (event.startTime || '00:00').split(':').map(Number);
    const startDateTime = new Date(event.date);
    startDateTime.setHours(sh || 0, sm || 0, 0, 0);
    isEventStarted = startDateTime <= now;
  }

  // Format event date
  const formattedEventDate = event.date
    ? new Date(event.date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : 'Date to be announced';

  const organizerName = event.organizer || event.department || 'Campus Department';
  const capacity = event.seatLimit || event.totalSpots || 100;
  const registeredSeats = event.registeredCount || 0;
  const remainingSeats = Math.max(0, capacity - registeredSeats);
  const isFullyBooked = remainingSeats === 0;

  const eventTime =
    event.startTime && event.endTime
      ? `${event.startTime} - ${event.endTime}`
      : event.time || 'Schedule to be confirmed';

  return (
    <div className="ee-event-details py-5 bg-light min-vh-100">
      <div className="container">
        {/* Breadcrumb Navigation */}
        <nav aria-label="breadcrumb" className="mb-4">
          <ol className="breadcrumb small mb-0">
            <li className="breadcrumb-item">
              <Link to="/" className="text-decoration-none text-muted">
                Home
              </Link>
            </li>
            <li className="breadcrumb-item">
              <Link to="/events" className="text-decoration-none text-muted">
                Events
              </Link>
            </li>
            <li
              className="breadcrumb-item active text-navy fw-medium text-truncate"
              style={{ maxWidth: '300px' }}
              aria-current="page"
            >
              {event.title}
            </li>
          </ol>
        </nav>

        {/* Share Feedback Banner */}
        {shareFeedback.message && (
          <div
            className={`alert alert-${shareFeedback.type} alert-dismissible fade show rounded-3 shadow-xs mb-4`}
            role="alert"
          >
            <span>{shareFeedback.message}</span>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={() => setShareFeedback({ type: '', message: '' })}
            ></button>
          </div>
        )}

        {/* Action Error Banner */}
        {actionError && (
          <div className="alert alert-danger alert-dismissible fade show rounded-3 shadow-xs mb-4" role="alert">
            <span>{actionError}</span>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={() => setActionError('')}
            ></button>
          </div>
        )}

        {/* Action Success Banner */}
        {actionSuccess && (
          <div className="alert alert-success alert-dismissible fade show rounded-3 shadow-xs mb-4" role="alert">
            <span>{actionSuccess}</span>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={() => setActionSuccess('')}
            ></button>
          </div>
        )}

        {/* Demo Data Banner */}
        {isSampleEvent && (
          <div className="alert alert-secondary border shadow-xs rounded-3 mb-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-secondary text-white">Demo Showcase Record</span>
              <span className="small text-charcoal">
                This is a sample event presented for platform preview. Live events are stored in and fetched from the campus database.
              </span>
            </div>
            <span className="badge bg-white text-navy border small">Sample Data</span>
          </div>
        )}

        <div className="row g-4">
          {/* Main Content Column */}
          <div className="col-12 col-lg-8">
            <div className="card border rounded-4 bg-white shadow-xs p-4 p-md-5 mb-4">
              {/* Header Badges */}
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-primary-subtle text-primary fw-semibold px-3 py-1-5">
                    {event.category}
                  </span>
                  {isSampleEvent ? (
                    <span className="badge bg-secondary-subtle text-secondary border px-2-5 py-1-5 small">
                      Demo Showcase
                    </span>
                  ) : (
                    <span className="badge bg-success-subtle text-success border border-success-subtle px-2-5 py-1-5 small">
                      Official Campus Event
                    </span>
                  )}
                </div>

                {/* Registration Status Pill */}
                <div className="d-flex align-items-center gap-2">
                  {isFullyBooked && !registrationState.isRegistered && (
                    <span className="badge bg-danger text-white px-3 py-1-5 fw-medium">
                      Fully Booked
                    </span>
                  )}
                  <span
                    className={`badge ${
                      isRegistrationOpen
                        ? 'bg-success-subtle text-success border border-success-subtle'
                        : 'bg-danger-subtle text-danger border border-danger-subtle'
                    } px-3 py-1-5 fw-medium`}
                  >
                    {isRegistrationOpen ? 'Registration Open' : 'Registration Closed'}
                  </span>
                </div>
              </div>

              {/* Event Title */}
              <h1 className="h2 fw-bold text-navy mb-2">{event.title}</h1>

              {/* Organizer */}
              <div className="d-flex align-items-center gap-2 text-muted small mb-4 pb-3 border-bottom">
                <span className="fw-medium text-navy">Organized by:</span>
                <span>{organizerName}</span>
              </div>

              {/* Registered Student Status Card if enrolled */}
              {registrationState.isRegistered && (
                <div className="alert alert-success border-success-subtle rounded-3 p-3 mb-4">
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                    <div>
                      <strong className="d-block text-navy">
                        You Are Registered for This Event
                      </strong>
                      <span className="small text-charcoal">
                        Registration Code:{' '}
                        <span className="font-monospace fw-bold text-dark bg-white px-2 py-0-5 rounded border">
                          {registrationState.registration?.registrationCode}
                        </span>
                      </span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-primary px-3 fw-semibold ee-btn-primary"
                        onClick={handleOpenPassModal}
                      >
                        View Digital Pass
                      </button>
                      <Link
                        to="/my-registrations"
                        className="btn btn-sm btn-outline-success px-3 fw-medium"
                      >
                        My Registrations
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="mb-4">
                <h5 className="fw-bold text-navy mb-3">About This Event</h5>
                <p className="text-charcoal leading-relaxed mb-0" style={{ whiteSpace: 'pre-line' }}>
                  {event.description || event.shortDescription}
                </p>
              </div>

              {/* Registration Deadline Alert Banner */}
              <div
                className={`alert ${
                  isRegistrationOpen ? 'alert-info' : 'alert-warning'
                } rounded-3 p-3 mb-4`}
              >
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div>
                    <strong className="d-block text-navy small">
                      Registration Deadline
                    </strong>
                    <span className="small text-charcoal">{formattedDeadline}</span>
                  </div>
                  <span
                    className={`badge ${
                      isRegistrationOpen ? 'bg-primary' : 'bg-secondary'
                    } text-white px-2-5 py-1 small`}
                  >
                    {isRegistrationOpen ? 'Open for Enrollment' : 'Closed'}
                  </span>
                </div>
              </div>

              {/* Capacity Progress Bar */}
              <div className="p-3 rounded-3 bg-light border mb-4">
                <div className="d-flex justify-content-between align-items-center small mb-2">
                  <span className="fw-semibold text-navy">Seat Availability</span>
                  <span className="text-charcoal">
                    <strong>{remainingSeats}</strong> seats remaining of {capacity}
                  </span>
                </div>
                <div className="progress" style={{ height: '8px' }}>
                  <div
                    className={`progress-bar ${
                      isFullyBooked ? 'bg-danger' : remainingSeats < 10 ? 'bg-warning' : 'bg-primary'
                    }`}
                    role="progressbar"
                    style={{
                      width: `${Math.min(100, Math.round((registeredSeats / capacity) * 100))}%`
                    }}
                    aria-valuenow={registeredSeats}
                    aria-valuemin="0"
                    aria-valuemax={capacity}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Details Sidebar Column */}
          <div className="col-12 col-lg-4">
            <div className="card border rounded-4 bg-white shadow-xs p-4 mb-4">
              <h5 className="fw-bold text-navy mb-3 pb-2 border-bottom">
                Key Event Details
              </h5>

              <ul className="list-unstyled mb-4 d-flex flex-column gap-3 text-charcoal small">
                {/* Date */}
                <li className="d-flex align-items-start gap-3">
                  <div className="ee-brand-mark bg-light border text-primary flex-shrink-0 mt-0-5">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-muted d-block small">Date</span>
                    <span className="fw-semibold text-navy">{formattedEventDate}</span>
                  </div>
                </li>

                {/* Time */}
                <li className="d-flex align-items-start gap-3">
                  <div className="ee-brand-mark bg-light border text-primary flex-shrink-0 mt-0-5">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-muted d-block small">Time</span>
                    <span className="fw-semibold text-navy">{eventTime}</span>
                  </div>
                </li>

                {/* Venue */}
                <li className="d-flex align-items-start gap-3">
                  <div className="ee-brand-mark bg-light border text-primary flex-shrink-0 mt-0-5">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-muted d-block small">Venue</span>
                    <span className="fw-semibold text-navy">{event.venue}</span>
                  </div>
                </li>

                {/* Capacity */}
                <li className="d-flex align-items-start gap-3">
                  <div className="ee-brand-mark bg-light border text-primary flex-shrink-0 mt-0-5">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-muted d-block small">Capacity</span>
                    <span className="fw-semibold text-navy">
                      {capacity} seats ({remainingSeats} available)
                    </span>
                  </div>
                </li>
              </ul>

              {/* Action Buttons */}
              <div className="d-flex flex-column gap-2">
                {/* Module 5: Context-Driven Registration Actions */}
                {isSampleEvent ? (
                  <button
                    type="button"
                    className="btn btn-secondary w-100 fw-semibold disabled"
                    disabled
                  >
                    Demo Showcase Record
                  </button>
                ) : !isAuthenticated ? (
                  <button
                    type="button"
                    className="btn btn-primary w-100 fw-semibold ee-btn-primary"
                    onClick={() => navigate('/login')}
                  >
                    Login to Register
                  </button>
                ) : isAdmin ? (
                  <div className="p-2 bg-light border rounded text-center small text-muted">
                    Signed in as Administrator. Event registration is reserved for student accounts.
                  </div>
                ) : registrationState.isRegistered ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-primary w-100 fw-semibold ee-btn-primary"
                      onClick={handleOpenPassModal}
                    >
                      View Digital Pass
                    </button>
                    {!isEventStarted && (
                      <button
                        type="button"
                        className="btn btn-outline-danger w-100 fw-medium"
                        onClick={() => setShowCancelModal(true)}
                        disabled={actionLoading}
                      >
                        Cancel Registration
                      </button>
                    )}
                  </>
                ) : isFullyBooked ? (
                  <button
                    type="button"
                    className="btn btn-secondary w-100 fw-semibold disabled"
                    disabled
                  >
                    Event Fully Booked
                  </button>
                ) : !isRegistrationOpen ? (
                  <button
                    type="button"
                    className="btn btn-secondary w-100 fw-semibold disabled"
                    disabled
                  >
                    Registration Closed
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary w-100 fw-semibold ee-btn-primary"
                    onClick={handleRegister}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Processing Registration...' : 'Register for Event'}
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-outline-primary w-100 fw-semibold"
                  onClick={handleShareEvent}
                >
                  Share Event
                </button>
                <button
                  type="button"
                  className="btn btn-light border w-100 fw-medium text-navy"
                  onClick={() => navigate('/events')}
                >
                  Back to Events Catalog
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Cancellation Confirmation Modal */}
        {showCancelModal && (
          <div
            className="modal show d-block"
            tabIndex="-1"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 rounded-4 shadow-lg p-2">
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold text-navy">Confirm Cancellation</h5>
                  <button
                    type="button"
                    className="btn-close shadow-none"
                    aria-label="Close"
                    disabled={actionLoading}
                    onClick={() => setShowCancelModal(false)}
                  ></button>
                </div>
                <div className="modal-body py-3">
                  <p className="text-charcoal small mb-3">
                    Are you sure you want to cancel your registration for <strong>{event.title}</strong>? Your seat will be returned to the registration pool immediately.
                  </p>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-navy">
                      Cancellation Reason (Optional)
                    </label>
                    <textarea
                      className="form-control rounded-3"
                      rows="2"
                      placeholder="e.g. Schedule conflict"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      disabled={actionLoading}
                      maxLength={200}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button
                    type="button"
                    className="btn btn-light border px-3 fw-medium"
                    onClick={() => setShowCancelModal(false)}
                    disabled={actionLoading}
                  >
                    Keep Registration
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger px-3 fw-semibold"
                    onClick={handleConfirmCancel}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Module 6: QR Digital Pass Modal */}
        <DigitalPassModal
          show={showPassModal}
          onClose={handleClosePassModal}
          passData={passData}
          loading={passLoading}
          error={passError}
        />
      </div>
    </div>
  );
};

export default EventDetailsPage;
