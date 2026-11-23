import React from 'react';

/**
 * Reusable Loading Spinner Component
 * Supports custom messages, sizes, and optional full-page overlay.
 *
 * @param {string} message - Optional text shown beneath the spinner
 * @param {string} size - 'sm' | 'md' | 'lg' (default: 'md')
 * @param {boolean} fullScreen - If true, renders a centered full-viewport overlay
 */
const LoadingSpinner = ({
  message = 'Loading...',
  size = 'md',
  fullScreen = false
}) => {
  const sizeMap = {
    sm: 'spinner-border-sm',
    md: '',
    lg: 'spinner-border-lg'
  };

  const spinnerContent = (
    <div className="d-flex flex-column align-items-center justify-content-center py-4">
      <div
        className={`spinner-border text-primary ${sizeMap[size] || ''}`}
        role="status"
        aria-hidden="true"
        style={size === 'lg' ? { width: '3rem', height: '3rem' } : {}}
      >
        <span className="visually-hidden">Loading...</span>
      </div>
      {message && (
        <p className="mt-3 text-secondary small fw-medium mb-0 tracking-wide">
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75 z-3"
        style={{ backdropFilter: 'blur(3px)' }}
      >
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
};

export default LoadingSpinner;

