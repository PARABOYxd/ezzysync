const publicService = require('../services/publicService');

async function captureLead(req, res, next) {
  try {
    const { customerName, email, phone, interest } = req.body;
    if (!customerName || !phone) {
      return res.status(400).json({ message: 'Name and phone number are required.' });
    }
    if (!/^[0-9+\-\s()]{7,15}$/.test(phone)) {
      return res.status(400).json({ message: 'Please provide a valid phone number.' });
    }

    const lead = await publicService.captureLeadByPublicKey(req.params.publicLeadKey, {
      customerName,
      email,
      phone,
      interest,
    });
    if (!lead) {
      return res.status(404).json({ message: 'Invalid lead capture link.' });
    }

    res.status(201).json({ message: 'Thank you! We will get back to you shortly.', leadId: lead.leadId });
  } catch (err) {
    next(err);
  }
}

async function submitWalkthroughRequest(req, res, next) {
  try {
    const { name, agencyName, email, phone } = req.body;
    if (!name || !agencyName || !email) {
      return res.status(400).json({ message: 'Name, Agency Name, and Email are required.' });
    }

    const request = await publicService.submitWalkthroughRequest({ name, agencyName, email, phone });
    res.status(201).json({ message: 'Request submitted successfully!', request });
  } catch (err) {
    next(err);
  }
}

async function listWalkthroughRequests(req, res, next) {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden. Admin access required.' });
    }
    const requests = await publicService.listWalkthroughRequests();
    res.json({ requests });
  } catch (err) {
    next(err);
  }
}

async function generateFreeItinerary(req, res, next) {
  try {
    const { destination, days, tripType, agencyName, email, phone, name } = req.body;
    if (!destination) {
      return res.status(400).json({ message: 'Destination is required.' });
    }

    const itinerary = await publicService.generateFreeItinerary({
      destination,
      days: Number(days) || 4,
      tripType: tripType || 'Family & Leisure',
      agencyName: agencyName || 'EzzySync Partner Agency',
      email,
      phone,
      name,
    });

    res.json({
      success: true,
      itinerary: itinerary || '',
      destination,
      days,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { captureLead, submitWalkthroughRequest, listWalkthroughRequests, generateFreeItinerary };
