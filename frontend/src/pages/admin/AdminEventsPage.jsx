import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchEvents,
  createEvent,
  updateEvent,
  updateEventStatus,
  deleteEvent
} from '../../services/api';
import EventFormModal from '../../components/admin/EventFormModal';
import LoadingSpinner from '../../components/LoadingSpinner';

const AdminEventsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [alertInfo, setAlertInfo] = useState({ type: '', message: '' });

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const loadAdminEvents = async () => {
    try {
      setLoading(true);
      const res = await fetchEvents();
      if (res.success) {
        setEvents(res.events || []);
      }
    } catch (err) {
      setAlertInfo({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to load events.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminEvents();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (event) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (eventData) => {
    if (editingEvent) {
      await updateEvent(editingEvent._id, eventData);
      setAlertInfo({
        type: 'success',
        message: `Event "${eventData.title}" was updated successfully.`
      });
    } else {
      await createEvent(eventData);
      setAlertInfo({
        type: 'success',
        message: `Event "${eventData.title}" was created successfully.`
      });
    }
    loadAdminEvents();
  };

  const handleTogglePublish = async (event) => {
    const nextStatus = event.status === 'Published' ? 'Draft' : 'Published';
    try {
      await updateEventStatus(event._id, nextStatus);
      setAlertInfo({
        type: 'success',
        message: `Event "${event.title}" status changed to ${nextStatus}.`
      });
      loadAdminEvents();
    } catch (err) {
      setAlertInfo({
        type: 'danger',
        message:
          err.response?.data?.message || 'Failed to update event status.'
      });
    }
  };

  const handleCancelEvent = async (event) => {
    const confirmed = window.confirm(
      `Are you sure you want to cancel "${event.title}"? This will mark the event as Cancelled.`
    );
    if (!confirmed) return;

    try {
      await deleteEvent(event._id);
      setAlertInfo({
        type: 'success',
        message: `Event "${event.title}" has been cancelled.`
      });
      loadAdminEvents();
    } catch (err) {
      setAlertInfo({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to cancel event.'
      });
    }
  };

  // Filter events by status and search
  const filteredEvents = events.filter((evt) => {
    const matchesStatus =
      statusFilter === 'All' || evt.status === statusFilter;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      evt.title?.toLowerCase().includes(query) ||
      evt.organizer?.toLowerCase().includes(query) ||
      evt.venue?.toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  // Metric counts
  const totalCount = events.length;
  const publishedCount = events.filter((e) => e.status === 'Published').length;
  const draftCount = events.filter((e) => e.status === 'Draft').length;
  const cancelledCount = events.filter((e) => e.status === 'Cancelled').length;

  return (
    <div className="ee-admin-events py-5 bg-light min-vh-100">
      <div className="container">
        {/* Top Header */}
        <div className="d-flex flex-column flex-md-row md-align-items-center justify-content-between gap-3 mb-4">
          <div>
            <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-white border text-navy mb-2 small fw-medium">
              <span className="badge bg-danger text-white">Administrator</span>
              <span>Event Administration Portal</span>
            </div>
            <h1 className="h2 fw-bold text-navy mb-1">Event Management</h1>
            <p className="text-charcoal mb-0">
              Create, configure, publish, and monitor collegiate events.
            </p>
          </div>
          <div>
            <button
              type="button"
              className="btn btn-primary px-4 py-2-5 fw-semibold ee-btn-primary shadow-xs"
              onClick={handleOpenCreateModal}
            >
              + Create Event
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {alertInfo.message && (
          <div
            className={`alert alert-${alertInfo.type} alert-dismissible fade show rounded-3 shadow-xs mb-4`}
            role="alert"
          >
            <span>{alertInfo.message}</span>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={() => setAlertInfo({ type: '', message: '' })}
            ></button>
          </div>
        )}

        {/* Metric Cards Strip */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="card border rounded-4 p-3 bg-white shadow-xs text-center">
              <div className="h3 fw-bold text-navy mb-0">{totalCount}</div>
              <div className="text-muted small text-uppercase tracking-wider">
                Total Events
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border rounded-4 p-3 bg-white shadow-xs text-center">
              <div className="h3 fw-bold text-success mb-0">{publishedCount}</div>
              <div className="text-muted small text-uppercase tracking-wider">
                Published
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border rounded-4 p-3 bg-white shadow-xs text-center">
              <div className="h3 fw-bold text-secondary mb-0">{draftCount}</div>
              <div className="text-muted small text-uppercase tracking-wider">
                Drafts
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border rounded-4 p-3 bg-white shadow-xs text-center">
              <div className="h3 fw-bold text-danger mb-0">{cancelledCount}</div>
              <div className="text-muted small text-uppercase tracking-wider">
                Cancelled
              </div>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="card border rounded-4 p-3 bg-white shadow-xs mb-4">
          <div className="row g-3 align-items-center">
            <div className="col-12 col-md-6">
              <input
                type="text"
                className="form-control"
                placeholder="Search events by title, organizer, or venue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="col-12 col-md-6 d-flex flex-wrap gap-2 justify-content-md-end">
              {['All', 'Published', 'Draft', 'Cancelled'].map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`btn btn-sm rounded-pill px-3 py-1-5 fw-medium ${
                    statusFilter === st
                      ? 'btn-primary'
                      : 'btn-outline-secondary'
                  }`}
                  onClick={() => setStatusFilter(st)}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Events Table / List */}
        {loading ? (
          <div className="py-5 text-center">
            <LoadingSpinner message="Retrieving event records..." />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="card border rounded-4 p-5 bg-white shadow-xs text-center">
            <h5 className="fw-bold text-navy mb-2">No Events Found</h5>
            <p className="text-muted small mb-3">
              {events.length === 0
                ? 'No events have been created yet. Click "+ Create Event" to add the first event.'
                : 'No events match your current filter and search criteria.'}
            </p>
            {events.length === 0 && (
              <div>
                <button
                  type="button"
                  className="btn btn-primary px-4 fw-medium"
                  onClick={handleOpenCreateModal}
                >
                  Create First Event
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="card border rounded-4 bg-white shadow-xs overflow-hidden">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light text-uppercase small text-muted">
                  <tr>
                    <th scope="col" className="ps-4">Event</th>
                    <th scope="col">Category</th>
                    <th scope="col">Date & Time</th>
                    <th scope="col">Venue</th>
                    <th scope="col">Capacity</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="text-end pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((event) => {
                    const eventDateFormatted = new Date(event.date).toLocaleDateString(
                      'en-US',
                      {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      }
                    );

                    return (
                      <tr key={event._id}>
                        {/* Event Name & Organizer */}
                        <td className="ps-4 py-3">
                          <div className="fw-semibold text-navy">{event.title}</div>
                          <div className="text-muted small">{event.organizer}</div>
                        </td>

                        {/* Category */}
                        <td>
                          <span className="badge bg-light border text-navy fw-medium">
                            {event.category}
                          </span>
                        </td>

                        {/* Date & Time */}
                        <td className="small text-charcoal">
                          <div>{eventDateFormatted}</div>
                          <div className="text-muted">{event.startTime} - {event.endTime}</div>
                        </td>

                        {/* Venue */}
                        <td className="small text-charcoal">{event.venue}</td>

                        {/* Capacity */}
                        <td className="small text-charcoal">
                          {event.seatLimit} seats
                        </td>

                        {/* Status Badge */}
                        <td>
                          <span
                            className={`badge ${
                              event.status === 'Published'
                                ? 'bg-success-subtle text-success border border-success-subtle'
                                : event.status === 'Draft'
                                ? 'bg-secondary-subtle text-secondary border'
                                : 'bg-danger-subtle text-danger border border-danger-subtle'
                            } px-2-5 py-1`}
                          >
                            {event.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="text-end pe-4">
                          <div className="d-flex align-items-center justify-content-end gap-2">
                            {event.status !== 'Cancelled' && (
                              <>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${
                                    event.status === 'Published'
                                      ? 'btn-outline-secondary'
                                      : 'btn-outline-success'
                                  }`}
                                  onClick={() => handleTogglePublish(event)}
                                  title={
                                    event.status === 'Published'
                                      ? 'Unpublish to Draft'
                                      : 'Publish Event'
                                  }
                                >
                                  {event.status === 'Published'
                                    ? 'Unpublish'
                                    : 'Publish'}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => handleOpenEditModal(event)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleCancelEvent(event)}
                                >
                                  Cancel
                                </button>
                                {event.status === 'Published' && (
                                  <Link
                                    to={`/admin/attendance?eventId=${event._id}`}
                                    className="btn btn-sm btn-outline-dark"
                                    title="Open Attendance Scanner"
                                  >
                                    Attendance
                                  </Link>
                                )}
                              </>
                            )}
                            {event.status === 'Cancelled' && (
                              <span className="text-muted small">Cancelled</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Event Form Modal */}
      <EventFormModal
        show={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEvent}
        eventToEdit={editingEvent}
      />
    </div>
  );
};

export default AdminEventsPage;

