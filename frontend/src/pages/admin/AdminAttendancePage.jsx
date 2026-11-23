import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import {
  fetchEvents,
  scanAttendanceQr,
  manualAttendanceCheckIn,
  fetchEventAttendance,
  fetchEventAttendanceStats,
  exportEventAttendanceCsv
} from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';

const AdminAttendancePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialEventId = searchParams.get('eventId') || '';

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(initialEventId);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [activeTab, setActiveTab] = useState('scanner'); // 'scanner' | 'manual'
  const isProcessingRef = useRef(false);
  const html5QrCodeRef = useRef(null);

  // Manual entry state
  const [manualCode, setManualCode] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);

  // Verification feedback state
  const [feedback, setFeedback] = useState({ type: '', message: '', details: null });

  // Attendance data state
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({
    totalRegistered: 0,
    totalPresent: 0,
    totalAbsent: 0,
    attendanceRate: '0.0',
    capacity: 0
  });
  const [loadingData, setLoadingData] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [exportingCsv, setExportingCsv] = useState(false);

  // Load events list on mount
  useEffect(() => {
    const loadEventsList = async () => {
      setLoadingEvents(true);
      try {
        const res = await fetchEvents();
        if (res.success && Array.isArray(res.events)) {
          setEvents(res.events);
          if (!selectedEventId && res.events.length > 0) {
            setSelectedEventId(res.events[0]._id);
            setSelectedEvent(res.events[0]);
          } else if (selectedEventId) {
            const found = res.events.find((e) => e._id === selectedEventId);
            setSelectedEvent(found || res.events[0] || null);
          }
        }
      } catch (err) {
        console.error('Error loading events:', err);
      } finally {
        setLoadingEvents(false);
      }
    };

    loadEventsList();
  }, []);

  // Update selected event when selectedEventId changes
  useEffect(() => {
    if (selectedEventId && events.length > 0) {
      const found = events.find((e) => e._id === selectedEventId);
      setSelectedEvent(found || null);
      setSearchParams({ eventId: selectedEventId });
      loadAttendanceData(selectedEventId);
      // Clear previous feedback on event change
      setFeedback({ type: '', message: '', details: null });
    }
  }, [selectedEventId, events]);

  // Load attendance records and stats
  const loadAttendanceData = async (eventId) => {
    if (!eventId) return;
    setLoadingData(true);
    try {
      const [recordsRes, statsRes] = await Promise.all([
        fetchEventAttendance(eventId),
        fetchEventAttendanceStats(eventId)
      ]);

      if (recordsRes.success) {
        setAttendanceRecords(recordsRes.data || []);
      }
      if (statsRes.success && statsRes.data) {
        setAttendanceStats(statsRes.data);
      }
    } catch (err) {
      console.error('Error loading attendance data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  // Stop camera scanner cleanly
  const stopScanner = async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Scanner stop error:', err);
      } finally {
        setIsScanning(false);
      }
    }
  };

  // Start camera scanner
  const startScanner = async () => {
    setScannerError('');
    setFeedback({ type: '', message: '', details: null });

    if (!selectedEventId) {
      setScannerError('Please select an event before activating the scanner.');
      return;
    }

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-scanner-viewport');
      }

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        config,
        handleQrScanSuccess,
        handleQrScanFailure
      );

      setIsScanning(true);
    } catch (err) {
      console.error('Camera initialization error:', err);
      setIsScanning(false);
      setScannerError(
        'Unable to access camera. Please verify camera permissions in your browser or use the manual code check-in fallback.'
      );
    }
  };

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current
          .stop()
          .then(() => html5QrCodeRef.current.clear())
          .catch(() => {});
      }
    };
  }, []);

  // Handle successful QR detection
  const handleQrScanSuccess = async (decodedText) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      const res = await scanAttendanceQr(selectedEventId, decodedText);
      if (res.success && res.data) {
        setFeedback({
          type: 'success',
          message: res.message || 'Attendee Verified Successfully',
          details: res.data
        });
        // Refresh attendance records and metrics
        loadAttendanceData(selectedEventId);
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to verify QR pass.';
      const isDuplicate = err.response?.status === 409;
      setFeedback({
        type: isDuplicate ? 'warning' : 'danger',
        message: errMsg,
        details: err.response?.data?.data?.attendance || null
      });
    } finally {
      // Debounce scanner for 2 seconds to avoid rapid duplicate triggers
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 2000);
    }
  };

  const handleQrScanFailure = () => {
    // Standard frame non-match; suppress continuous logging
  };

  // Handle manual code check-in submission
  const handleManualCheckIn = async (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    setManualSubmitting(true);
    setFeedback({ type: '', message: '', details: null });

    try {
      const res = await manualAttendanceCheckIn(selectedEventId, manualCode.trim());
      if (res.success && res.data) {
        setFeedback({
          type: 'success',
          message: res.message || 'Attendee Verified Successfully (Manual Entry)',
          details: res.data
        });
        setManualCode('');
        loadAttendanceData(selectedEventId);
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Manual check-in failed.';
      const isDuplicate = err.response?.status === 409;
      setFeedback({
        type: isDuplicate ? 'warning' : 'danger',
        message: errMsg,
        details: err.response?.data?.data?.attendance || null
      });
    } finally {
      setManualSubmitting(false);
    }
  };

  // Handle CSV export
  const handleExportCsv = async () => {
    if (!selectedEventId) return;
    setExportingCsv(true);
    try {
      const blob = await exportEventAttendanceCsv(selectedEventId);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      const safeTitle = (selectedEvent?.title || 'event').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.setAttribute('download', `attendance_${safeTitle}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert('Failed to export CSV: ' + (err.response?.data?.message || err.message));
    } finally {
      setExportingCsv(false);
    }
  };

  // Filtered attendees for the table
  const filteredAttendees = attendanceRecords.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const studentName = r.student?.name?.toLowerCase() || '';
    const studentEmail = r.student?.email?.toLowerCase() || '';
    const regCode = r.registration?.registrationCode?.toLowerCase() || '';
    const dept = r.student?.department?.toLowerCase() || '';
    return studentName.includes(q) || studentEmail.includes(q) || regCode.includes(q) || dept.includes(q);
  });

  return (
    <div className="ee-admin-attendance py-5 bg-light min-vh-100">
      <div className="container">
        {/* Header Section */}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
          <div>
            <div className="badge bg-danger-subtle text-danger px-3 py-1-5 fw-semibold mb-2">
              Administrator Portal
            </div>
            <h1 className="h2 fw-bold text-navy mb-1">QR Attendance Management</h1>
            <p className="text-charcoal small mb-0">
              Verify participant admission passes in real time via live camera scanner or manual registration code fallback.
            </p>
          </div>

          <div className="d-flex gap-2">
            <Link to="/admin/events" className="btn btn-outline-secondary px-3 fw-medium">
              Event Management
            </Link>
          </div>
        </div>

        {/* Event Selector Card */}
        <div className="card border rounded-4 bg-white shadow-xs p-4 mb-4">
          <div className="row g-3 align-items-center">
            <div className="col-12 col-md-6">
              <label className="form-label small fw-semibold text-navy mb-1">
                Active Event Scope
              </label>
              {loadingEvents ? (
                <div className="small text-muted">Loading campus events...</div>
              ) : (
                <select
                  className="form-select rounded-3 fw-medium text-navy"
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                >
                  {events.map((evt) => (
                    <option key={evt._id} value={evt._id}>
                      {evt.title} ({evt.category} - {new Date(evt.date).toLocaleDateString()}) [{evt.status}]
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedEvent && (
              <div className="col-12 col-md-6">
                <div className="p-3 bg-light rounded-3 border small">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Event Schedule:</span>
                    <strong className="text-navy">
                      {new Date(selectedEvent.date).toLocaleDateString()} ({selectedEvent.startTime || 'TBA'} - {selectedEvent.endTime || 'TBA'})
                    </strong>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Venue:</span>
                    <strong className="text-navy">{selectedEvent.venue}</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Event Status:</span>
                    <span
                      className={`badge ${
                        selectedEvent.status === 'Published'
                          ? 'bg-success text-white'
                          : selectedEvent.status === 'Cancelled'
                          ? 'bg-danger text-white'
                          : 'bg-secondary text-white'
                      } px-2 py-0-5`}
                    >
                      {selectedEvent.status}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Real-Time Metrics Row */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="card border rounded-4 bg-white shadow-xs p-3 text-center">
              <span className="text-muted small fw-medium d-block mb-1">Confirmed Enrolled</span>
              <span className="h3 fw-bold text-navy mb-0">{attendanceStats.totalRegistered}</span>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border rounded-4 bg-white shadow-xs p-3 text-center">
              <span className="text-muted small fw-medium d-block mb-1">Checked In / Present</span>
              <span className="h3 fw-bold text-success mb-0">{attendanceStats.totalPresent}</span>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border rounded-4 bg-white shadow-xs p-3 text-center">
              <span className="text-muted small fw-medium d-block mb-1">Pending / Absent</span>
              <span className="h3 fw-bold text-secondary mb-0">{attendanceStats.totalAbsent}</span>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border rounded-4 bg-white shadow-xs p-3 text-center">
              <span className="text-muted small fw-medium d-block mb-1">Turnout Rate</span>
              <span className="h3 fw-bold text-primary mb-0">{attendanceStats.attendanceRate}%</span>
            </div>
          </div>
        </div>

        {/* Scanner & Verification Section */}
        <div className="row g-4 mb-4">
          {/* Check-In Controls Column */}
          <div className="col-12 col-lg-6">
            <div className="card border rounded-4 bg-white shadow-xs p-4 h-100">
              <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                <h5 className="fw-bold text-navy mb-0">Check-In Verification</h5>
                <div className="btn-group btn-group-sm" role="group">
                  <button
                    type="button"
                    className={`btn ${activeTab === 'scanner' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => {
                      setActiveTab('scanner');
                    }}
                  >
                    Camera Scanner
                  </button>
                  <button
                    type="button"
                    className={`btn ${activeTab === 'manual' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => {
                      setActiveTab('manual');
                      stopScanner();
                    }}
                  >
                    Manual Entry
                  </button>
                </div>
              </div>

              {activeTab === 'scanner' ? (
                <div>
                  <p className="text-charcoal small mb-3">
                    Point the camera at the participant's QR Digital Pass. The pass will be verified instantly against cryptographic signatures and registration records.
                  </p>

                  {/* Camera Viewport Container */}
                  <div
                    id="qr-scanner-viewport"
                    className="border rounded-4 bg-dark overflow-hidden mb-3"
                    style={{ minHeight: '300px', width: '100%' }}
                  ></div>

                  {scannerError && (
                    <div className="alert alert-warning small rounded-3 mb-3" role="alert">
                      {scannerError}
                    </div>
                  )}

                  <div className="d-flex gap-2">
                    {!isScanning ? (
                      <button
                        type="button"
                        className="btn btn-primary w-100 fw-semibold ee-btn-primary"
                        onClick={startScanner}
                      >
                        Start Camera Scanner
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-danger w-100 fw-semibold"
                        onClick={stopScanner}
                      >
                        Stop Scanner
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-charcoal small mb-3">
                    If a participant cannot present a readable QR pass, enter their official registration code below to perform an audited manual check-in.
                  </p>

                  <form onSubmit={handleManualCheckIn}>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-navy">
                        Registration Code
                      </label>
                      <input
                        type="text"
                        className="form-control font-monospace rounded-3 text-uppercase"
                        placeholder="e.g. REG-2026-9E4B-82FA"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                        maxLength={25}
                        required
                      />
                      <small className="text-muted d-block mt-1">
                        Format: REG-YYYY-XXXX-XXXX
                      </small>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary w-100 fw-semibold ee-btn-primary"
                      disabled={manualSubmitting || !manualCode.trim()}
                    >
                      {manualSubmitting ? 'Verifying Code...' : 'Verify and Check In'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Verification Status & Feedback Column */}
          <div className="col-12 col-lg-6">
            <div className="card border rounded-4 bg-white shadow-xs p-4 h-100 d-flex flex-column justify-content-between">
              <div>
                <h5 className="fw-bold text-navy mb-3 border-bottom pb-2">
                  Scanner Status & Real-Time Result
                </h5>

                {feedback.message ? (
                  <div
                    className={`alert alert-${feedback.type} rounded-4 p-4 mb-3 border shadow-xs`}
                    role="alert"
                  >
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <h6 className="fw-bold mb-0">
                        {feedback.type === 'success'
                          ? 'Check-In Confirmed'
                          : feedback.type === 'warning'
                          ? 'Duplicate Check-In'
                          : 'Verification Failed'}
                      </h6>
                      <span className="badge bg-white text-dark border small">
                        {new Date().toLocaleTimeString()}
                      </span>
                    </div>

                    <p className="mb-2 fw-medium">{feedback.message}</p>

                    {feedback.details && (
                      <div className="bg-white rounded-3 p-3 text-dark border small mt-3">
                        <div className="row g-2">
                          <div className="col-12 col-sm-6">
                            <span className="text-muted d-block">Attendee Name:</span>
                            <strong className="text-navy">
                              {feedback.details.student?.name || 'N/A'}
                            </strong>
                          </div>
                          <div className="col-12 col-sm-6">
                            <span className="text-muted d-block">Email:</span>
                            <span className="text-charcoal">
                              {feedback.details.student?.email || 'N/A'}
                            </span>
                          </div>
                          <div className="col-12 col-sm-6">
                            <span className="text-muted d-block">Department & Year:</span>
                            <span className="text-charcoal">
                              {feedback.details.student?.department || 'N/A'} (
                              {feedback.details.student?.year || 'N/A'})
                            </span>
                          </div>
                          <div className="col-12 col-sm-6">
                            <span className="text-muted d-block">Registration Code:</span>
                            <span className="font-monospace fw-bold text-navy">
                              {feedback.details.registration?.registrationCode ||
                                feedback.details.registrationCode ||
                                'N/A'}
                            </span>
                          </div>
                          <div className="col-12 mt-2 pt-2 border-top">
                            <span className="text-muted d-block">Check-In Timestamp:</span>
                            <strong className="text-success">
                              {feedback.details.checkInTime
                                ? new Date(feedback.details.checkInTime).toLocaleString()
                                : new Date().toLocaleString()}
                            </strong>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-5 text-center bg-light rounded-4 border text-muted">
                    <p className="mb-1 fw-medium text-navy">Ready to Scan</p>
                    <small>
                      Activate the camera scanner or enter a registration code to inspect attendee verification status.
                    </small>
                  </div>
                )}
              </div>

              <div className="p-3 bg-light rounded-3 border small text-charcoal mt-3">
                <span className="fw-semibold text-navy d-block mb-1">
                  Security Verification Protocol:
                </span>
                The backend validates HMAC-SHA256 signatures, token expiration, publication status, attendance windows, and registration ownership. Database-level unique constraints eliminate race-condition duplicates.
              </div>
            </div>
          </div>
        </div>

        {/* Attendee Roster Table Card */}
        <div className="card border rounded-4 bg-white shadow-xs p-4">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4 pb-2 border-bottom">
            <div>
              <h5 className="fw-bold text-navy mb-1">Verified Attendee Roster</h5>
              <small className="text-charcoal">
                Showing {filteredAttendees.length} checked-in participants for {selectedEvent?.title || 'Selected Event'}
              </small>
            </div>

            <div className="d-flex flex-wrap gap-2">
              <input
                type="text"
                className="form-control form-control-sm rounded-3"
                placeholder="Search attendee by name, code, dept..."
                style={{ width: '260px' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <button
                type="button"
                className="btn btn-outline-success btn-sm px-3 fw-medium"
                onClick={handleExportCsv}
                disabled={exportingCsv || attendanceRecords.length === 0}
              >
                {exportingCsv ? 'Exporting...' : 'Export Attendance (CSV)'}
              </button>
            </div>
          </div>

          {loadingData ? (
            <div className="py-5 text-center">
              <LoadingSpinner message="Loading attendance records..." />
            </div>
          ) : filteredAttendees.length === 0 ? (
            <div className="py-5 text-center text-muted">
              <p className="fw-semibold text-navy mb-1">No Attendance Records Found</p>
              <small>
                {searchQuery
                  ? 'No participants match the specified search query.'
                  : 'No students have checked in for this event yet. Use the scanner above to begin recording attendance.'}
              </small>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 small">
                <thead className="table-light text-navy">
                  <tr>
                    <th scope="col">Student Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Department & Year</th>
                    <th scope="col">Registration Code</th>
                    <th scope="col">Check-In Time</th>
                    <th scope="col">Method</th>
                    <th scope="col">Verified By</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendees.map((att) => (
                    <tr key={att._id}>
                      <td className="fw-semibold text-navy">{att.student?.name || 'N/A'}</td>
                      <td className="text-charcoal">{att.student?.email || 'N/A'}</td>
                      <td className="text-charcoal">
                        {att.student?.department || 'N/A'} ({att.student?.year || 'N/A'})
                      </td>
                      <td>
                        <span className="font-monospace fw-bold text-dark bg-light px-2 py-1 rounded border">
                          {att.registration?.registrationCode || 'N/A'}
                        </span>
                      </td>
                      <td className="text-charcoal">
                        {att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString() : 'N/A'}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            att.method === 'QR_SCAN'
                              ? 'bg-primary-subtle text-primary border border-primary-subtle'
                              : 'bg-secondary-subtle text-secondary border'
                          } px-2-5 py-1`}
                        >
                          {att.method === 'QR_SCAN' ? 'QR Scanner' : 'Manual Entry'}
                        </span>
                      </td>
                      <td className="text-muted">{att.markedBy?.name || 'Admin'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAttendancePage;

