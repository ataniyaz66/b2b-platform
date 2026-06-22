const express = require('express');
const router = express.Router();
const { authenticate, requireClient } = require('../middleware/auth');
const {
  getPortalDashboard,
  getPortalDeals,
  getPortalInvoices,
  getPortalDocuments,
  confirmInvoice,
  upload,
} = require('../controllers/portalController');

router.use(authenticate, requireClient);

router.get('/', getPortalDashboard);
router.get('/deals', getPortalDeals);
router.get('/invoices', getPortalInvoices);
router.get('/documents', getPortalDocuments);
router.post('/invoices/:id/confirm', upload.single('file'), confirmInvoice);

module.exports = router;