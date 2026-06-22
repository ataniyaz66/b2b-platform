const { Task, Client, Deal, Notification } = require('../models/index');
const { Op } = require('sequelize');

const getTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, priority } = req.query;

    const where = { created_by: userId };
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const tasks = await Task.findAll({
      where,
      include: [
        { model: Client, as: 'client', required: false },
        { model: Deal, as: 'deal', required: false },
      ],
      order: [['deadline', 'ASC']],
    });

    const now = new Date();
    const overdue = tasks.filter(t => t.deadline && new Date(t.deadline) < now && t.status !== 'done');
    const active = tasks.filter(t => !(t.deadline && new Date(t.deadline) < now && t.status !== 'done'));

    const unreadCount = await Notification.count({ where: { user_id: userId, is_read: false } });

    res.render('tasks/index', {
      title: 'Задачи',
      path: '/tasks',
      user: req.user,
      unreadCount,
      tasks,
      overdue,
      active,
      status: status || '',
      priority: priority || '',
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка загрузки задач', status: 500 });
  }
};

const getNewTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const clients = await Client.findAll({ where: { owner_id: userId } });
    const deals = await Deal.findAll({ where: { manager_id: userId } });
    const unreadCount = await Notification.count({ where: { user_id: userId, is_read: false } });

    res.render('tasks/new', {
      title: 'Новая задача',
      path: '/tasks',
      user: req.user,
      unreadCount,
      clients,
      deals,
      selectedClientId: req.query.client_id || '',
      selectedDealId: req.query.deal_id || '',
      error: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка', status: 500 });
  }
};

const postTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, client_id, deal_id, priority, deadline } = req.body;

    if (!title) {
      const clients = await Client.findAll({ where: { owner_id: userId } });
      const deals = await Deal.findAll({ where: { manager_id: userId } });
      return res.render('tasks/new', {
        title: 'Новая задача',
        path: '/tasks',
        user: req.user,
        unreadCount: 0,
        clients,
        deals,
        selectedClientId: client_id || '',
        selectedDealId: deal_id || '',
        error: 'Название обязательно',
      });
    }

    await Task.create({
      created_by: userId,
      title,
      description,
      client_id: client_id || null,
      deal_id: deal_id || null,
      priority: priority || 'medium',
      deadline: deadline || null,
      status: 'open',
    });

    res.redirect('/tasks');
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка создания задачи', status: 500 });
  }
};

const getEditTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const task = await Task.findOne({ where: { id: req.params.id, created_by: userId } });
    if (!task) return res.status(404).render('error', { message: 'Задача не найдена', status: 404 });

    const clients = await Client.findAll({ where: { owner_id: userId } });
    const deals = await Deal.findAll({ where: { manager_id: userId } });
    const unreadCount = await Notification.count({ where: { user_id: userId, is_read: false } });

    res.render('tasks/edit', {
      title: 'Редактировать задачу',
      path: '/tasks',
      user: req.user,
      unreadCount,
      task,
      clients,
      deals,
      error: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка', status: 500 });
  }
};

const putTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const task = await Task.findOne({ where: { id: req.params.id, created_by: userId } });
    if (!task) return res.status(404).render('error', { message: 'Задача не найдена', status: 404 });

    const { title, description, client_id, deal_id, priority, status, deadline } = req.body;

    await task.update({
      title,
      description,
      client_id: client_id || null,
      deal_id: deal_id || null,
      priority,
      status,
      deadline: deadline || null,
    });

    res.redirect('/tasks');
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка обновления', status: 500 });
  }
};

const patchStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.body;
    const task = await Task.findOne({ where: { id: req.params.id, created_by: userId } });
    if (!task) return res.status(404).json({ error: 'Не найдено' });

    await task.update({ status });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка' });
  }
};

const deleteTask = async (req, res) => {
  try {
    const userId = req.user.id;
    await Task.destroy({ where: { id: req.params.id, created_by: userId } });
    res.redirect('/tasks');
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка удаления', status: 500 });
  }
};

module.exports = { getTasks, getNewTask, postTask, getEditTask, putTask, patchStatus, deleteTask };