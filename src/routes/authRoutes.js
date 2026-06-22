const express = require('express');
const router = express.Router();
const {
  getRegister,
  postRegister,
  getLogin,
  postLogin,
  getClientLogin,
  postClientLogin,
  logout,
} = require('../controllers/authController');

router.get('/register', getRegister);
router.post('/register', postRegister);

router.get('/login', getLogin);
router.post('/login', postLogin);

router.get('/client/login', getClientLogin);
router.post('/client/login', postClientLogin);

router.post('/logout', logout);

module.exports = router;