const express = require('express');
const router = express.Router();
const { authenticate, requireBusiness } = require('../middleware/auth');
const {
  getDocuments, getDocument, getNewDocument, postDocument,
  generatePDF, deleteDocument, upload,
} = require('../controllers/documentController');

router.use(authenticate, requireBusiness);

router.get('/', getDocuments);
router.get('/new', getNewDocument);
router.post('/', upload.single('file'), postDocument);
router.get('/:id', getDocument);
router.get('/:id/pdf', generatePDF);
router.post('/:id/delete', deleteDocument);

module.exports = router;