import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  fetchEvents,
  getEventCertificates,
  generateCertificate,
  generateBulkCertificates,
  downloadCertificate,
  fetchEventAttendance,
  fetchEventAttendanceStats
} from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';

const AdminCertificatesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialEventId = searchParams.get('eventId') || '';

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(initialEventId);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Data states
  const [certificates, setCertificates] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({ totalPresent: 0, totalRegistered: 0 });
  const [loadingData, setLoadingData] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Action states
  const [generatingStudentId, setGeneratingStudentId] = useState(null);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  // Email delivery toggles (default false)
  const [sendEmailIndividual, setSendEmailIndividual] = useState(false);
  const [sendEmailBulk, setSendEmailBulk] = useState(false);

  // Modals & Feedback
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [bulkSummary, setBulkSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('issued'); // 'issued' | 'attendees'

  // Load events on mount
  useEffect(() => {
    const loadEvents = async () => {
      setLoadingEvents(true);
      try {
        const res = await fetchEvents();
        if (res.success && Array.isArray(res.events)) {
          // Only show Published events (exclude Draft and Cancelled)
          const eligible = res.events.filter((e) => e.status === 'Published');
          setEvents(eligible);

          if (!selectedEventId && eligible.length > 0) {
            setSelectedEventId(eligible[0]._id);
            setSelectedEvent(eligible[0]);
          } else if (selectedEventId) {
            const found = eligible.find((e) => e._id === selectedEventId);
            setSelectedEvent(found || eligible[0] || null);
          }
        }
      } catch (err) {
        console.error('Failed to load events:', err);
        setAlert({ type: 'danger', message: 'Failed to load events list' });
      } finally {
        setLoadingEvents(false);
      }
    };

    loadEvents();
  }, []);

  // Sync selected event data
  useEffect(() => {
    if (selectedEventId && events.length > 0) {
      const found = events.find((e) => e._id === selectedEventId);
      setSelectedEvent(found || null);
      setSearchParams({ eventId: selectedEventId });
      loadCertificateData(selectedEventId);
      setAlert({ type: '', message: '' });
      setBulkSummary(null);
    }
  }, [selectedEventId, events]);

  const loadCertificateData = async (eventId) => {
    if (!eventId) return;
    setLoadingData(true);
    try {
      const [certRes, attRes, statsRes] = await Promise.all([
        getEventCertificates(eventId),
        fetchEventAttendance(eventId),
        fetchEventAttendanceStats(eventId)
      ]);

      if (certRes.success) {
        setCertificates(certRes.certificates || []);
      }
      if (attRes.success) {
        setAttendees(attRes.data || []);
      }
      if (statsRes.success && statsRes.stats) {
        setAttendanceStats(statsRes.stats);
      }
    } catch (err) {
      console.error('Failed to load certificate data:', err);
      setAlert({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to load event certificates'
      });
    } finally {
      setLoadingData(false);
    }
  };

  // Check if event has ended based on date and endTime
  const isEventEnded = () => {
    if (!selectedEvent) return false;
    const now = new Date();
    const eventDate = new Date(selectedEvent.date);
    if (isNaN(eventDate.getTime())) return false;

    if (selectedEvent.endTime) {
      const regex = /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i;
      const match = selectedEvent.endTime.trim().match(regex);
      if (match) {
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const meridiem = match[3] ? match[3].toUpperCase() : null;
        if (meridiem === 'PM' && hours < 12) hours += 12;
        if (meridiem === 'AM' && hours === 12) hours = 0;
        eventDate.setHours(hours, minutes, 0, 0);
      } else {
        eventDate.setHours(23, 59, 59, 999);
      }
    } else {
      eventDate.setHours(23, 59, 59, 999);
    }

    return now >= eventDate;
  };

  // Set of student IDs who already have a certificate
  const issuedStudentIds = new Set(
    certificates.map((c) => (c.student?._id ? c.student._id.toString() : ''))
  );

  // Attendees eligible for issuance (verified attendees without a certificate)
  const pendingAttendees = attendees.filter((att) => {
    const sId = att.student?._id ? att.student._id.toString() : '';
    return sId && !issuedStudentIds.has(sId);
  });

  // Handle individual certificate generation
  const handleGenerateIndividual = async (studentId, studentName) => {
    if (!selectedEventId || !studentId) return;

    const emailNotice = sendEmailIndividual
      ? "\n\nEmail delivery is enabled: an official PDF certificate will be queued to the student's email in the background."
      : '\n\nEmail delivery is not requested: the certificate will be generated and available on the portal.';

    const confirmed = window.confirm(
      `Issue an official Certificate of Participation to ${studentName}?${emailNotice}`
    );
    if (!confirmed) return;

    setGeneratingStudentId(studentId);
    setAlert({ type: '', message: '' });

    try {
      const res = await generateCertificate(selectedEventId, studentId, sendEmailIndividual);
      if (res.success) {
        const emailMsg =
          res.emailStatus === 'queued'
            ? ' Email delivery has been queued in the background and will dispatch shortly.'
            : ' (Email delivery was not requested).';

        setAlert({
          type: 'success',
          message: `Certificate successfully issued for ${studentName} (${res.certificate.certificateId}).${emailMsg}`
        });
        await loadCertificateData(selectedEventId);
      }
    } catch (err) {
      console.error('Error issuing certificate:', err);
      setAlert({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to generate certificate'
      });
    } finally {
      setGeneratingStudentId(null);
    }
  };

  // Handle bulk certificate generation
  const handleGenerateBulk = async () => {
    if (!selectedEventId) return;

    const pendingCount = pendingAttendees.length;
    const emailNotice = sendEmailBulk
      ? '\n\nEmail delivery is enabled: newly issued attendees will receive their PDF certificate via email in the background.'
      : '\n\nEmail delivery is not requested: certificates will only be available on the portal.';

    const confirmed = window.confirm(
      `Generate bulk certificates for all eligible attendees of "${selectedEvent?.title}"?\n\nThis will issue certificates for ${pendingCount} pending attendee(s) and skip already issued certificates.${emailNotice}`
    );
    if (!confirmed) return;

    setIsBulkGenerating(true);
    setAlert({ type: '', message: '' });
    setBulkSummary(null);

    try {
      const res = await generateBulkCertificates(selectedEventId, sendEmailBulk);
      if (res.success) {
        setBulkSummary(res.summary);
        const emailSummaryMsg = res.summary.emailDeliveryRequested
          ? ` Email delivery queued for ${res.summary.emailsQueued} new certificate(s).`
          : ' Email delivery was not requested.';

        setAlert({
          type: 'success',
          message: `${res.message || 'Bulk certificate generation completed successfully.'}${emailSummaryMsg}`
        });
        await loadCertificateData(selectedEventId);
        setActiveTab('issued');
      }
    } catch (err) {
      console.error('Error generating bulk certificates:', err);
      setAlert({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to complete bulk generation'
      });
    } finally {
      setIsBulkGenerating(false);
    }
  };

  // Handle PDF download
  const handleDownload = async (certId, certCode) => {
    setDownloadingId(certId);
    try {
      await downloadCertificate(certId, `EventEase-Certificate-${certCode}.pdf`);
    } catch (err) {
      console.error('Download error:', err);
      setAlert({
        type: 'danger',
        message: 'Failed to download certificate PDF. Please try again.'
      });
    } finally {
      setDownloadingId(null);
    }
  };

  // Filtered lists based on search
  const filteredCertificates = certificates.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const name = c.student?.name?.toLowerCase() || '';
    const email = c.student?.email?.toLowerCase() || '';
    const code = c.certificateId?.toLowerCase() || '';
    const dept = c.student?.department?.toLowerCase() || '';
    return name.includes(q) || email.includes(q) || code.includes(q) || dept.includes(q);
  });

  const filteredAttendees = pendingAttendees.filter((att) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const name = att.student?.name?.toLowerCase() || '';
    const email = att.student?.email?.toLowerCase() || '';
    const dept = att.student?.department?.toLowerCase() || '';
    return name.includes(q) || email.includes(q) || dept.includes(q);
  });

  const eventEnded = isEventEnded();

  return (
    <div className="container py-4 min-vh-75">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 pb-3 border-bottom">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1 small text-muted">
              <li className="breadcrumb-item"><Link to="/">Home</Link></li>
              <li className="breadcrumb-item"><Link to="/admin/events">Admin</Link></li>
              <li className="breadcrumb-item active" aria-current="page">Certificates</li>
            </ol>
          </nav>
          <h1 className="h3 fw-bold text-navy mb-0">Certificate Management</h1>
          <p className="text-muted small mb-0">
            Issue, manage, and download verified certificates of participation for concluded events.
          </p>
        </div>

        {/* Global Action / Link to Attendance */}
        {selectedEventId && (
          <div className="d-flex gap-2">
            <Link
              to={`/admin/attendance?eventId=${selectedEventId}`}
              className="btn btn-outline-secondary btn-sm fw-semibold"
            >
              View Attendance Roster
            </Link>
          </div>
        )}
      </div>

      {/* Alert Notification */}
      {alert.message && (
        <div
          className={`alert alert-${alert.type} alert-dismissible fade show d-flex align-items-center justify-content-between`}
          role="alert"
        >
          <span>{alert.message}</span>
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={() => setAlert({ type: '', message: '' })}
          ></button>
        </div>
      )}

      {/* Bulk Generation Summary Banner */}
      {bulkSummary && (
        <div className="card border-primary-subtle bg-primary-subtle mb-4 shadow-sm">
          <div className="card-body py-3">
            <h6 className="fw-bold text-navy mb-2">Bulk Issuance Summary</h6>
            <div className="row g-2 text-center text-md-start small">
              <div className="col-6 col-md-3">
                <span className="text-muted">Total Verified Attendees:</span>{' '}
                <strong className="text-navy">{bulkSummary.totalVerifiedAttendees}</strong>
              </div>
              <div className="col-6 col-md-3">
                <span className="text-muted">Newly Generated:</span>{' '}
                <strong className="text-success">{bulkSummary.certificatesNewlyGenerated}</strong>
              </div>
              <div className="col-6 col-md-3">
                <span className="text-muted">Already Existing / Skipped:</span>{' '}
                <strong className="text-muted">{bulkSummary.certificatesAlreadyExisting}</strong>
              </div>
              <div className="col-6 col-md-3">
                <span className="text-muted">Failed Records:</span>{' '}
                <strong className={bulkSummary.failedCount > 0 ? 'text-danger' : 'text-muted'}>
                  {bulkSummary.failedCount}
                </strong>
              </div>
            </div>
            {bulkSummary.emailDeliveryRequested && (
              <div className="mt-2 pt-2 border-top border-primary-subtle small text-primary-emphasis">
                <strong>Email Delivery:</strong> {bulkSummary.emailsQueued} email{bulkSummary.emailsQueued === 1 ? '' : 's'} queued for newly issued certificates.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Event Selection Selector */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-3 p-md-4">
          <div className="row align-items-center g-3">
            <div className="col-12 col-md-6">
              <label htmlFor="eventSelect" className="form-label small fw-bold text-navy mb-1">
                Select Concluded or Active Published Event
              </label>
              {loadingEvents ? (
                <LoadingSpinner message="Loading published events..." />
              ) : events.length === 0 ? (
                <div className="alert alert-warning py-2 px-3 small mb-0">
                  No published events found. Create and publish an event first.
                </div>
              ) : (
                <select
                  id="eventSelect"
                  className="form-select form-select-lg fw-semibold text-navy"
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                >
                  {events.map((evt) => (
                    <option key={evt._id} value={evt._id}>
                      {evt.title} ({new Date(evt.date).toLocaleDateString()}) - {evt.category}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Event Timing & End Time Status Notice */}
            {selectedEvent && (
              <div className="col-12 col-md-6">
                <div className="p-3 bg-light rounded-3 border">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="small text-muted">Event Schedule:</span>
                    <span
                      className={`badge ${
                        eventEnded ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning-emphasis'
                      } fw-semibold`}
                    >
                      {eventEnded ? 'Concluded (Eligible for Certificates)' : 'In Progress / Upcoming'}
                    </span>
                  </div>
                  <div className="small fw-semibold text-navy">
                    {new Date(selectedEvent.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}{' '}
                    • {selectedEvent.startTime} - {selectedEvent.endTime}
                  </div>
                  <div className="small text-muted mt-1">
                    Venue: {selectedEvent.venue} | Organizer: {selectedEvent.organizer}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {!selectedEventId ? (
        <div className="card border-0 shadow-sm text-center py-5">
          <div className="card-body">
            <h5 className="fw-bold text-navy mb-2">No Event Selected</h5>
            <p className="text-muted small">Please choose an event from the selector above to manage certificates.</p>
          </div>
        </div>
      ) : loadingData ? (
        <div className="py-5 text-center">
          <LoadingSpinner message="Loading certificate records..." />
        </div>
      ) : (
        <>
          {/* Overview Metric Cards */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6 col-lg-3">
              <div className="card border-0 shadow-sm h-100 border-start border-primary border-4">
                <div className="card-body p-3">
                  <div className="text-muted small fw-bold text-uppercase">Verified Attendees</div>
                  <div className="h3 fw-bold text-navy mt-1 mb-0">
                    {attendanceStats.totalPresent || attendees.length}
                  </div>
                  <div className="small text-muted mt-1">Attended with recorded check-in</div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="card border-0 shadow-sm h-100 border-start border-success border-4">
                <div className="card-body p-3">
                  <div className="text-muted small fw-bold text-uppercase">Certificates Issued</div>
                  <div className="h3 fw-bold text-success mt-1 mb-0">{certificates.length}</div>
                  <div className="small text-muted mt-1">Generated and downloadable</div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="card border-0 shadow-sm h-100 border-start border-warning border-4">
                <div className="card-body p-3">
                  <div className="text-muted small fw-bold text-uppercase">Pending Issuance</div>
                  <div className="h3 fw-bold text-warning-emphasis mt-1 mb-0">
                    {pendingAttendees.length}
                  </div>
                  <div className="small text-muted mt-1">Verified attendees awaiting certificates</div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="card border-0 shadow-sm h-100 border-start border-info border-4">
                <div className="card-body p-3 d-flex flex-column justify-content-between">
                  <div>
                    <div className="text-muted small fw-bold text-uppercase">Bulk Action</div>
                    <div className="small text-muted mt-1">Issue to all eligible attendees</div>
                    <div className="form-check mt-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="sendEmailBulkCheck"
                        checked={sendEmailBulk}
                        onChange={(e) => setSendEmailBulk(e.target.checked)}
                      />
                      <label className="form-check-label small text-muted" htmlFor="sendEmailBulkCheck">
                        Email certificates to newly issued attendees
                      </label>
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                      (Existing certificates are not emailed again)
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm fw-semibold w-100 mt-2"
                    onClick={handleGenerateBulk}
                    disabled={isBulkGenerating || pendingAttendees.length === 0 || !eventEnded}
                    title={
                      !eventEnded
                        ? 'Event must be concluded before certificates can be issued'
                        : pendingAttendees.length === 0
                        ? 'No pending attendees'
                        : 'Generate bulk certificates'
                    }
                  >
                    {isBulkGenerating ? 'Generating...' : `Generate All (${pendingAttendees.length})`}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Event Conclusion Warning (if event not ended) */}
          {!eventEnded && (
            <div className="alert alert-warning d-flex align-items-center mb-4 small" role="alert">
              <div>
                <strong>Scheduled End Time Pending:</strong> Certificates cannot be generated until the event's
                scheduled end time has passed. Please wait until the event concludes to issue certificates.
              </div>
            </div>
          )}

          {/* Tab Navigation and Search Bar */}
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom p-3">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                {/* Tabs */}
                <ul className="nav nav-pills card-header-pills">
                  <li className="nav-item">
                    <button
                      className={`nav-link small fw-semibold ${activeTab === 'issued' ? 'active' : ''}`}
                      onClick={() => setActiveTab('issued')}
                    >
                      Issued Certificates ({certificates.length})
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link small fw-semibold ${activeTab === 'attendees' ? 'active' : ''}`}
                      onClick={() => setActiveTab('attendees')}
                    >
                      Pending Attendees ({pendingAttendees.length})
                    </button>
                  </li>
                </ul>

                {/* Search Box */}
                <div className="w-100 max-w-350">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Search by student, ID, or department..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Tab 1: Issued Certificates */}
            {activeTab === 'issued' && (
              <div className="table-responsive">
                {filteredCertificates.length === 0 ? (
                  <div className="text-center py-5 text-muted small">
                    {certificates.length === 0
                      ? 'No certificates have been issued for this event yet.'
                      : 'No issued certificates match your search filter.'}
                  </div>
                ) : (
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light small text-muted text-uppercase">
                      <tr>
                        <th style={{ width: '5%' }}>#</th>
                        <th style={{ width: '25%' }}>Student</th>
                        <th style={{ width: '20%' }}>Department & Year</th>
                        <th style={{ width: '20%' }}>Certificate ID</th>
                        <th style={{ width: '15%' }}>Issued On</th>
                        <th style={{ width: '15%' }} className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="small">
                      {filteredCertificates.map((cert, index) => (
                        <tr key={cert._id}>
                          <td className="text-muted">{index + 1}</td>
                          <td>
                            <div className="fw-semibold text-navy">{cert.student?.name || 'Unknown Student'}</div>
                            <div className="text-muted small">{cert.student?.email}</div>
                          </td>
                          <td>
                            <div>{cert.student?.department || 'N/A'}</div>
                            <div className="text-muted small">{cert.student?.year || ''}</div>
                          </td>
                          <td>
                            <span className="badge bg-light text-navy border font-monospace">
                              {cert.certificateId}
                            </span>
                          </td>
                          <td>
                            {cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary fw-semibold"
                              onClick={() => handleDownload(cert._id, cert.certificateId)}
                              disabled={downloadingId === cert._id}
                            >
                              {downloadingId === cert._id ? 'Downloading...' : 'Download PDF'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Tab 2: Pending Attendees */}
            {activeTab === 'attendees' && (
              <div>
                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center bg-light p-2 px-3 border-bottom">
                  <span className="small text-muted mb-2 mb-sm-0">
                    Showing {filteredAttendees.length} eligible attendee{filteredAttendees.length === 1 ? '' : 's'}.
                  </span>
                  <div className="form-check mb-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="sendEmailIndividualCheck"
                      checked={sendEmailIndividual}
                      onChange={(e) => setSendEmailIndividual(e.target.checked)}
                    />
                    <label className="form-check-label small text-navy fw-semibold" htmlFor="sendEmailIndividualCheck">
                      Email certificate to the student
                    </label>
                  </div>
                </div>

                <div className="table-responsive">
                  {filteredAttendees.length === 0 ? (
                  <div className="text-center py-5 text-muted small">
                    {pendingAttendees.length === 0
                      ? 'All verified attendees have already been issued certificates.'
                      : 'No pending attendees match your search filter.'}
                  </div>
                ) : (
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light small text-muted text-uppercase">
                      <tr>
                        <th style={{ width: '5%' }}>#</th>
                        <th style={{ width: '30%' }}>Student</th>
                        <th style={{ width: '25%' }}>Department & Year</th>
                        <th style={{ width: '20%' }}>Check-in Time</th>
                        <th style={{ width: '20%' }} className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody className="small">
                      {filteredAttendees.map((att, index) => (
                        <tr key={att._id}>
                          <td className="text-muted">{index + 1}</td>
                          <td>
                            <div className="fw-semibold text-navy">{att.student?.name}</div>
                            <div className="text-muted small">{att.student?.email}</div>
                          </td>
                          <td>
                            <div>{att.student?.department || 'N/A'}</div>
                            <div className="text-muted small">{att.student?.year || ''}</div>
                          </td>
                          <td>
                            {att.checkInTime ? new Date(att.checkInTime).toLocaleString() : 'N/A'}
                          </td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-sm btn-success fw-semibold"
                              onClick={() => handleGenerateIndividual(att.student?._id, att.student?.name)}
                              disabled={generatingStudentId === att.student?._id || !eventEnded}
                              title={
                                !eventEnded
                                  ? 'Event must conclude before generating certificate'
                                  : 'Issue Certificate'
                              }
                            >
                              {generatingStudentId === att.student?._id ? 'Issuing...' : 'Issue Certificate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminCertificatesPage;

