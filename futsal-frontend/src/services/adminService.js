import api from './api';

export const getAdminStats = () => api.get('/admin/stats');
export const getAdminRevenue = (params) => api.get('/admin/revenue', { params });
export const getAdminUsers = (params) => api.get('/admin/users', { params });
export const toggleSuspendUser = (id) => api.patch(`/admin/users/${id}/suspend`);
export const deleteUser = (id) => api.delete(`/admin/users/${id}`);
export const getAdminBookings = (params) => api.get('/admin/bookings', { params });
export const getAdminPayments = (params) => api.get('/admin/payments', { params });
export const getPendingCourts = () => api.get('/admin/courts/pending');
export const adminApproveCourt = (id, isApproved) => api.patch(`/admin/courts/${id}/approve`, { isApproved });
export const restrictPhone = (phone, reason) => api.post('/admin/restrict-phone', { phone, reason });
export const getRestrictedPhones = () => api.get('/admin/restricted-phones');
