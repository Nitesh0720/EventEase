import axios from 'axios';

// Create a pre-configured Axios client instance
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach JWT token if available in localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('eventease_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/* ==========================================================================
   AUTHENTICATION API CALLS
   ========================================================================== */

export const registerStudent = async (userData) => {
  const response = await apiClient.post('/auth/register', userData);
  return response.data;
};

export const loginUser = async (credentials) => {
  const response = await apiClient.post('/auth/login', credentials);
  return response.data;
};

export const getUserProfile = async () => {
  const response = await apiClient.get('/auth/profile');
  return response.data;
};

/* ==========================================================================
   EVENT MANAGEMENT API CALLS (MODULE 3)
   ========================================================================== */

/**
 * Fetch events.
 * Public/Students receive Published events.
 * Admins receive all events (or filtered by status).
 * @param {Object} params - { status, category, search }
 */
export const fetchEvents = async (params = {}) => {
  const response = await apiClient.get('/events', { params });
  return response.data;
};

/**
 * Fetch a single event by ID
 * @param {string} id
 */
export const fetchEventById = async (id) => {
  const response = await apiClient.get(`/events/${id}`);
  return response.data;
};

/**
 * Create a new event (Admin only)
 * @param {Object} eventData
 */
export const createEvent = async (eventData) => {
  const response = await apiClient.post('/events', eventData);
  return response.data;
};

/**
 * Update existing event details (Admin only)
 * @param {string} id
 * @param {Object} eventData
 */
export const updateEvent = async (id, eventData) => {
  const response = await apiClient.put(`/events/${id}`, eventData);
  return response.data;
};

/**
 * Update event status between Draft, Published, and Cancelled (Admin only)
 * @param {string} id
 * @param {string} status - 'Draft' | 'Published' | 'Cancelled'
 */
export const updateEventStatus = async (id, status) => {
  const response = await apiClient.patch(`/events/${id}/status`, { status });
  return response.data;
};

/**
 * Soft delete an event by transitioning its status to Cancelled (Admin only)
 * @param {string} id
 */
export const deleteEvent = async (id) => {
  const response = await apiClient.delete(`/events/${id}`);
  return response.data;
};

/* ==========================================================================
   EVENT REGISTRATION API CALLS (MODULE 5)
   ========================================================================== */

/**
 * Register student for an event (Student only)
 * @param {string} eventId
 */
export const registerForEvent = async (eventId) => {
  const response = await apiClient.post(`/registrations/${eventId}`);
  return response.data;
};

/**
 * Cancel a student's registration (Student only)
 * @param {string} registrationId
 * @param {string} reason
 */
export const cancelRegistration = async (registrationId, reason = '') => {
  const response = await apiClient.delete(`/registrations/${registrationId}`, {
    data: { reason }
  });
  return response.data;
};

/**
 * Retrieve current student's registered events (Student only)
 */
export const getMyRegistrations = async () => {
  const response = await apiClient.get('/registrations/my');
  return response.data;
};

/**
 * Check if the current student is registered for a specific event
 * @param {string} eventId
 */
export const checkEventRegistration = async (eventId) => {
  const response = await apiClient.get(`/registrations/check/${eventId}`);
  return response.data;
};

/**
 * Retrieve verified QR digital pass for a confirmed registration (Module 6)
 * @param {string} registrationId
 */
export const fetchDigitalPass = async (registrationId) => {
  const response = await apiClient.get(`/registrations/${registrationId}/pass`);
  return response.data;
};

/* ==========================================================================
   ATTENDANCE MANAGEMENT API CALLS (MODULE 7 - ADMIN ONLY)
   ========================================================================== */

/**
 * Record event attendance via scanned QR pass token (Admin only)
 * @param {string} eventId
 * @param {string} token
 */
export const scanAttendanceQr = async (eventId, token) => {
  const response = await apiClient.post('/attendance/scan', { eventId, token });
  return response.data;
};

/**
 * Record event attendance via manual registration code entry (Admin only)
 * @param {string} eventId
 * @param {string} registrationCode
 */
export const manualAttendanceCheckIn = async (eventId, registrationCode) => {
  const response = await apiClient.post('/attendance/manual', {
    eventId,
    registrationCode
  });
  return response.data;
};

/**
 * Fetch attendee check-in records for an event (Admin only)
 * @param {string} eventId
 * @param {Object} params - { search }
 */
export const fetchEventAttendance = async (eventId, params = {}) => {
  const response = await apiClient.get(`/attendance/event/${eventId}`, { params });
  return response.data;
};

/**
 * Fetch attendance metrics, counts, and check-in percentage (Admin only)
 * @param {string} eventId
 */
export const fetchEventAttendanceStats = async (eventId) => {
  const response = await apiClient.get(`/attendance/event/${eventId}/stats`);
  return response.data;
};

/**
 * Download attendance roster as an RFC 4180 CSV attachment (Admin only)
 * @param {string} eventId
 */
export const exportEventAttendanceCsv = async (eventId) => {
  const response = await apiClient.get(`/attendance/event/${eventId}/export`, {
    responseType: 'blob'
  });
  return response.data;
};

/* ==========================================================================
   CERTIFICATE MANAGEMENT API CALLS (MODULE 8)
   ========================================================================== */

/**
 * Generate an individual certificate for an attended student (Admin only)
 * @param {string} eventId
 * @param {string} studentId
 * @param {boolean} [sendEmail=false] - Whether to email the PDF certificate to the student
 */
export const generateCertificate = async (eventId, studentId, sendEmail = false) => {
  const response = await apiClient.post('/certificates/generate', {
    eventId,
    studentId,
    sendEmail: Boolean(sendEmail)
  });
  return response.data;
};

/**
 * Bulk generate certificates for all eligible attendees (Admin only)
 * @param {string} eventId
 * @param {boolean} [sendEmail=false] - Whether to email PDF certificates to newly issued attendees
 */
export const generateBulkCertificates = async (eventId, sendEmail = false) => {
  const response = await apiClient.post('/certificates/generate-bulk', {
    eventId,
    sendEmail: Boolean(sendEmail)
  });
  return response.data;
};

/**
 * Fetch certificates issued for an event (Admin only)
 * @param {string} eventId
 */
export const getEventCertificates = async (eventId) => {
  const response = await apiClient.get(`/certificates/event/${eventId}`);
  return response.data;
};

/**
 * Fetch authenticated student's certificates (Student only)
 */
export const getMyCertificates = async () => {
  const response = await apiClient.get('/certificates/my-certificates');
  return response.data;
};

/**
 * Download certificate PDF blob and trigger browser download
 * Accessible to Admin or owning Student
 * @param {string} certificateId - MongoDB ObjectId of the Certificate document
 * @param {string} [customFilename] - Optional custom filename for the saved PDF
 */
export const downloadCertificate = async (certificateId, customFilename) => {
  const response = await apiClient.get(`/certificates/${certificateId}/download`, {
    responseType: 'blob'
  });

  // Extract filename from Content-Disposition header if available
  let filename = customFilename;
  if (!filename) {
    const disposition = response.headers['content-disposition'];
    if (disposition) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }
  }
  if (!filename) {
    filename = `EventEase-Certificate-${certificateId}.pdf`;
  }

  // Create temporary Blob URL, trigger click, and revoke URL
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(downloadUrl);

  return { success: true, filename };
};

/**
 * Public certificate verification (No authentication required)
 * @param {string} certificateId - Unique certificate code (e.g. CERT-2026-XXXX-XXXX)
 */
export const verifyCertificate = async (certificateId) => {
  const response = await apiClient.get(`/certificates/verify/${encodeURIComponent(certificateId)}`);
  return response.data;
};

/* ==========================================================================
   HEALTH CHECK API CALL
   ========================================================================== */

export const checkBackendHealth = async () => {
  try {
    const response = await apiClient.get('/health');
    return response.data;
  } catch (error) {
    console.error('Backend health check error:', error.message);
    throw error;
  }
};

export default apiClient;
