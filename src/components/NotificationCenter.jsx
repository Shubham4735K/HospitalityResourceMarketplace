import React, { useState, useEffect, useRef } from 'react';

const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-1',
    title: 'New Booking Request',
    message: 'Flour Power submitted a booking request for Off-Peak Artisan Bakery & Pastry Kitchen.',
    read: false,
    createdAt: '10m ago'
  },
  {
    id: 'notif-2',
    title: 'Request Accepted',
    message: 'Your request for Cold Prep & Vacuum Packaging Station has been accepted by Olive Bar & Kitchen.',
    read: false,
    createdAt: '1h ago'
  },
  {
    id: 'notif-3',
    title: 'Request Rejected',
    message: 'Your request for Banquet Hall & Event Space was rejected due to scheduling conflict.',
    read: true,
    createdAt: '1d ago'
  }
];

function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const containerRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
  };

  const handleMarkAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  // Close on click outside and on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="notification-center" ref={containerRef}>
      <button
        type="button"
        className={`notification-bell-btn ${isOpen ? 'active' : ''}`}
        onClick={toggleOpen}
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg
          className="notification-bell-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="notification-badge" aria-label={`${unreadCount} unread notifications`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-panel" role="region" aria-label="Notifications Panel">
          <div className="notification-panel-header">
            <div className="notification-panel-header-title">
              <h3 className="notification-title">Notifications</h3>
              {unreadCount > 0 && (
                <span className="badge badge-amber notification-unread-count">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {notifications.length > 0 && unreadCount > 0 && (
              <button
                type="button"
                className="notification-action-link"
                onClick={handleMarkAllAsRead}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-panel-body">
            {notifications.length > 0 ? (
              <ul className="notification-list">
                {notifications.map((item) => (
                  <li
                    key={item.id}
                    className={`notification-item ${item.read ? 'read' : 'unread'}`}
                    onClick={() => handleMarkAsRead(item.id)}
                  >
                    <div className="notification-item-indicator" aria-hidden="true" />
                    <div className="notification-item-content">
                      <div className="notification-item-header">
                        <span className="notification-item-title">{item.title}</span>
                        {item.createdAt && (
                          <span className="notification-item-time">{item.createdAt}</span>
                        )}
                      </div>
                      <p className="notification-item-message">{item.message}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="notification-empty">
                <span className="notification-empty-icon" aria-hidden="true">🔔</span>
                <p className="notification-empty-title">No notifications yet</p>
                <p className="notification-empty-subtitle">
                  We will notify you when there are updates on your resource requests.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationCenter;
