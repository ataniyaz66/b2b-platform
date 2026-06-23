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
router.get('/documents/:id/pdf', async (req, res) => {
  const { sequelize } = require('../config/db');
  const { DataTypes } = require('sequelize');
  const PDFDocument = require('pdfkit');
  const path = require('path');
  const { Client } = require('../models/index');

  const Document = sequelize.models.Document;
  if (!Document) return res.status(404).send('Документ не найден');

  const doc_record = await Document.findOne({
    where: { id: req.params.id },
    include: [{ model: Client, as: 'client', required: false }],
  });

  if (!doc_record) return res.status(404).send('Документ не найден');

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="document.pdf"`);
  doc.pipe(res);

  const fontPath = path.join(__dirname, '../../src/public/fonts/arial.ttf');
  try { doc.registerFont('Arial', fontPath); doc.font('Arial'); } catch(e) {}

  doc.fontSize(18).text(doc_record.title, { align: 'center' });
  doc.moveDown();
  if (doc_record.content) {
    doc.fontSize(12).text(doc_record.content, { lineGap: 4 });
  }
  doc.end();
});

module.exports = router;