import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyCertificates, downloadCertificate } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const StudentCertificatesPage = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getMyCertificates();
      if (res.success && Array.isArray(res.certificates)) {
        setCertificates(res.certificates);
      }
    } catch (err) {
      console.error('Error fetching student certificates:', err);
      setError(err.response?.data?.message || 'Failed to load your certificates');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (certId, certCode, eventTitle) => {
    setDownloadingId(certId);
    try {
      const safeTitle = (eventTitle || 'Event')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 30);
      await downloadCertificate(certId, `EventEase-${safeTitle}-${certCode}.pdf`);
    } catch (err) {
      console.error('Download error:', err);
      window.alert('Failed to download certificate PDF. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="container py-4 min-vh-75">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 pb-3 border-bottom">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1 small text-muted">
              <li className="breadcrumb-item"><Link to="/">Home</Link></li>
              <li className="breadcrumb-item active" aria-current="page">My Certificates</li>
            </ol>
          </nav>
          <h1 className="h3 fw-bold text-navy mb-0">My Certificates</h1>
          <p className="text-muted small mb-0">
            Official verified certificates of participation awarded for completed campus events.
          </p>
        </div>

        <Link to="/events" className="btn btn-outline-primary btn-sm fw-semibold">
          Browse More Events
        </Link>
      </div>

      {/* Error Feedback */}
      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center mb-4" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={fetchCertificates}>
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="py-5 text-center">
          <LoadingSpinner message="Loading your earned certificates..." />
        </div>
      ) : certificates.length === 0 ? (
        /* Empty State */
        <div className="card border-0 shadow-sm text-center py-5">
          <div className="card-body">
            <div className="badge bg-primary-subtle text-primary px-3 py-2 mb-3 fw-semibold">
              No Certificates Yet
            </div>
            <h4 className="fw-bold text-navy mb-2">You Have No Certificates Issued</h4>
            <p className="text-muted small max-w-500 mx-auto mb-4">
              Certificates are awarded to registered students after attending an event and completing check-in.
              Once the event concludes, your official certificate will appear here for instant download.
            </p>
            <div className="d-flex justify-content-center gap-2">
              <Link to="/my-registrations" className="btn btn-outline-primary btn-sm fw-semibold">
                View My Registrations
              </Link>
              <Link to="/events" className="btn btn-primary btn-sm fw-semibold">
                Explore Upcoming Events
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* Certificates Grid */
        <div className="row g-4">
          {certificates.map((cert) => {
            const event = cert.event || {};
            const eventDateFormatted = event.date
              ? new Date(event.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })
              : 'Date to be announced';

            const issueDateFormatted = cert.issuedAt
              ? new Date(cert.issuedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })
              : 'N/A';

            return (
              <div key={cert._id} className="col-12 col-md-6 col-lg-4">
                <div className="card border-0 shadow-sm h-100 position-relative overflow-hidden">
                  {/* Decorative Top Accent */}
                  <div style={{ height: '5px', backgroundColor: '#d97706' }}></div>

                  <div className="card-body p-4 d-flex flex-column justify-content-between">
                    <div>
                      {/* Category Badge & Status */}
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="badge bg-light text-navy border small">
                          {event.category || 'Participation'}
                        </span>
                        <span className="badge bg-success-subtle text-success small fw-semibold">
                          Verified
                        </span>
                      </div>

                      {/* Event Title */}
                      <h5 className="fw-bold text-navy mb-2 line-clamp-2">
                        {event.title || 'Campus Event'}
                      </h5>

                      {/* Event Details */}
                      <div className="small text-muted mb-3">
                        <div className="mb-1">
                          <strong>Date:</strong> {eventDateFormatted}
                        </div>
                        {event.venue && (
                          <div className="mb-1">
                            <strong>Venue:</strong> {event.venue}
                          </div>
                        )}
                        {event.organizer && (
                          <div>
                            <strong>Organizer:</strong> {event.organizer}
                          </div>
                        )}
                      </div>

                      {/* Certificate Metadata Box */}
                      <div className="p-3 bg-light rounded-3 border mb-3 small">
                        <div className="d-flex justify-content-between mb-1">
                          <span className="text-muted">Certificate ID:</span>
                          <span className="fw-bold text-navy font-monospace">{cert.certificateId}</span>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">Issued On:</span>
                          <span className="fw-semibold text-muted">{issueDateFormatted}</span>
                        </div>
                      </div>
                    </div>

                    {/* Download Button */}
                    <button
                      type="button"
                      className="btn btn-primary w-100 fw-semibold d-flex align-items-center justify-content-center gap-2"
                      onClick={() => handleDownload(cert._id, cert.certificateId, event.title)}
                      disabled={downloadingId === cert._id}
                    >
                      {downloadingId === cert._id ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          <span>Preparing PDF...</span>
                        </>
                      ) : (
                        <span>Download Certificate (PDF)</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentCertificatesPage;

