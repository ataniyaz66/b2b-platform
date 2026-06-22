const express = require('express');
const router = express.Router();
const { authenticate, requireBusiness } = require('../middleware/auth');
const {
  getInvoices, getInvoice, getNewInvoice, postInvoice,
  patchStatus, deleteInvoice,
} = require('../controllers/invoiceController');

router.use(authenticate, requireBusiness);

router.get('/', getInvoices);
router.get('/new', getNewInvoice);
router.post('/', postInvoice);
router.get('/:id', getInvoice);
router.post('/:id/status', patchStatus);
router.post('/:id/delete', deleteInvoice);

module.exports = router;