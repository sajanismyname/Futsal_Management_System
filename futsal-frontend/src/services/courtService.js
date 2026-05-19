import api from './api';

export const getCourts = (params) => api.get('/courts', { params });
export const getCourt = (id) => api.get(`/courts/${id}`);
export const getMyCourts = () => api.get('/courts/my-courts');
export const createCourt = (data) => api.post('/courts', data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateCourt = (id, data) => api.put(`/courts/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteCourt = (id) => api.delete(`/courts/${id}`);
export const approveCourt = (id, isApproved) => api.patch(`/courts/${id}/approve`, { isApproved });
export const removeCourtImage = (id, publicId) => api.delete(`/courts/${id}/images/${publicId}`);
