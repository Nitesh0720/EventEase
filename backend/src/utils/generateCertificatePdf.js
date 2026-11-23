const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

/**
 * EventEase Module 8: PDF Certificate Generation Utility
 * File: backend/src/utils/generateCertificatePdf.js
 *
 * Generates an institutional-grade Certificate of Participation in landscape A4 format.
 * Embeds a verification QR code pointing to the public certificate verification page.
 *
 * @param {Object} params
 * @param {Object} params.certificate - Certificate document or plain object
 * @param {string} params.certificate.certificateId - Unique certificate ID (e.g. CERT-2026-XXXX-XXXX)
 * @param {Date|string} [params.certificate.issuedAt] - Issuance date
 * @param {Object} params.student - Student User document or plain object
 * @param {string} params.student.name - Student's full name
 * @param {string} [params.student.department] - Academic department
 * @param {string} [params.student.year] - Academic year
 * @param {Object} params.event - Event document or plain object
 * @param {string} params.event.title - Event title
 * @param {Date|string} [params.event.date] - Event date
 * @param {string} [params.event.venue] - Campus venue
 * @param {string} [params.event.organizer] - Organizing department or club
 * @returns {Promise<Buffer>} Generated PDF binary Buffer
 */
const generateCertificatePdf = async ({ certificate, student, event }) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!certificate || typeof certificate !== 'object') {
        return reject(new Error('Certificate data is required for PDF generation'));
      }

      // Safe field resolution with graceful fallbacks
      const certificateId = (certificate.certificateId || '').trim() || 'CERT-UNASSIGNED';
      const studentName = (student?.name || '').trim() || 'Valued Participant';
      const eventTitle = (event?.title || '').trim() || 'Campus Event';

      // Department & Academic Year line
      const dept = (student?.department || '').trim();
      const year = (student?.year || '').trim();
      let deptYearStr = '';
      if (dept && year) {
        deptYearStr = `${dept} | ${year}`;
      } else if (dept) {
        deptYearStr = dept;
      } else if (year) {
        deptYearStr = year;
      }

      // Event Date formatting
      let eventDateFormatted = '';
      if (event?.date) {
        const d = new Date(event.date);
        if (!isNaN(d.getTime())) {
          eventDateFormatted = d.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        }
      }

      // Venue formatting
      const venueStr = (event?.venue || '').trim();

      // Combined Event Details line
      const metaParts = [];
      if (eventDateFormatted) metaParts.push(`Held on: ${eventDateFormatted}`);
      if (venueStr) metaParts.push(`Venue: ${venueStr}`);
      const eventMetaLine = metaParts.join('   •   ');

      // Organizer line
      const organizerStr = (event?.organizer || '').trim();
      const organizerLine = organizerStr ? `Organized by: ${organizerStr}` : '';

      // Issue date formatting
      let formattedIssueDate = '';
      const issuedAtDate = certificate.issuedAt ? new Date(certificate.issuedAt) : new Date();
      if (!isNaN(issuedAtDate.getTime())) {
        formattedIssueDate = issuedAtDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      } else {
        formattedIssueDate = new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }

      // Verification URL for QR code
      const clientUrl = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/+$/, '');
      const verificationUrl = `${clientUrl}/verify-certificate/${encodeURIComponent(certificateId)}`;

      // Generate verification QR code as a PNG Buffer
      const qrBuffer = await QRCode.toBuffer(verificationUrl, {
        errorCorrectionLevel: 'M',
        type: 'png',
        margin: 1,
        width: 180,
        color: {
          dark: '#0f172a', // Navy matching EventEase theme
          light: '#ffffff'
        }
      });

      // Initialize PDFDocument in landscape A4 (841.89 x 595.28 points)
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 0,
        info: {
          Title: `EventEase Certificate - ${eventTitle}`,
          Author: 'EventEase Campus Event Portal',
          Subject: `Certificate of Participation for ${studentName}`,
          Keywords: 'certificate, eventease, participation, verification'
        }
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', (err) => {
        reject(err);
      });

      const pageWidth = doc.page.width;   // 841.89 points
      const pageHeight = doc.page.height; // 595.28 points

      // -----------------------------------------------------------------------
      // 1. Decorative Borders (Collegiate double-frame)
      // -----------------------------------------------------------------------
      // Outer Navy Frame
      doc
        .rect(20, 20, pageWidth - 40, pageHeight - 40)
        .lineWidth(3.5)
        .strokeColor('#0f172a')
        .stroke();

      // Inner Gold Accent Frame
      doc
        .rect(27, 27, pageWidth - 54, pageHeight - 54)
        .lineWidth(1)
        .strokeColor('#d97706')
        .stroke();

      // Subtle Slate Guide Frame
      doc
        .rect(30, 30, pageWidth - 60, pageHeight - 60)
        .lineWidth(0.5)
        .strokeColor('#cbd5e1')
        .stroke();

      // Corner geometric accents
      const cornerSize = 4;
      const cornerOffsets = [
        [27, 27],
        [pageWidth - 27 - cornerSize, 27],
        [27, pageHeight - 27 - cornerSize],
        [pageWidth - 27 - cornerSize, pageHeight - 27 - cornerSize]
      ];
      doc.fillColor('#d97706');
      cornerOffsets.forEach(([cx, cy]) => {
        doc.rect(cx, cy, cornerSize, cornerSize).fill();
      });

      // -----------------------------------------------------------------------
      // 2. Institutional Header & Branding
      // -----------------------------------------------------------------------
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#1e40af')
        .text('EVENTEASE CAMPUS EVENT MANAGEMENT SYSTEM', 40, 52, {
          width: pageWidth - 80,
          align: 'center',
          characterSpacing: 2
        });

      // Gold divider bar
      doc
        .moveTo(pageWidth / 2 - 70, 72)
        .lineTo(pageWidth / 2 + 70, 72)
        .lineWidth(1.5)
        .strokeColor('#d97706')
        .stroke();

      // Main Certificate Title
      doc
        .font('Helvetica-Bold')
        .fontSize(27)
        .fillColor('#0f172a')
        .text('CERTIFICATE OF PARTICIPATION', 40, 86, {
          width: pageWidth - 80,
          align: 'center',
          characterSpacing: 1.5
        });

      // Sub-heading presentation citation
      doc
        .font('Helvetica-Oblique')
        .fontSize(13)
        .fillColor('#64748b')
        .text('This is proudly presented to', 40, 126, {
          width: pageWidth - 80,
          align: 'center'
        });

      // -----------------------------------------------------------------------
      // 3. Recipient Name & Department
      // -----------------------------------------------------------------------
      doc
        .font('Helvetica-Bold')
        .fontSize(25)
        .fillColor('#0f172a')
        .text(studentName, 40, 148, {
          width: pageWidth - 80,
          align: 'center'
        });

      // Subtle underline beneath recipient name
      const calculatedNameWidth = Math.min(doc.widthOfString(studentName) + 50, 480);
      doc
        .moveTo(pageWidth / 2 - calculatedNameWidth / 2, 178)
        .lineTo(pageWidth / 2 + calculatedNameWidth / 2, 178)
        .lineWidth(1)
        .strokeColor('#cbd5e1')
        .stroke();

      // Student Department & Year
      if (deptYearStr) {
        doc
          .font('Helvetica')
          .fontSize(11.5)
          .fillColor('#334155')
          .text(deptYearStr, 40, 188, {
            width: pageWidth - 80,
            align: 'center'
          });
      }

      // -----------------------------------------------------------------------
      // 4. Citation & Event Details
      // -----------------------------------------------------------------------
      doc
        .font('Helvetica')
        .fontSize(12.5)
        .fillColor('#475569')
        .text('for active participation and successful completion of the campus event', 40, 214, {
          width: pageWidth - 80,
          align: 'center'
        });

      // Event Title
      doc
        .font('Helvetica-Bold')
        .fontSize(20)
        .fillColor('#1e40af')
        .text(`"${eventTitle}"`, 40, 238, {
          width: pageWidth - 80,
          align: 'center'
        });

      // Event Date & Venue
      if (eventMetaLine) {
        doc
          .font('Helvetica')
          .fontSize(11)
          .fillColor('#475569')
          .text(eventMetaLine, 40, 272, {
            width: pageWidth - 80,
            align: 'center'
          });
      }

      // Organizer Citation
      if (organizerLine) {
        doc
          .font('Helvetica-Oblique')
          .fontSize(10)
          .fillColor('#64748b')
          .text(organizerLine, 40, 290, {
            width: pageWidth - 80,
            align: 'center'
          });
      }

      // -----------------------------------------------------------------------
      // 5. Verification & Signature Blocks
      // -----------------------------------------------------------------------
      const signatureLineY = 445;
      const signatureBlockWidth = 210;

      // Left Block: Event Coordinator Placeholder
      const leftColX = 65;
      doc
        .moveTo(leftColX, signatureLineY)
        .lineTo(leftColX + signatureBlockWidth, signatureLineY)
        .lineWidth(1)
        .strokeColor('#94a3b8')
        .stroke();

      doc
        .font('Helvetica-Bold')
        .fontSize(10.5)
        .fillColor('#0f172a')
        .text('Event Coordinator', leftColX, signatureLineY + 6, {
          width: signatureBlockWidth,
          align: 'center'
        });

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#64748b')
        .text('(Authorized Signatory)', leftColX, signatureLineY + 20, {
          width: signatureBlockWidth,
          align: 'center'
        });

      if (organizerStr) {
        doc
          .font('Helvetica-Oblique')
          .fontSize(8.5)
          .fillColor('#64748b')
          .text(organizerStr, leftColX, signatureLineY + 33, {
            width: signatureBlockWidth,
            align: 'center'
          });
      }

      // Center Block: Verification QR Code & Certificate Identifiers
      const qrSize = 64;
      const qrX = (pageWidth - qrSize) / 2;
      const qrY = 395;

      doc.image(qrBuffer, qrX, qrY, {
        width: qrSize,
        height: qrSize
      });

      const centerColWidth = 260;
      const centerColX = (pageWidth - centerColWidth) / 2;

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#0f172a')
        .text(`Certificate ID: ${certificateId}`, centerColX, qrY + qrSize + 5, {
          width: centerColWidth,
          align: 'center'
        });

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#64748b')
        .text(`Issued on: ${formattedIssueDate}`, centerColX, qrY + qrSize + 18, {
          width: centerColWidth,
          align: 'center'
        });

      doc
        .font('Helvetica-Oblique')
        .fontSize(7.5)
        .fillColor('#2563eb')
        .text('Scan QR to verify authenticity online', centerColX, qrY + qrSize + 30, {
          width: centerColWidth,
          align: 'center'
        });

      // Right Block: Institutional Authority Placeholder
      const rightColX = pageWidth - 65 - signatureBlockWidth;
      doc
        .moveTo(rightColX, signatureLineY)
        .lineTo(rightColX + signatureBlockWidth, signatureLineY)
        .lineWidth(1)
        .strokeColor('#94a3b8')
        .stroke();

      doc
        .font('Helvetica-Bold')
        .fontSize(10.5)
        .fillColor('#0f172a')
        .text('Institutional Authority', rightColX, signatureLineY + 6, {
          width: signatureBlockWidth,
          align: 'center'
        });

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#64748b')
        .text('(Dean / Principal / Director)', rightColX, signatureLineY + 20, {
          width: signatureBlockWidth,
          align: 'center'
        });

      doc
        .font('Helvetica-Oblique')
        .fontSize(8.5)
        .fillColor('#64748b')
        .text('EventEase Campus Certification', rightColX, signatureLineY + 33, {
          width: signatureBlockWidth,
          align: 'center'
        });

      // Finalize document stream
      doc.end();
    } catch (err) {
      reject(new Error(`Failed to generate PDF certificate: ${err.message}`));
    }
  });
};

module.exports = {
  generateCertificatePdf
};

