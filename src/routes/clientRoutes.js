const express = require('express');
const router = express.Router();
const { authenticate, requireBusiness } = require('../middleware/auth');
const {
  getClients, getClient, getNewClient, postClient,
  getEditClient, putClient, deleteClient, createClientAccess, resetClientAccess,
} = require('../controllers/clientController');

router.use(authenticate, requireBusiness);

router.get('/', getClients);
router.get('/new', getNewClient);
router.post('/', postClient);
router.get('/:id', getClient);
router.get('/:id/edit', getEditClient);
router.post('/:id/update', putClient);
router.post('/:id/delete', deleteClient);
router.post('/:id/create-access', createClientAccess);
router.post('/:id/reset-access', resetClientAccess);

module.exports = router;