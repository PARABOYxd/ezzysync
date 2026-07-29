import api from './api';

export const getDueFollowUps = (params) => api.get('/follow-ups', { params }).then((r) => r.data.followUps);
export const markFollowUpDone = (id) => api.patch(`/follow-ups/${id}/done`).then((r) => r.data.followUp);
