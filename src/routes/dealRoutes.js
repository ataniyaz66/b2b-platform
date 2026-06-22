const express = require('express');
const router = express.Router();
const { authenticate, requireBusiness } = require('../middleware/auth');
const {
  getDeals, getDeal, getNewDeal, postDeal,
  getEditDeal, putDeal, patchStage, deleteDeal,
} = require('../controllers/dealController');

router.use(authenticate, requireBusiness);

router.get('/', getDeals);
router.get('/new', getNewDeal);
router.post('/', postDeal);
router.get('/:id', getDeal);
router.get('/:id/edit', getEditDeal);
router.post('/:id/update', putDeal);
router.post('/:id/stage', patchStage);
router.post('/:id/delete', deleteDeal);

module.exports = router;