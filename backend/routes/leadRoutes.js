const express = require('express');
const multer = require('multer');
const ctrl = require('../controllers/leadController');
const importCtrl = require('../controllers/leadImportController');
const { leadValidators } = require('../validators/leadValidators');
const { requireAuth } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { requirePermission } = require('../middleware/permissionMiddleware');

const router = express.Router();
router.use(requireAuth);

/*
 * A spreadsheet stays in memory: it is read once into rows and never needs to
 * exist as a file on the server.
 */
const uploadSheet = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(xlsx|xls|csv)$/i.test(file.originalname || '');
    cb(ok ? null : new Error('Only .xlsx, .xls or .csv files can be imported.'), ok);
  },
});

/** Multer rejects before the controller runs, so its errors need their own answer. */
function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      message: err.code === 'LIMIT_FILE_SIZE'
        ? 'That file is larger than 5MB. Split it or save it as .csv.'
        : err.message,
    });
  }
  if (err) return res.status(400).json({ message: err.message });
  next();
}

// Registered above '/:id' so an import path is never read as a lead id.
router.get('/import/fields', requirePermission('leads', 'create'), importCtrl.fields);
router.get('/import/template', requirePermission('leads', 'create'), importCtrl.template);
router.post('/import/preview', requirePermission('leads', 'create'), uploadSheet.single('file'), handleUploadError, importCtrl.preview);
router.post('/import/analyze', requirePermission('leads', 'create'), importCtrl.analyze);
router.post('/import', requirePermission('leads', 'create'), importCtrl.run);

router.get('/', requirePermission('leads', 'read'), ctrl.list);
router.get('/pool', requirePermission('leads', 'read'), ctrl.listPool);
router.get('/pipeline', requirePermission('leads', 'read'), ctrl.pipeline);
router.post('/bulk-import', requirePermission('leads', 'create'), ctrl.bulkImport);
router.post('/broadcast', requirePermission('leads', 'update'), ctrl.broadcast);
router.get('/broadcast-quota', requirePermission('leads', 'read'), ctrl.getBroadcastQuota);
router.get('/broadcasts', requirePermission('leads', 'read'), ctrl.listBroadcasts);
router.get('/broadcasts/:broadcastId', requirePermission('leads', 'read'), ctrl.getBroadcastDetail);
router.get('/:id', requirePermission('leads', 'read'), ctrl.getOne);
router.post('/', requirePermission('leads', 'create'), leadValidators, validate, ctrl.create);
router.put('/:id', requirePermission('leads', 'update'), ctrl.update);
router.patch('/:id/stage', requirePermission('leads', 'update'), ctrl.updateStage);
router.post('/:id/convert', requirePermission('leads', 'update'), ctrl.convert);
router.post('/:id/claim', requirePermission('leads', 'update'), ctrl.claimLead);
router.delete('/:id', requirePermission('leads', 'delete'), ctrl.remove);

router.get('/:id/follow-ups', ctrl.listFollowUps);
router.post('/:id/follow-ups', ctrl.createFollowUp);

module.exports = router;
