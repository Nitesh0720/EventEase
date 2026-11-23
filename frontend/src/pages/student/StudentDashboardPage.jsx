import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyRegistrations, cancelRegistration, fetchDigitalPass } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import DigitalPassModal from '../../components/student/DigitalPassModal';

const StudentDashboardPage = () => {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');

  // Cancellation modal state
  const [selectedReg, setSelectedReg] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Module 6: Digital Pass modal state
  const [showPassModal, setShowPassModal] = useState(false);
  const [passData, setPassData] = useState(null);
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState('');

  const handleOpenPassModal = async (registrationId) => {
    setShowPassModal(true);
    setPassLoading(true);
    setPassError('');
    setPassData(null);
    try {
      const res = await fetchDigitalPass(registrationId);
      if (res.success && res.data) {
        setPassData(res.data);
      } else {
        setPassError('Failed to load digital pass.');
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

  const fetchRegistrations = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getMyRegistrations();
      if (res.success) {
        setRegistrations(res.data || []);
      } else {
        setError('Failed to load registered events.');
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Unable to retrieve your registrations. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  // Categorize registrations based on status and event date/time
  const now = new Date();

  const isEventUpcoming = (event) => {
    if (!event || !event.date) return false;
    const [sh, sm] = (event.startTime || '00:00').split(':').map(Number);
    const eventDateTime = new Date(event.date);
    eventDateTime.setHours(sh || 0, sm || 0, 0, 0);
    return eventDateTime > now;
  };

  const upcomingRegistrations = registrations.filter(
    (r) => r.status === 'Confirmed' && isEventUpcoming(r.event)
  );

  const pastRegistrations = registrations.filter(
    (r) => r.status === 'Confirmed' && !isEventUpcoming(r.event)
  );

  const cancelledRegistrations = registrations.filter((r) => r.status === 'Cancelled');

  const handleOpenCancelModal = (reg) => {
    setSelectedReg(reg);
    setCancelReason('');
  };

  const handleCloseCancelModal = () => {
    setSelectedReg(null);
    setCancelReason('');
  };

  const handleConfirmCancel = async () => {
    if (!selectedReg) return;
    setCancelling(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await cancelRegistration(selectedReg._id, cancelReason);
      if (res.success) {
        setSuccessMessage(
          `Registration for "${selectedReg.event?.title || 'event'}" has been cancelled. Your reserved seat has been released.`
        );
        handleCloseCancelModal();
        await fetchRegistrations();
      } else {
        setError(res.message || 'Failed to cancel registration.');
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Error processing cancellation. Please try again.'
      );
    } finally {
      setCancelling(false);
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    }
  };

  const formatEventDate = (dateStr) => {
    if (!dateStr) return 'TBA';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderRegistrationCard = (reg) => {
    const event = reg.event || {};
    const isUpcoming = isEventUpcoming(event);
    const canCancel = reg.status === 'Confirmed' && isUpcoming;

    return (
      <div key={reg._id} className="card border rounded-4 bg-white shadow-xs p-4 mb-3">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-primary-subtle text-primary fw-semibold px-3 py-1-5">
              {event.category || 'General'}
            </span>
            <span
              className={`badge ${
                reg.status === 'Confirmed'
                  ? 'bg-success-subtle text-success border border-success-subtle'
                  : 'bg-secondary-subtle text-secondary border'
              } px-3 py-1-5 fw-medium`}
            >
              {reg.status}
            </span>
          </div>

          <div className="d-flex align-items-center gap-2">
            <span className="text-muted small">Code:</span>
            <span className="badge bg-dark text-white font-monospace px-2-5 py-1-5">
              {reg.registrationCode}
            </span>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-12 col-md-8">
            <h4 className="h5 fw-bold text-navy mb-2">
              {event.title || 'Event Record Unavailable'}
            </h4>
            <div className="d-flex flex-wrap align-items-center gap-3 text-charcoal small mb-3">
              <div>
                <span className="text-muted">Date: </span>
                <span className="fw-medium text-navy">{formatEventDate(event.date)}</span>
              </div>
              <div>
                <span className="text-muted">Time: </span>
                <span className="fw-medium text-navy">
                  {event.startTime && event.endTime
                    ? `${event.startTime} - ${event.endTime}`
                    : 'Schedule to be confirmed'}
                </span>
              </div>
              <div>
                <span className="text-muted">Venue: </span>
                <span className="fw-medium text-navy">{event.venue || 'Campus Venue'}</span>
              </div>
            </div>

            <div className="text-muted small">
              <span>Registered on: {new Date(reg.registeredAt).toLocaleString()}</span>
              {reg.cancelledAt && (
                <span className="d-block text-danger mt-1">
                  Cancelled on: {new Date(reg.cancelledAt).toLocaleString()}
                  {reg.cancellationReason && ` (Reason: ${reg.cancellationReason})`}
                </span>
              )}
            </div>
          </div>

          <div className="col-12 col-md-4 d-flex flex-column justify-content-between align-items-md-end gap-2">
            <div className="d-flex flex-column gap-2 w-100 w-md-auto">
              {reg.status === 'Confirmed' && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm px-3 fw-semibold ee-btn-primary"
                  onClick={() => handleOpenPassModal(reg._id)}
                >
                  View Digital Pass
                </button>
              )}

              {event._id && (
                <Link
                  to={`/events/${event._id}`}
                  className="btn btn-outline-primary btn-sm px-3 fw-medium"
                >
                  View Event Details
                </Link>
              )}
            </div>

            {canCancel && (
              <button
                type="button"
                className="btn btn-outline-danger btn-sm px-3 fw-medium w-100 w-md-auto"
                onClick={() => handleOpenCancelModal(reg)}
              >
                Cancel Registration
              </button>
            )}

            {reg.status === 'Cancelled' && (
              <span className="badge bg-secondary-subtle text-secondary border px-2 py-1 small">
                Pass Voided
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getActiveList = () => {
    switch (activeTab) {
      case 'upcoming':
        return upcomingRegistrations;
      case 'past':
        return pastRegistrations;
      case 'cancelled':
        return cancelledRegistrations;
      default:
        return upcomingRegistrations;
    }
  };

  const activeList = getActiveList();

  return (
    <div className="ee-student-dashboard py-5 bg-light min-vh-100">
      <div className="container">
        {/* Header Section */}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
          <div>
            <div className="badge bg-primary-subtle text-primary px-3 py-1-5 fw-semibold mb-2">
              Student Portal
            </div>
            <h1 className="h2 fw-bold text-navy mb-1">My Registered Events</h1>
            <p className="text-charcoal small mb-0">
              Welcome back, <strong>{user?.name}</strong>. Manage your campus event enrollments and view registration codes.
            </p>
          </div>

          <Link to="/events" className="btn btn-primary px-4 fw-medium ee-btn-primary">
            Browse More Events
          </Link>
        </div>

        {/* Global Feedback Banners */}
        {error && (
          <div className="alert alert-danger rounded-3 shadow-xs mb-4" role="alert">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="alert alert-success rounded-3 shadow-xs mb-4" role="alert">
            {successMessage}
          </div>
        )}

        {/* Metric Summary Cards */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="card border rounded-4 bg-white shadow-xs p-3 text-center">
              <span className="text-muted small fw-medium d-block mb-1">Total Enrolled</span>
              <span className="h3 fw-bold text-navy mb-0">{registrations.length}</span>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border rounded-4 bg-white shadow-xs p-3 text-center">
              <span className="text-muted small fw-medium d-block mb-1">Upcoming</span>
              <span className="h3 fw-bold text-primary mb-0">{upcomingRegistrations.length}</span>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border rounded-4 bg-white shadow-xs p-3 text-center">
              <span className="text-muted small fw-medium d-block mb-1">Completed</span>
              <span className="h3 fw-bold text-success mb-0">{pastRegistrations.length}</span>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border rounded-4 bg-white shadow-xs p-3 text-center">
              <span className="text-muted small fw-medium d-block mb-1">Cancelled</span>
              <span className="h3 fw-bold text-secondary mb-0">{cancelledRegistrations.length}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="card border rounded-4 bg-white shadow-xs p-2 mb-4">
          <ul className="nav nav-pills nav-fill gap-2">
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link fw-semibold rounded-3 py-2 ${
                  activeTab === 'upcoming' ? 'active bg-primary text-white' : 'text-navy'
                }`}
                onClick={() => setActiveTab('upcoming')}
              >
                Upcoming Events ({upcomingRegistrations.length})
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link fw-semibold rounded-3 py-2 ${
                  activeTab === 'past' ? 'active bg-primary text-white' : 'text-navy'
                }`}
                onClick={() => setActiveTab('past')}
              >
                Past Events ({pastRegistrations.length})
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link fw-semibold rounded-3 py-2 ${
                  activeTab === 'cancelled' ? 'active bg-primary text-white' : 'text-navy'
                }`}
                onClick={() => setActiveTab('cancelled')}
              >
                Cancelled ({cancelledRegistrations.length})
              </button>
            </li>
          </ul>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="py-5 text-center">
            <LoadingSpinner message="Loading your event registrations..." />
          </div>
        ) : activeList.length === 0 ? (
          <div className="card border rounded-4 bg-white shadow-xs p-5 text-center my-4">
            <h3 className="h5 fw-bold text-navy mb-2">
              {activeTab === 'upcoming'
                ? 'No Upcoming Event Registrations'
                : activeTab === 'past'
                ? 'No Past Events Found'
                : 'No Cancelled Registrations'}
            </h3>
            <p className="text-charcoal small max-w-500 mx-auto mb-4">
              {activeTab === 'upcoming'
                ? 'You do not have any active upcoming registrations at this time. Explore the campus event catalog to find workshops, seminars, and hackathons.'
                : activeTab === 'past'
                ? 'You have not attended any completed events yet.'
                : 'You have not cancelled any registrations.'}
            </p>
            {activeTab === 'upcoming' && (
              <div>
                <Link to="/events" className="btn btn-primary px-4 fw-medium ee-btn-primary">
                  Browse Available Events
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="registration-list">
            {activeList.map((reg) => renderRegistrationCard(reg))}
          </div>
        )}

        {/* Cancellation Confirmation Modal */}
        {selectedReg && (
          <div
            className="modal show d-block"
            tabIndex="-1"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 rounded-4 shadow-lg p-2">
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold text-navy">Confirm Registration Cancellation</h5>
                  <button
                    type="button"
                    className="btn-close shadow-none"
                    aria-label="Close"
                    disabled={cancelling}
                    onClick={handleCloseCancelModal}
                  ></button>
                </div>
                <div className="modal-body py-3">
                  <p className="text-charcoal small mb-3">
                    Are you sure you want to cancel your registration for{' '}
                    <strong>{selectedReg.event?.title}</strong>? Your reserved seat will be immediately returned to the available seat pool.
                  </p>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-navy">
                      Cancellation Reason (Optional)
                    </label>
                    <textarea
                      className="form-control rounded-3"
                      rows="2"
                      placeholder="e.g. Schedule conflict, academic exam"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      disabled={cancelling}
                      maxLength={200}
                    ></textarea>
                  </div>

                  <div className="alert alert-warning py-2 px-3 small rounded-3 mb-0">
                    <strong>Note:</strong> You may re-register later if seats remain available before the registration deadline.
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button
                    type="button"
                    className="btn btn-light border px-3 fw-medium"
                    onClick={handleCloseCancelModal}
                    disabled={cancelling}
                  >
                    Keep Registration
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger px-3 fw-semibold"
                    onClick={handleConfirmCancel}
                    disabled={cancelling}
                  >
                    {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
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

export default StudentDashboardPage;

