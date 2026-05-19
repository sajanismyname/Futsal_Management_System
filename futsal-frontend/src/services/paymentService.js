import api from './api';

export const initiatePayment = (data) => api.post('/payment/initiate', data);
export const verifyPayment = (data) => api.post('/payment/verify', data);
export const getPaymentHistory = (params) => api.get('/payment/history', { params });
export const initiateRefund = (bookingId, reason) => api.post(`/payment/refund/${bookingId}`, { reason });
