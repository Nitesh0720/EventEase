import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="container py-5 text-center min-vh-50 d-flex flex-column align-items-center justify-content-center">
      <div className="display-1 fw-bold text-primary mb-2">404</div>
      <h2 className="fw-bold text-navy mb-3">Page Not Found</h2>
      <p className="text-charcoal max-w-500 mb-4">
        The requested resource is not available on EventEase. Please return to
        the main portal or check out ongoing campus events.
      </p>
      <Link to="/" className="btn btn-primary px-4 py-2 fw-semibold">
        Return to Home
      </Link>
    </div>
  );
};

export default NotFoundPage;

