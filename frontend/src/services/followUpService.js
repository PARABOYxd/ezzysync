import api from './api';

export const getDueFollowUps = (params) => api.get('/follow-ups', { params }).then((r) => r.data.followUps);
export const markFollowUpDone = (id, data) => api.patch(`/follow-ups/${id}/done`, data).then((r) => r.data.followUp);
