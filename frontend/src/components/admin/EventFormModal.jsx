import React, { useState, useEffect } from 'react';

const categories = [
  'Technical',
  'Cultural',
  'Workshop',
  'Competition',
  'Seminar',
  'Sports',
  'Other'
];

/**
 * Event Form Modal for creating and editing events
 */
const EventFormModal = ({ show, onClose, onSave, eventToEdit }) => {
  const isEditMode = Boolean(eventToEdit);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Technical',
    date: '',
    startTime: '09:30 AM',
    endTime: '04:30 PM',
    venue: '',
    registrationDeadline: '',
    seatLimit: 100,
    organizer: '',
    poster: '',
    status: 'Draft'
  });

  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (eventToEdit) {
      // Format existing dates for HTML date inputs
      const eventDateStr = eventToEdit.date
        ? new Date(eventToEdit.date).toISOString().split('T')[0]
        : '';
      const regDeadlineStr = eventToEdit.registrationDeadline
        ? new Date(eventToEdit.registrationDeadline).toISOString().slice(0, 16)
        : '';

      setFormData({
        title: eventToEdit.title || '',
        description: eventToEdit.description || '',
        category: eventToEdit.category || 'Technical',
        date: eventDateStr,
        startTime: eventToEdit.startTime || '09:30 AM',
        endTime: eventToEdit.endTime || '04:30 PM',
        venue: eventToEdit.venue || '',
        registrationDeadline: regDeadlineStr,
        seatLimit: eventToEdit.seatLimit || 100,
        organizer: eventToEdit.organizer || '',
        poster: eventToEdit.poster || '',
        status: eventToEdit.status || 'Draft'
      });
    } else {
      // Default initial date: tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 7);
      const defaultDateStr = tomorrow.toISOString().split('T')[0];

      const deadline = new Date(tomorrow);
      deadline.setDate(deadline.getDate() - 2);
      const defaultDeadlineStr = deadline.toISOString().slice(0, 16);

      setFormData({
        title: '',
        description: '',
        category: 'Technical',
        date: defaultDateStr,
        startTime: '09:30 AM',
        endTime: '04:30 PM',
        venue: '',
        registrationDeadline: defaultDeadlineStr,
        seatLimit: 150,
        organizer: '',
        poster: '',
        status: 'Draft'
      });
    }
    setErrorMessage('');
  }, [eventToEdit, show]);

  if (!show) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Validations
    if (
      !formData.title.trim() ||
      !formData.description.trim() ||
      !formData.category ||
      !formData.date ||
      !formData.startTime ||
      !formData.endTime ||
      !formData.venue.trim() ||
      !formData.registrationDeadline ||
      !formData.seatLimit ||
      !formData.organizer.trim()
    ) {
      setErrorMessage('Please fill in all required event fields.');
      return;
    }

    const seatNum = parseInt(formData.seatLimit, 10);
    if (isNaN(seatNum) || seatNum < 1) {
      setErrorMessage('Seat limit must be a positive number greater than 0.');
      return;
    }

    // Date validations
    const now = new Date();
    const eventDate = new Date(formData.date);
    const deadlineDate = new Date(formData.registrationDeadline);

    if (isNaN(eventDate.getTime())) {
      setErrorMessage('Invalid event date format.');
      return;
    }

    if (isNaN(deadlineDate.getTime())) {
      setErrorMessage('Invalid registration deadline format.');
      return;
    }

    if (eventDate <= now) {
      setErrorMessage('Event date must be scheduled in the future.');
      return;
    }

    if (deadlineDate <= now) {
      setErrorMessage('Registration deadline must be in the future.');
      return;
    }

    if (deadlineDate >= eventDate) {
      setErrorMessage(
        'Registration deadline must be scheduled before the event date.'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        ...formData,
        seatLimit: seatNum
      });
      onClose();
    } catch (err) {
      const serverMsg =
        err.response?.data?.message || 'Failed to save event. Please check inputs.';
      setErrorMessage(serverMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(2px)' }}
      tabIndex="-1"
      role="dialog"
    >
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content border-0 rounded-4 shadow-lg">
          {/* Modal Header */}
          <div className="modal-header bg-white border-bottom px-4 py-3">
            <h5 className="modal-title fw-bold text-navy">
              {isEditMode ? 'Edit Campus Event' : 'Create New Campus Event'}
            </h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onClose}
              disabled={isSubmitting}
            ></button>
          </div>

          {/* Modal Body / Form */}
          <div className="modal-body px-4 py-3">
            {errorMessage && (
              <div className="alert alert-danger py-2 px-3 small rounded-3 mb-3">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} id="eventForm" noValidate>
              {/* Title */}
              <div className="mb-3">
                <label className="form-label text-navy fw-medium small mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  name="title"
                  className="form-control"
                  placeholder="e.g. TechNova Annual Hackathon 2026"
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Category and Organizer */}
              <div className="row g-3 mb-3">
                <div className="col-12 col-md-6">
                  <label className="form-label text-navy fw-medium small mb-1">
                    Event Category *
                  </label>
                  <select
                    name="category"
                    className="form-select"
                    value={formData.category}
                    onChange={handleChange}
                    required
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label text-navy fw-medium small mb-1">
                    Organizing Department / Club *
                  </label>
                  <input
                    type="text"
                    name="organizer"
                    className="form-control"
                    placeholder="e.g. Department of Computer Science"
                    value={formData.organizer}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Date, Start Time, End Time */}
              <div className="row g-3 mb-3">
                <div className="col-12 col-md-4">
                  <label className="form-label text-navy fw-medium small mb-1">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    name="date"
                    className="form-control"
                    value={formData.date}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="col-6 col-md-4">
                  <label className="form-label text-navy fw-medium small mb-1">
                    Start Time *
                  </label>
                  <input
                    type="text"
                    name="startTime"
                    className="form-control"
                    placeholder="e.g. 09:30 AM"
                    value={formData.startTime}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="col-6 col-md-4">
                  <label className="form-label text-navy fw-medium small mb-1">
                    End Time *
                  </label>
                  <input
                    type="text"
                    name="endTime"
                    className="form-control"
                    placeholder="e.g. 04:30 PM"
                    value={formData.endTime}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Venue and Seat Limit */}
              <div className="row g-3 mb-3">
                <div className="col-12 col-md-8">
                  <label className="form-label text-navy fw-medium small mb-1">
                    Venue / Campus Location *
                  </label>
                  <input
                    type="text"
                    name="venue"
                    className="form-control"
                    placeholder="e.g. Main Auditorium, Block C"
                    value={formData.venue}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label text-navy fw-medium small mb-1">
                    Total Seat Capacity *
                  </label>
                  <input
                    type="number"
                    name="seatLimit"
                    min="1"
                    className="form-control"
                    placeholder="e.g. 150"
                    value={formData.seatLimit}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Registration Deadline and Initial Status */}
              <div className="row g-3 mb-3">
                <div className="col-12 col-md-7">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label text-navy fw-medium small mb-0">
                      Registration Deadline *
                    </label>
                    <span className="text-muted small">Must be before event</span>
                  </div>
                  <input
                    type="datetime-local"
                    name="registrationDeadline"
                    className="form-control"
                    value={formData.registrationDeadline}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="col-12 col-md-5">
                  <label className="form-label text-navy fw-medium small mb-1">
                    Publication Status *
                  </label>
                  <select
                    name="status"
                    className="form-select"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="Draft">Draft (Hidden from students)</option>
                    <option value="Published">Published (Public in catalog)</option>
                  </select>
                </div>
              </div>

              {/* Poster URL (Optional) */}
              <div className="mb-3">
                <label className="form-label text-navy fw-medium small mb-1">
                  Poster Image URL (Optional)
                </label>
                <input
                  type="url"
                  name="poster"
                  className="form-control"
                  placeholder="https://example.com/poster.jpg"
                  value={formData.poster}
                  onChange={handleChange}
                />
              </div>

              {/* Description */}
              <div className="mb-2">
                <label className="form-label text-navy fw-medium small mb-1">
                  Event Description *
                </label>
                <textarea
                  name="description"
                  rows="3"
                  className="form-control"
                  placeholder="Provide comprehensive details about the event, objectives, and prerequisites..."
                  value={formData.description}
                  onChange={handleChange}
                  required
                ></textarea>
              </div>
            </form>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer bg-light border-top px-4 py-3">
            <button
              type="button"
              className="btn btn-outline-secondary px-4 fw-medium"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="eventForm"
              className="btn btn-primary px-4 fw-semibold ee-btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="d-flex align-items-center gap-2">
                  <span className="spinner-border spinner-border-sm"></span>
                  <span>Saving...</span>
                </span>
              ) : isEditMode ? (
                'Update Event'
              ) : (
                'Create Event'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventFormModal;

