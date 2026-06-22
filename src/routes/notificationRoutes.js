const express = require('express');
const router = express.Router();
const { authenticate, requireBusiness } = require('../middleware/auth');
const { getNotifications, getUnreadCount } = require('../controllers/notificationController');

router.use(authenticate, requireBusiness);

router.get('/', getNotifications);
router.get('/count', getUnreadCount);

module.exports = router;