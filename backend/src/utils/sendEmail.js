const nodemailer = require('nodemailer');

/**
 * Masks an email address for non-sensitive logging.
 * Example: student@eventease.edu -> s***t@eventease.edu
 */
const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return 'unknown';
  const parts = email.split('@');
  if (parts.length !== 2) return 'invalid-email';
  const name = parts[0];
  const domain = parts[1];
  const maskedName = name.length > 2
    ? `${name[0]}***${name[name.length - 1]}`
    : `${name[0]}***`;
  return `${maskedName}@${domain}`;
};

/**
 * Creates and verifies the Nodemailer SMTP transporter.
 * Returns null if SMTP configuration is unconfigured or placeholder.
 */
const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (
    !host ||
    !user ||
    !pass ||
    host === 'smtp.gmail.com' && pass === 'your_email_app_password' ||
    host === 'smtp.ethereal.email' && user === 'mock_mailer@eventease.edu'
  ) {
    // Unconfigured or placeholder environment
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

/**
 * Generates an accessible, clean HTML email body for event registration confirmation.
 */
const buildEmailHtml = ({ student, event, registration, clientUrl }) => {
  const formattedDate = event.date
    ? new Date(event.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Date to be announced';

  const eventTime = event.startTime && event.endTime
    ? `${event.startTime} - ${event.endTime}`
    : 'Schedule to be confirmed';

  const portalLink = `${clientUrl}/my-registrations`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Event Registration Confirmation - EventEase</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
          .header { background: #0f172a; padding: 24px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
          .body { padding: 32px; }
          .title { font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; background: #e0f2fe; color: #0369a1; font-size: 13px; font-weight: 600; margin-bottom: 16px; }
          .detail-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
          .detail-label { color: #64748b; font-weight: 500; }
          .detail-value { color: #0f172a; font-weight: 600; }
          .code-box { background: #0f172a; color: #ffffff; text-align: center; padding: 16px; border-radius: 8px; font-family: monospace; font-size: 20px; letter-spacing: 2px; margin: 20px 0; }
          .qr-box { text-align: center; margin: 24px 0; }
          .qr-box img { max-width: 220px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; }
          .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; text-align: center; margin-top: 12px; }
          .footer { background: #f1f5f9; padding: 16px 24px; font-size: 12px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>EventEase Campus Portal</h1>
          </div>
          <div class="body">
            <span class="badge">Registration Confirmed</span>
            <h2 class="title">${event.title}</h2>
            <p>Dear ${student.name},</p>
            <p>Your registration for <strong>${event.title}</strong> has been successfully confirmed. Please save this confirmation and present your digital QR pass at the venue during check-in.</p>
            
            <div class="detail-box">
              <div class="detail-row">
                <span class="detail-label">Event Category:</span>
                <span class="detail-value">${event.category || 'General'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span class="detail-value">${formattedDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Time:</span>
                <span class="detail-value">${eventTime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Venue:</span>
                <span class="detail-value">${event.venue}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Department:</span>
                <span class="detail-value">${student.department || 'Enrolled Student'} (${student.year || 'N/A'})</span>
              </div>
            </div>

            <p style="margin-bottom: 6px; font-weight: 600;">Your Official Registration Code:</p>
            <div class="code-box">${registration.registrationCode}</div>

            <div class="qr-box">
              <p style="font-size: 13px; color: #64748b; margin-bottom: 8px;">Scan this official QR Digital Pass at the venue entrance:</p>
              <img src="cid:qrPassImage" alt="EventEase Digital QR Pass" />
            </div>

            <div style="text-align: center; margin-top: 20px;">
              <a href="${portalLink}" class="btn">View in Student Portal</a>
            </div>
          </div>
          <div class="footer">
            This is an automated notification from EventEase. Please do not reply directly to this email.
          </div>
        </div>
      </body>
    </html>
  `;
};

/**
 * Dispatches an event registration confirmation email asynchronously.
 *
 * Architecture Note on In-Process Background Delivery:
 * This function is dispatched via setImmediate after the database transaction has committed.
 * It is completely decoupled from the HTTP response to avoid blocking client requests.
 * Limitation: Because delivery runs in-process, if the Node.js process terminates ungracefully
 * during transmission, the email job may not complete. In large-scale production deployments,
 * a durable task broker (e.g. BullMQ / Redis or AWS SQS) is recommended.
 *
 * @param {Object} params
 * @param {Object} params.student - User document
 * @param {Object} params.event - Event document
 * @param {Object} params.registration - Registration document
 * @param {Buffer} [params.qrBuffer] - Binary PNG Buffer of the signed QR code
 */
const sendRegistrationEmail = async ({ student, event, registration, qrBuffer }) => {
  try {
    const transporter = createTransporter();
    const masked = maskEmail(student?.email);

    if (!transporter) {
      // Clean fallback: non-sensitive logging when SMTP is unconfigured or in development
      console.log(`[Email Service] SMTP unconfigured or using placeholders. Simulated confirmation for registration ${registration.registrationCode} to ${masked}`);
      return { success: true, simulated: true };
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const sender = process.env.EMAIL_FROM || 'EventEase Campus Portal <noreply@eventease.edu>';

    const mailOptions = {
      from: sender,
      to: student.email,
      subject: `Registration Confirmed: ${event.title} [${registration.registrationCode}]`,
      html: buildEmailHtml({ student, event, registration, clientUrl }),
      attachments: qrBuffer
        ? [
            {
              filename: `eventease-pass-${registration.registrationCode}.png`,
              content: qrBuffer,
              cid: 'qrPassImage'
            }
          ]
        : []
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Service] Confirmation dispatched successfully via SMTP to ${masked} for registration ${registration.registrationCode} (MessageId: ${info.messageId})`);
    return { success: true, simulated: false, messageId: info.messageId };
  } catch (error) {
    // Explicit, safe error handling: never exposes passwords, tokens, or email bodies
    const masked = maskEmail(student?.email);
    console.error(`[Email Service Error] Failed to dispatch confirmation to ${masked} for ${registration.registrationCode}: ${error.message}`);
    return { success: false, simulated: false, error: error.message };
  }
};

/**
 * Fire-and-forget helper that queues registration email delivery on the next event loop tick.
 * Protects against unhandled promise rejections and guarantees zero latency on the HTTP response.
 */
const queueRegistrationEmailAsync = (params) => {
  setImmediate(() => {
    sendRegistrationEmail(params).catch((err) => {
      console.error(`[Email Service Exception] Unexpected asynchronous error: ${err.message}`);
    });
  });
};

/**
 * Generates an accessible, clean HTML email body for certificate awards.
 */
const buildCertificateEmailHtml = ({ student, event, certificate, clientUrl }) => {
  const formattedEventDate = event?.date
    ? new Date(event.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Date to be announced';

  const formattedIssueDate = certificate?.issuedAt
    ? new Date(certificate.issuedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : new Date().toLocaleDateString('en-US');

  const baseClientUrl = (clientUrl || process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const verifyUrl = `${baseClientUrl}/verify-certificate/${encodeURIComponent(certificate?.certificateId || '')}`;
  const portalUrl = `${baseClientUrl}/my-certificates`;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>Certificate of Participation - EventEase</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
        .card { background-color: #ffffff; max-width: 600px; margin: 0 auto; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background-color: #0f172a; padding: 28px 24px; text-align: center; }
        .header h1 { color: #ffffff; font-size: 22px; margin: 0 0 6px; }
        .header p { color: #d97706; font-size: 13px; font-weight: 600; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
        .content { padding: 30px 24px; }
        .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
        .lead { font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 20px; }
        .cert-box { background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; margin-bottom: 20px; }
        .cert-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
        .cert-label { color: #64748b; font-weight: 500; }
        .cert-value { color: #0f172a; font-weight: 700; }
        .cert-id { font-family: monospace; color: #1e40af; }
        .attachment-note { background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #166534; margin-bottom: 24px; }
        .btn-container { text-align: center; margin-bottom: 24px; }
        .btn { display: inline-block; background-color: #1e40af; color: #ffffff; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 6px; text-decoration: none; }
        .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px; text-align: center; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <p>Official EventEase Credential Award</p>
          <h1>Certificate of Participation</h1>
        </div>
        <div class="content">
          <div class="greeting">Congratulations, ${student?.name || 'Participant'}!</div>
          <p class="lead">
            We are pleased to award your official <strong>Certificate of Participation</strong> for attending and successfully completing <strong>"${event?.title || 'Campus Event'}"</strong>.
          </p>

          <div class="cert-box">
            <div class="cert-row">
              <span class="cert-label">Event:</span>
              <span class="cert-value">${event?.title || 'Campus Event'}</span>
            </div>
            <div class="cert-row">
              <span class="cert-label">Date:</span>
              <span class="cert-value">${formattedEventDate}</span>
            </div>
            <div class="cert-row">
              <span class="cert-label">Certificate ID:</span>
              <span class="cert-value cert-id">${certificate?.certificateId || 'N/A'}</span>
            </div>
            <div class="cert-row" style="margin-bottom: 0;">
              <span class="cert-label">Issued On:</span>
              <span class="cert-value">${formattedIssueDate}</span>
            </div>
          </div>

          <div class="attachment-note">
            <strong>PDF Attached:</strong> Your high-resolution certificate PDF is attached to this email for direct downloading and printing.
          </div>

          <div class="btn-container">
            <a href="${verifyUrl}" class="btn" style="color: #ffffff;">Verify Certificate Online</a>
          </div>

          <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 0;">
            You can also access, view, and download all your certificates anytime from the <a href="${portalUrl}" style="color: #1e40af; font-weight: 600;">My Certificates</a> portal.
          </p>
        </div>
        <div class="footer">
          EventEase Campus Event Management System &bull; Automated notification, please do not reply.
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Dispatches a certificate award email asynchronously with an attached PDF buffer.
 *
 * @param {Object} params
 * @param {Object} params.student - User document or plain object containing student email
 * @param {Object} params.event - Event document or plain object
 * @param {Object} params.certificate - Certificate document or plain object
 * @param {Buffer} params.pdfBuffer - Binary Buffer of the generated PDF certificate
 */
const sendCertificateEmail = async ({ student, event, certificate, pdfBuffer }) => {
  try {
    const transporter = createTransporter();
    const masked = maskEmail(student?.email);

    if (!transporter) {
      // Simulation mode when SMTP is unconfigured or using placeholders
      console.log(
        `[Email Service] SMTP unconfigured or using placeholders. Simulated certificate email dispatch for ${certificate?.certificateId} to ${masked} (Simulation only - not sent via SMTP)`
      );
      return { success: true, simulated: true, messageId: null };
    }

    const clientUrl = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const sender = process.env.EMAIL_FROM || 'EventEase Campus Portal <noreply@eventease.edu>';
    const filename = `EventEase-Certificate-${certificate?.certificateId || 'award'}.pdf`;

    const mailOptions = {
      from: sender,
      to: student.email,
      subject: `Official Certificate of Participation: ${event?.title || 'Event'} [${certificate?.certificateId || 'ID'}]`,
      html: buildCertificateEmailHtml({ student, event, certificate, clientUrl }),
      attachments: pdfBuffer
        ? [
            {
              filename,
              content: pdfBuffer,
              contentType: 'application/pdf'
            }
          ]
        : []
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(
      `[Email Service] Certificate email dispatched via SMTP to ${masked} for certificate ${certificate?.certificateId} (MessageId: ${info.messageId})`
    );
    return { success: true, simulated: false, messageId: info.messageId };
  } catch (error) {
    const masked = maskEmail(student?.email);
    console.error(
      `[Email Service Error] Failed to dispatch certificate email to ${masked} for ${certificate?.certificateId}: ${error.message}`
    );
    return { success: false, simulated: false, error: error.message };
  }
};

/**
 * Fire-and-forget helper that queues certificate email delivery on the next event loop tick.
 * Generates the PDF Buffer inside the background task and handles errors safely.
 */
const queueCertificateEmailAsync = ({ student, event, certificate, pdfBuffer }) => {
  setImmediate(async () => {
    try {
      let finalBuffer = pdfBuffer;
      if (!finalBuffer) {
        try {
          const { generateCertificatePdf } = require('./generateCertificatePdf');
          finalBuffer = await generateCertificatePdf({ certificate, student, event });
        } catch (pdfErr) {
          console.error(
            `[Email Service Error] Failed to generate PDF buffer for certificate ${certificate?.certificateId}: ${pdfErr.message}`
          );
          return;
        }
      }

      await sendCertificateEmail({
        student,
        event,
        certificate,
        pdfBuffer: finalBuffer
      });
    } catch (err) {
      console.error(
        `[Email Service Exception] Unexpected asynchronous error for certificate ${certificate?.certificateId}: ${err.message}`
      );
    }
  });
};

module.exports = {
  sendRegistrationEmail,
  queueRegistrationEmailAsync,
  sendCertificateEmail,
  queueCertificateEmailAsync,
  buildCertificateEmailHtml,
  maskEmail
};

