/**
 * Notification Banner Component
 *
 * Displays connection timeout, language prompt, and error messages
 */

import React from 'react';

export type NotificationType = 'error' | 'warning' | 'info' | 'success';

interface NotificationBannerProps {
  type: NotificationType;
  message: string;
  isVisible: boolean;
  onClose?: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  type,
  message,
  isVisible,
  onClose,
  actionLabel,
  onAction,
}) => {
  if (!isVisible) {
    return null;
  }

  const bgColors = {
    error: 'bg-red-600',
    warning: 'bg-yellow-600',
    info: 'bg-blue-600',
    success: 'bg-green-600',
  };

  const icons = {
    error: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
    ),
    success: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    ),
  };

  return (
    <div
      data-testid="notification-banner"
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 ${bgColors[type]} text-white px-6 py-4 rounded-lg shadow-2xl z-[999999] max-w-lg flex items-center space-x-3`}
    >
      {/* Icon */}
      <div className="flex-shrink-0">{icons[type]}</div>

      {/* Message */}
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
      </div>

      {/* Action Button */}
      {actionLabel && onAction && (
        <button
          data-testid="retry-connection"
          onClick={onAction}
          className="flex-shrink-0 bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded text-sm font-medium transition-colors"
        >
          {actionLabel}
        </button>
      )}

      {/* Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 text-white hover:text-gray-200 transition-colors"
          aria-label="Close notification"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

export default NotificationBanner;
