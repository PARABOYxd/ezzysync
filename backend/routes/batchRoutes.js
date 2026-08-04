const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/batchController');
const { requireAuth } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(requireAuth);

const batchValidators = [
  body('name').notEmpty().withMessage('Batch name is required.'),
  body('tripName').notEmpty().withMessage('Trip name is required.'),
  body('departureDate').notEmpty().withMessage('Departure date is required.'),
  body('totalCapacity').isInt({ min: 0 }).withMessage('Total capacity must be a non-negative number.'),
];

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', batchValidators, validate, ctrl.create);
router.put('/:id', batchValidators, validate, ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/link', ctrl.link);
router.post('/:id/unlink', ctrl.unlink);
router.post('/:id/link-lead', ctrl.linkLead);
router.post('/:id/unlink-lead', ctrl.unlinkLead);
module.exports = router;
