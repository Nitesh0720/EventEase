import React from 'react';
import LoadingSpinner from '../LoadingSpinner';

/**
 * DigitalPassModal Component
 * Displays verified event entry pass with event details, attendee profile,
 * and high-resolution signed QR matrix for venue attendance scanning.
 */
const DigitalPassModal = ({ show, onClose, passData, loading, error }) => {
  if (!show) return null;

  const event = passData?.event || {};
  const student = passData?.student || {};

  const formattedDate = event.date
    ? new Date(event.date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : 'Date to be announced';

  const eventSchedule = event.startTime && event.endTime
    ? `${event.startTime} - ${event.endTime}`
    : 'Schedule to be confirmed';

  // Download pass image directly to user device
  const handleDownloadPass = () => {
    if (!passData?.qrCodeDataUrl) return;

    // Create a composite canvas for an official ticket download
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 780;
    const ctx = canvas.getContext('2d');

    // Background card
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header strip (Navy)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, 90);

    // Header branding
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillText('EventEase Digital Event Pass', 30, 42);
    ctx.font = '13px Arial, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Campus Activity & Attendance Verification Portal', 30, 68);

    // Event Title & Category
    ctx.fillStyle = '#2563eb';
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillText((event.category || 'CAMPUS EVENT').toUpperCase(), 30, 125);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px Arial, sans-serif';
    const titleText = event.title && event.title.length > 36 ? event.title.substring(0, 36) + '...' : (event.title || 'Event Title');
    ctx.fillText(titleText, 30, 155);

    // Divider
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, 175);
    ctx.lineTo(570, 175);
    ctx.stroke();

    // Details Grid
    ctx.font = '12px Arial, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('DATE', 30, 205);
    ctx.fillText('TIME', 300, 205);

    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(formattedDate, 30, 225);
    ctx.fillText(eventSchedule, 300, 225);

    ctx.font = '12px Arial, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('VENUE', 30, 260);
    ctx.fillText('ATTENDEE', 300, 260);

    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(event.venue || 'Campus Venue', 30, 280);
    ctx.fillText(student.name || 'Student Attendee', 300, 280);

    // Registration Code Bar
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(30, 305, 540, 50);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`CODE: ${passData.registrationCode}`, 300, 337);
    ctx.textAlign = 'left';

    // QR Code Image
    const qrImage = new Image();
    qrImage.onload = () => {
      ctx.drawImage(qrImage, 175, 375, 250, 250);

      // Footer notice
      ctx.font = '12px Arial, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'center';
      ctx.fillText('Present this QR code at the event entrance for automated check-in.', 300, 650);
      ctx.fillText(`Pass Issued to: ${student.email || ''} | Department: ${student.department || 'Campus'}`, 300, 675);

      // Border frame
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

      // Trigger download
      const link = document.createElement('a');
      link.download = `EventEase-Pass-${passData.registrationCode}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    qrImage.src = passData.qrCodeDataUrl;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="modal show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 1060 }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
          {/* Header */}
          <div className="modal-header bg-navy text-white px-4 py-3 border-0">
            <div>
              <h5 className="modal-title fw-bold mb-0">EventEase Digital Event Pass</h5>
              <small className="text-light opacity-75">Verified Admission Credential</small>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white shadow-none"
              aria-label="Close"
              onClick={onClose}
            ></button>
          </div>

          {/* Modal Body */}
          <div className="modal-body p-4 bg-light">
            {loading ? (
              <div className="py-5 text-center">
                <LoadingSpinner message="Generating verified digital pass..." />
              </div>
            ) : error ? (
              <div className="alert alert-danger rounded-3 my-3" role="alert">
                <h6 className="fw-bold mb-1">Pass Unavailable</h6>
                <p className="mb-0 small">{error}</p>
              </div>
            ) : passData ? (
              <div className="card border rounded-4 bg-white shadow-xs p-4 p-md-5">
                {/* Event Headline */}
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 pb-3 mb-3 border-bottom">
                  <div>
                    <span className="badge bg-primary-subtle text-primary fw-semibold px-3 py-1-5 mb-2">
                      {event.category || 'General'}
                    </span>
                    <h3 className="h4 fw-bold text-navy mb-1">{event.title}</h3>
                    <div className="text-muted small">
                      Organized by: <strong className="text-navy">{event.organizer || 'Campus Department'}</strong>
                    </div>
                  </div>
                  <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-1-5 fw-semibold">
                    {passData.status}
                  </span>
                </div>

                <div className="row g-4 align-items-center">
                  {/* Event & Attendee Details */}
                  <div className="col-12 col-md-7">
                    <div className="bg-light border rounded-3 p-3 mb-3">
                      <div className="row g-2 small">
                        <div className="col-6">
                          <span className="text-muted d-block">Event Date</span>
                          <span className="fw-semibold text-navy">{formattedDate}</span>
                        </div>
                        <div className="col-6">
                          <span className="text-muted d-block">Schedule</span>
                          <span className="fw-semibold text-navy">{eventSchedule}</span>
                        </div>
                        <div className="col-12 mt-2">
                          <span className="text-muted d-block">Venue</span>
                          <span className="fw-semibold text-navy">{event.venue}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-light border rounded-3 p-3 mb-3">
                      <div className="small">
                        <span className="text-muted d-block">Registered Attendee</span>
                        <span className="fw-bold text-navy d-block">{student.name}</span>
                        <span className="text-charcoal d-block">
                          {student.department} - {student.year}
                        </span>
                        <span className="text-muted d-block small">{student.email}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-dark text-white rounded-3 text-center">
                      <small className="text-light opacity-75 d-block text-uppercase" style={{ fontSize: '11px', letterSpacing: '1px' }}>
                        Official Registration Code
                      </small>
                      <span className="font-monospace fw-bold h5 mb-0 text-white" style={{ letterSpacing: '2px' }}>
                        {passData.registrationCode}
                      </span>
                    </div>
                  </div>

                  {/* QR Code Matrix */}
                  <div className="col-12 col-md-5 text-center">
                    <div className="p-3 bg-light border rounded-4 d-inline-block shadow-xs">
                      {passData.qrCodeDataUrl ? (
                        <img
                          src={passData.qrCodeDataUrl}
                          alt={`QR Pass for ${passData.registrationCode}`}
                          className="img-fluid rounded-3"
                          style={{ maxWidth: '240px', height: 'auto' }}
                        />
                      ) : (
                        <div className="py-4 text-muted small">QR code unavailable</div>
                      )}
                    </div>
                    <div className="text-muted small mt-2">
                      Tamper-resistant HMAC signed pass. Present at entrance scanner.
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Modal Footer */}
          <div className="modal-footer bg-white px-4 py-3 border-top">
            <button
              type="button"
              className="btn btn-outline-secondary px-3 fw-medium"
              onClick={onClose}
            >
              Close
            </button>
            {passData && !error && (
              <>
                <button
                  type="button"
                  className="btn btn-outline-primary px-3 fw-medium"
                  onClick={handlePrint}
                >
                  Print Pass
                </button>
                <button
                  type="button"
                  className="btn btn-primary px-4 fw-semibold ee-btn-primary"
                  onClick={handleDownloadPass}
                >
                  Download Pass (PNG)
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DigitalPassModal;

