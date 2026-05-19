import { useState, useEffect } from 'react';
import { getNotifications, markAllAsRead, markAsRead } from '../services/notificationService';
import { PageSpinner } from '../components/ui/Spinner';
import Pagination from '../components/ui/Pagination';
import { formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await getNotifications({ page });
      setNotifications(res.data.notifications);
      setPagination(res.data.pagination);
    } catch { toast.error('Failed to load notifications'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchNotifications(); }, [page]);

  const handleMarkAllRead = async () => {
    try { await markAllAsRead(); toast.success('All marked as read'); fetchNotifications(); }
    catch { toast.error('Failed to update notifications'); }
  };

  const handleMarkRead = async (id) => {
    try { await markAsRead(id); fetchNotifications(); } catch {}
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="bg-white min-h-screen">
      <div className="container-page py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-ink-deep" style={{ letterSpacing: '-0.5px' }}>Notifications</h1>
            {unreadCount > 0 && <p className="text-sm text-slate mt-1">{unreadCount} unread</p>}
          </div>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="btn-ghost text-sm">Mark all read</button>
          )}
        </div>

        {loading ? <PageSpinner /> : notifications.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-4xl mb-4">🔔</p>
            <p className="text-base font-medium text-ink-deep">No notifications yet</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            {notifications.map((n, i) => (
              <div
                key={n._id}
                onClick={() => !n.isRead && handleMarkRead(n._id)}
                className={`px-5 py-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                  i < notifications.length - 1 ? 'border-b border-hairline-soft' : ''
                } ${n.isRead ? '' : 'bg-tint-sky/30'}`}
              >
                <div className="flex items-start gap-3">
                  {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
                  {n.isRead && <div className="w-2 h-2 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-deep">{n.title}</p>
                    <p className="text-sm text-slate mt-0.5">{n.message}</p>
                  </div>
                  <span className="text-xs text-steel flex-shrink-0">{formatDate(n.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>
    </div>
  );
};

export default NotificationsPage;
