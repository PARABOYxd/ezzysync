import api from './api';

let cachedFeatures = {
  instagram: false,
  whatsappWeb: true,
  aiAutopilot: true,
};

export const fetchFeatures = async () => {
  try {
    const res = await api.get('/public/features');
    if (res.data?.features) {
      cachedFeatures = { ...cachedFeatures, ...res.data.features };
      localStorage.setItem('crm_features', JSON.stringify(cachedFeatures));
    }
  } catch (_) {
    const saved = localStorage.getItem('crm_features');
    if (saved) {
      try {
        cachedFeatures = JSON.parse(saved);
      } catch (e) {}
    }
  }
  return cachedFeatures;
};

export const getFeatures = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('crm_features');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
  }
  return cachedFeatures;
};
