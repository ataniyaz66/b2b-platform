const { Deal, Client, User, Task, Invoice, Notification } = require('../models/index');
const { Op } = require('sequelize');

const getDeals = async (req, res) => {
  try {
    const userId = req.user.id;
    const { client_id, stage } = req.query;

    const where = { manager_id: userId };
    if (client_id) where.client_id = client_id;
    if (stage) where.stage = stage;

    const deals = await Deal.findAll({
      where,
      include: [{ model: Client, as: 'client' }],
      order: [['createdAt', 'DESC']],
    });

    // Группируем по стадиям для Kanban
    const kanban = {
      new: deals.filter(d => d.stage === 'new'),
      negotiation: deals.filter(d => d.stage === 'negotiation'),
      proposal: deals.filter(d => d.stage === 'proposal'),
      won: deals.filter(d => d.stage === 'won'),
      lost: deals.filter(d => d.stage === 'lost'),
    };

    const unreadCount = await Notification.count({ where: { user_id: userId, is_read: false } });

    res.render('deals/index', {
      title: 'Сделки',
      path: '/deals',
      user: req.user,
      unreadCount,
      deals,
      kanban,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка загрузки сделок', status: 500 });
  }
};

const getDeal = async (req, res) => {
  try {
    const userId = req.user.id;
    const deal = await Deal.findOne({
      where: { id: req.params.id, manager_id: userId },
      include: [
        { model: Client, as: 'client' },
        { model: Task, as: 'tasks' },
        { model: Invoice, as: 'invoices' },
      ],
    });

    if (!deal) return res.status(404).render('error', { message: 'Сделка не найдена', status: 404 });

    const unreadCount = await Notification.count({ where: { user_id: userId, is_read: false } });

    // Проверяем не двигалась ли сделка 7 дней
    const daysSinceUpdate = Math.floor((new Date() - new Date(deal.last_updated)) / (1000 * 60 * 60 * 24));
    const isStale = daysSinceUpdate >= 7 && !['won', 'lost'].includes(deal.stage);

    res.render('deals/show', {
      title: deal.title,
      path: '/deals',
      user: req.user,
      unreadCount,
      deal,
      isStale,
      daysSinceUpdate,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка загрузки сделки', status: 500 });
  }
};

const getNewDeal = async (req, res) => {
  try {
    const userId = req.user.id;
    const clients = await Client.findAll({ where: { owner_id: userId } });
    const unreadCount = await Notification.count({ where: { user_id: userId, is_read: false } });

    res.render('deals/new', {
      title: 'Новая сделка',
      path: '/deals',
      user: req.user,
      unreadCount,
      clients,
      selectedClientId: req.query.client_id || '',
      error: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка', status: 500 });
  }
};

const postDeal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, client_id, amount, currency, stage, deadline } = req.body;

    if (!title || !client_id) {
      const clients = await Client.findAll({ where: { owner_id: userId } });
      return res.render('deals/new', {
        title: 'Новая сделка',
        path: '/deals',
        user: req.user,
        unreadCount: 0,
        clients,
        selectedClientId: client_id || '',
        error: 'Название и клиент обязательны',
      });
    }

    await Deal.create({
      manager_id: userId,
      client_id,
      title,
      amount: amount || 0,
      currency: currency || 'USD',
      stage: stage || 'new',
      deadline: deadline || null,
      last_updated: new Date(),
    });

    res.redirect('/deals');
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка создания сделки', status: 500 });
  }
};

const getEditDeal = async (req, res) => {
  try {
    const userId = req.user.id;
    const deal = await Deal.findOne({ where: { id: req.params.id, manager_id: userId } });
    if (!deal) return res.status(404).render('error', { message: 'Сделка не найдена', status: 404 });

    const clients = await Client.findAll({ where: { owner_id: userId } });
    const unreadCount = await Notification.count({ where: { user_id: userId, is_read: false } });

    res.render('deals/edit', {
      title: 'Редактировать сделку',
      path: '/deals',
      user: req.user,
      unreadCount,
      deal,
      clients,
      error: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка', status: 500 });
  }
};

const putDeal = async (req, res) => {
  try {
    const userId = req.user.id;
    const deal = await Deal.findOne({ where: { id: req.params.id, manager_id: userId } });
    if (!deal) return res.status(404).render('error', { message: 'Сделка не найдена', status: 404 });

    const { title, client_id, amount, currency, stage, deadline } = req.body;

    await deal.update({
      title, client_id, amount, currency, stage,
      deadline: deadline || null,
      last_updated: new Date(),
    });

    res.redirect(`/deals/${deal.id}`);
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка обновления', status: 500 });
  }
};

const patchStage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { stage } = req.body;
    const deal = await Deal.findOne({ where: { id: req.params.id, manager_id: userId } });
    if (!deal) return res.status(404).json({ error: 'Не найдено' });

    await deal.update({ stage, last_updated: new Date() });
    res.json({ success: true, stage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка' });
  }
};

const deleteDeal = async (req, res) => {
  try {
    const userId = req.user.id;
    await Deal.destroy({ where: { id: req.params.id, manager_id: userId } });
    res.redirect('/deals');
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка удаления', status: 500 });
  }
};

module.exports = { getDeals, getDeal, getNewDeal, postDeal, getEditDeal, putDeal, patchStage, deleteDeal };