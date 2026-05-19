import api from './api';

export const getTournaments = (params) => api.get('/tournaments', { params });
export const getTournament = (id) => api.get(`/tournaments/${id}`);
export const createTournament = (data) => api.post('/tournaments', data);
export const updateTournament = (id, data) => api.put(`/tournaments/${id}`, data);
export const registerTeam = (tournamentId, teamId) => api.post(`/tournaments/${tournamentId}/register`, { teamId });
export const generateFixtures = (tournamentId) => api.post(`/tournaments/${tournamentId}/fixtures`);
export const updateScore = (tournamentId, data) => api.put(`/tournaments/${tournamentId}/scores`, data);

export const createTeam = (data) => api.post('/tournaments/teams', data);
export const getMyTeams = () => api.get('/tournaments/teams/my-teams');
