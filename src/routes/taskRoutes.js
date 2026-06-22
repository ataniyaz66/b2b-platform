const express = require('express');
const router = express.Router();
const { authenticate, requireBusiness } = require('../middleware/auth');
const {
  getTasks, getNewTask, postTask,
  getEditTask, putTask, patchStatus, deleteTask,
} = require('../controllers/taskController');

router.use(authenticate, requireBusiness);

router.get('/', getTasks);
router.get('/new', getNewTask);
router.post('/', postTask);
router.get('/:id/edit', getEditTask);
router.post('/:id/update', putTask);
router.post('/:id/status', patchStatus);
router.post('/:id/delete', deleteTask);

module.exports = router;