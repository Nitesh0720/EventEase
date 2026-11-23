import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sampleEvents } from '../data/sampleEvents';
import { fetchEvents } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const categories = [
  'All',
  'Technical',
  'Cultural',
  'Workshop',
  'Competition',
  'Seminar',
  'Sports',
  'Other'
];

const EventsPage = () => {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [eventsList, setEventsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isUsingDemoData, setIsUsingDemoData] = useState(false);

  const loadPublishedEvents = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      // Public API returns only Published events
      const res = await fetchEvents();
      if (res.success && res.events && res.events.length > 0) {
        setEventsList(res.events);
        setIsUsingDemoData(false);
      } else {
        // Requirement 3: Clearly separate demo events from official database records
        setEventsList(sampleEvents);
        setIsUsingDemoData(true);
      }
    } catch (err) {
      console.warn('[Events Catalog] Could not connect to API, using demo fallback:', err.message);
      // Graceful fallback to demo showcase
      setEventsList(sampleEvents);
      setIsUsingDemoData(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPublishedEvents();
  }, []);

  // Requirement 1: Search and category filters work together correctly
  const filteredEvents = eventsList.filter((event) => {
    const title = event.title || '';
    const organizer = event.organizer || event.department || '';
    const venue = event.venue || '';
    const query = searchTerm.toLowerCase().trim();

    // Search query matches title, organizer, or venue
    const matchesSearch =
      !query ||
      title.toLowerCase().includes(query) ||
      organizer.toLowerCase().includes(query) ||
      venue.toLowerCase().includes(query);

    // Category matches 'All' or specific category
    const matchesCategory =
      selectedCategory === 'All' || event.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Requirement 4: Clear filters option
  const isFiltered = searchTerm.trim() !== '' || selectedCategory !== 'All';
  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
  };

  return (
    <div className="ee-events-page py-5 bg-light min-vh-100">
      <div className="container">
        {/* Requirement 3: Source Identification Banner */}
        {isUsingDemoData ? (
          <div className="alert alert-secondary border shadow-xs rounded-3 mb-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-secondary text-white">Demo Showcase Record</span>
              <span className="small text-charcoal">
                No active live events are currently published in the database. Showing sample collegiate events for preview.
              </span>
            </div>
            <span className="badge bg-white text-navy border small">Sample Data</span>
          </div>
        ) : (
          <div className="alert alert-success border-0 shadow-xs rounded-3 mb-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-success text-white">Official Events</span>
              <span className="small text-charcoal">
                Showing live published events verified from the campus database.
              </span>
            </div>
            <span className="badge bg-white text-success border border-success-subtle small">
              Live Database
            </span>
          </div>
        )}

        {/* Error State Banner */}
        {errorMessage && (
          <div className="alert alert-danger rounded-3 shadow-xs mb-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
            <span>{errorMessage}</span>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={loadPublishedEvents}
            >
              Retry
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="d-flex flex-column flex-md-row md-align-items-end justify-content-between gap-3 mb-4">
          <div>
            <h1 className="h2 fw-bold text-navy mb-1">Campus Events Catalog</h1>
            <p className="text-charcoal mb-0">
              Browse through scheduled departmental symposiums, workshops, and collegiate competitions.
            </p>
          </div>
          {isFiltered && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary px-3 py-1-5 align-self-start align-self-md-end text-nowrap"
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Search & Category Filter Controls */}
        <div className="card border rounded-4 p-3 mb-4 bg-white shadow-xs">
          <div className="row g-3 align-items-center">
            {/* Search Bar */}
            <div className="col-12 col-md-5">
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search events by title, organizer, or venue..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search events"
                />
                {searchTerm && (
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => setSearchTerm('')}
                    title="Clear search text"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="col-12 col-md-7 d-flex flex-wrap gap-1-5 justify-content-md-end">
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
          </div>
        </div>

        {/* Filter Summary Counter */}
        <div className="d-flex align-items-center justify-content-between mb-3 text-muted small">
          <span>
            Showing <strong>{filteredEvents.length}</strong> {filteredEvents.length === 1 ? 'event' : 'events'}
            {selectedCategory !== 'All' && ` in ${selectedCategory}`}
            {searchTerm && ` matching "${searchTerm}"`}
          </span>
          {isFiltered && (
            <button
              type="button"
              className="btn btn-link btn-sm p-0 text-decoration-none text-muted"
              onClick={handleClearFilters}
            >
              Reset filters
            </button>
          )}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-5 text-center">
            <LoadingSpinner message="Loading campus events..." />
          </div>
        ) : filteredEvents.length === 0 ? (
          /* Empty State */
          <div className="card border rounded-4 p-5 bg-white shadow-xs text-center my-4">
            <h5 className="fw-bold text-navy mb-2">No Matching Events</h5>
            <p className="text-muted small mb-4 max-w-500 mx-auto">
              We could not find any events matching your search criteria. Try modifying your search keywords or resetting your category filter.
            </p>
            <div>
              <button
                type="button"
                className="btn btn-primary px-4 fw-medium ee-btn-primary"
                onClick={handleClearFilters}
              >
                Clear All Filters
              </button>
            </div>
          </div>
        ) : (
          /* Events Grid */
          <div className="row g-4">
            {filteredEvents.map((event) => {
              const eventId = event._id || event.id;
              const formattedDate = event.date
                ? new Date(event.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })
                : 'TBA';
              const organizer = event.organizer || event.department || 'Campus Department';
              const capacity = event.seatLimit || event.totalSpots || 100;
              const timeDisplay = event.startTime && event.endTime
                ? `${event.startTime} - ${event.endTime}`
                : event.time || 'Schedule announced soon';

              return (
                <div key={eventId} className="col-12 col-md-6 col-lg-4">
                  <div className="card h-100 border rounded-4 ee-event-card bg-white shadow-xs d-flex flex-column">
                    <div className="card-body p-4 d-flex flex-column">
                      {/* Top Badges */}
                      <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
                        <span className="badge bg-light border text-navy fw-semibold px-2-5 py-1">
                          {event.category}
                        </span>
                        <span className="badge bg-success-subtle text-success border border-success-subtle px-2-5 py-1">
                          {event.status || 'Published'}
                        </span>
                      </div>

                      {/* Title */}
                      <h5 className="card-title fw-bold text-navy mb-2 leading-snug">
                        {event.title}
                      </h5>

                      {/* Organizer */}
                      <p className="text-muted small mb-3">{organizer}</p>

                      {/* Description snippet */}
                      <p className="text-charcoal small mb-3 flex-grow-1 leading-relaxed">
                        {event.shortDescription || event.description}
                      </p>

                      {/* Date & Venue details */}
                      <div className="py-2 border-top border-bottom my-2 small text-charcoal d-flex flex-column gap-1-5">
                        <div className="d-flex align-items-center gap-2">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-muted"
                          >
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          <span>{formattedDate}</span>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-muted"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          <span>{timeDisplay}</span>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-muted"
                          >
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          <span className="text-truncate">{event.venue}</span>
                        </div>
                      </div>

                      {/* Capacity Indicator */}
                      <div className="d-flex justify-content-between small text-muted my-2">
                        <span>Capacity:</span>
                        <span className="fw-semibold text-navy">
                          {capacity} attendees limit
                        </span>
                      </div>

                      {/* Requirement 5: Navigate to details page */}
                      <button
                        type="button"
                        className="btn btn-outline-primary w-100 mt-2 fw-semibold ee-btn-outline-primary"
                        onClick={() => navigate(`/events/${eventId}`)}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsPage;
