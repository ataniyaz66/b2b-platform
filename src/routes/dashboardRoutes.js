const express = require('express');
const router = express.Router();
const { authenticate, requireBusiness } = require('../middleware/auth');
const { getDashboard } = require('../controllers/dashboardController');

router.get('/', authenticate, requireBusiness, getDashboard);

module.exports = router;