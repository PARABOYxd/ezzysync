import api from './api';

export const getHotels = (search = '') =>
  api.get('/hotels', { params: { search } }).then((r) => r.data.hotels);

export const getHotelById = (id) =>
  api.get(`/hotels/${id}`).then((r) => r.data.hotel);

export const createHotel = (data) =>
  api.post('/hotels', data).then((r) => r.data.hotel);

export const updateHotel = (id, data) =>
  api.put(`/hotels/${id}`, data).then((r) => r.data.hotel);

export const deleteHotel = (id) =>
  api.delete(`/hotels/${id}`).then((r) => r.data.hotel);
