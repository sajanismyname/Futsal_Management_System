import api from './api';

export const registerUser = (data) => api.post('/auth/register', data);
export const loginUser = (data) => api.post('/auth/login', data);
export const verifyEmail = (token) => api.get(`/auth/verify-email/${token}`);
export const resendVerificationEmail = (email) => api.post('/auth/resend-verification', { email });
export const getMe = () => api.get('/auth/me');
export const updateProfile = (data) => api.put('/auth/profile', data);
export const changePassword = (data) => api.put('/auth/change-password', data);
