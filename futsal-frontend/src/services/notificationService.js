import api from './api';

export const getNotifications = (params) => api.get('/notifications', { params });
export const markAsRead = (id) => api.patch(`/notifications/${id}/read`);
export const markAllAsRead = () => api.patch('/notifications/read-all');
