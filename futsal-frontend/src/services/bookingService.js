import api from './api';

export const createBooking = (data) => api.post('/bookings', data);
export const getBookings = (params) => api.get('/bookings', { params });
export const getBooking = (id) => api.get(`/bookings/${id}`);
export const cancelBooking = (id, reason) => api.delete(`/bookings/${id}`, { data: { reason } });
export const getAvailableSlots = (courtId, date) => api.get(`/bookings/slots/${courtId}`, { params: { date } });
