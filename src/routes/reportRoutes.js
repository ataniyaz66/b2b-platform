const express = require('express');
const router = express.Router();
const { authenticate, requireBusiness } = require('../middleware/auth');
const { getReports } = require('../controllers/reportController');

router.get('/', authenticate, requireBusiness, getReports);

module.exports = router;