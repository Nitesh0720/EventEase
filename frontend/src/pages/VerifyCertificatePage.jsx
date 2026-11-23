import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { verifyCertificate } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const VerifyCertificatePage = () => {
  const { certificateId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isValid, setIsValid] = useState(null);

  useEffect(() => {
    if (certificateId) {
      checkVerification(certificateId);
    } else {
      setLoading(false);
      setIsValid(false);
      setError('No certificate identifier provided');
    }
  }, [certificateId]);

  const checkVerification = async (code) => {
    setLoading(true);
    setError('');
    try {
      const res = await verifyCertificate(code);
      if (res.success && res.valid) {
        setData(res);
        setIsValid(true);
      } else {
        setIsValid(false);
        setError(res.message || 'Invalid or unrecognized certificate ID');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setIsValid(false);
      setError(
        err.response?.data?.message || 'Certificate verification failed. The provided ID may be invalid or not found.'
      );
    } finally {
      setLoading(false);
    }
  };

  const formattedEventDate = data?.eventDate
    ? new Date(data.eventDate).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : 'N/A';

  const formattedIssueDate = data?.issuedAt
    ? new Date(data.issuedAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : 'N/A';

  return (
    <div className="container py-5 min-vh-75 d-flex align-items-center justify-content-center">
      <div className="w-100 max-w-600">
        <div className="card border-0 shadow-lg rounded-4 overflow-hidden">
          {/* Header Band */}
          <div
            className={`p-4 text-center text-white ${
              loading ? 'bg-secondary' : isValid ? 'bg-navy' : 'bg-danger'
            }`}
          >
            <div className="small text-uppercase fw-bold text-white-50 letter-spacing-1 mb-1">
              EventEase Certificate Verification
            </div>
            <h2 className="h4 fw-bold mb-0">Official Credential Validation</h2>
          </div>

          <div className="card-body p-4 p-md-5">
            {loading ? (
              <div className="py-4 text-center">
                <LoadingSpinner message="Validating certificate against campus registry..." />
              </div>
            ) : isValid ? (
              /* Verified / Valid State */
              <div>
                {/* Status Badge */}
                <div className="text-center mb-4">
                  <div className="d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill bg-success-subtle text-success fw-bold small">
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Officially Verified Certificate</span>
                  </div>
                  <div className="mt-2 text-muted small">
                    This certificate of participation has been verified by the institutional authority.
                  </div>
                </div>

                {/* Credential Data Table */}
                <div className="p-3 bg-light rounded-3 border mb-4">
                  <div className="row g-3 small">
                    <div className="col-12 border-bottom pb-2">
                      <span className="text-muted d-block">Certificate ID</span>
                      <strong className="text-navy font-monospace fs-6">{data?.certificateId}</strong>
                    </div>

                    <div className="col-12 border-bottom pb-2">
                      <span className="text-muted d-block">Awarded To (Participant)</span>
                      <strong className="text-navy fs-6">{data?.studentName}</strong>
                    </div>

                    <div className="col-12 border-bottom pb-2">
                      <span className="text-muted d-block">Event Title</span>
                      <strong className="text-navy">{data?.eventTitle}</strong>
                    </div>

                    <div className="col-sm-6">
                      <span className="text-muted d-block">Event Date</span>
                      <span className="fw-semibold text-navy">{formattedEventDate}</span>
                    </div>

                    <div className="col-sm-6">
                      <span className="text-muted d-block">Issued On</span>
                      <span className="fw-semibold text-navy">{formattedIssueDate}</span>
                    </div>
                  </div>
                </div>

                <div className="text-center small text-muted">
                  Issued under the authority of EventEase Campus Event Management System.
                </div>
              </div>
            ) : (
              /* Invalid State */
              <div className="text-center py-2">
                <div className="d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill bg-danger-subtle text-danger fw-bold small mb-3">
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Verification Failed</span>
                </div>

                <h5 className="fw-bold text-navy mb-2">Unrecognized Certificate</h5>
                <p className="text-muted small mb-4">
                  {error || 'The certificate identifier provided does not match any valid record in the EventEase registry.'}
                </p>

                {certificateId && (
                  <div className="p-2 bg-light border rounded font-monospace small text-muted mb-4">
                    Target ID: {certificateId}
                  </div>
                )}
              </div>
            )}

            {/* Back Home Button */}
            <div className="d-flex justify-content-center mt-4 pt-2 border-top">
              <Link to="/" className="btn btn-outline-secondary btn-sm fw-semibold">
                Back to Campus Portal
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyCertificatePage;

