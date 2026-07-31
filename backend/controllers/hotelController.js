const hotelRepository = require('../repositories/hotelRepository');
const auditService = require('../services/auditService');

async function createHotel(req, res, next) {
  try {
    const hotel = await hotelRepository.createHotel(req.user.tenantId, req.body);
    await auditService.logAction(req, 'CREATE_HOTEL', { hotelId: hotel.id, name: hotel.name });
    res.status(201).json({ hotel });
  } catch (err) {
    next(err);
  }
}

async function listHotels(req, res, next) {
  try {
    const { search } = req.query;
    const hotels = await hotelRepository.listHotels(req.user.tenantId, search);
    res.json({ hotels });
  } catch (err) {
    next(err);
  }
}

async function getHotelById(req, res, next) {
  try {
    const hotel = await hotelRepository.getHotelById(req.user.tenantId, req.params.id);
    if (!hotel) return res.status(404).json({ message: 'Hotel not found.' });
    res.json({ hotel });
  } catch (err) {
    next(err);
  }
}

async function updateHotel(req, res, next) {
  try {
    const hotel = await hotelRepository.updateHotel(req.user.tenantId, req.params.id, req.body);
    if (!hotel) return res.status(404).json({ message: 'Hotel not found.' });
    await auditService.logAction(req, 'UPDATE_HOTEL', { hotelId: req.params.id, name: hotel.name });
    res.json({ hotel });
  } catch (err) {
    next(err);
  }
}

async function deleteHotel(req, res, next) {
  try {
    const hotel = await hotelRepository.deleteHotel(req.user.tenantId, req.params.id);
    if (!hotel) return res.status(404).json({ message: 'Hotel not found.' });
    await auditService.logAction(req, 'DELETE_HOTEL', { hotelId: req.params.id, name: hotel.name });
    res.json({ message: 'Hotel deleted successfully.', hotel });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createHotel,
  listHotels,
  getHotelById,
  updateHotel,
  deleteHotel
};
