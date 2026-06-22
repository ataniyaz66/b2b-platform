const { Client, Deal, Invoice, Task, User } = require('../models/index');
const { Op } = require('sequelize');

// Список клиентов
const getClients = async (req, res) => {
  try {
    const userId = req.user.id;
    const { search, status, tag } = req.query;

    const where = { owner_id: userId };

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { contact_person: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (status) where.status = status;
    if (tag) where.tags = { [Op.contains]: [tag] };

    const clients = await Client.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });

    const unreadCount = await require('../models/Notification').count({
      where: { user_id: userId, is_read: false },
    });

    res.render('clients/index', {
      title: 'Клиенты',
      path: '/clients',
      user: req.user,
      unreadCount,
      clients,
      search: search || '',
      status: status || '',
      tag: tag || '',
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка загрузки клиентов', status: 500 });
  }
};

// Карточка клиента
const getClient = async (req, res) => {
  try {
    const userId = req.user.id;
    const client = await Client.findOne({
      where: { id: req.params.id, owner_id: userId },
      include: [
        { model: Deal, as: 'deals' },
        { model: Invoice, as: 'invoices' },
        { model: Task, as: 'tasks' },
      ],
    });

    if (!client) return res.status(404).render('error', { message: 'Клиент не найден', status: 404 });

    const unreadCount = await require('../models/Notification').count({
      where: { user_id: userId, is_read: false },
    });

    res.render('clients/show', {
      title: client.name,
      path: '/clients',
      user: req.user,
      unreadCount,
      client,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка загрузки клиента', status: 500 });
  }
};

// Форма создания
const getNewClient = (req, res) => {
  const unreadCount = 0;
  res.render('clients/new', {
    title: 'Новый клиент',
    path: '/clients',
    user: req.user,
    unreadCount,
    error: null,
  });
};

// Создать клиента
const postClient = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, contact_person, email, phone, address, country, currency, status, tags, notes } = req.body;

    if (!name) {
      return res.render('clients/new', {
        title: 'Новый клиент',
        path: '/clients',
        user: req.user,
        unreadCount: 0,
        error: 'Название обязательно',
      });
    }

    const tagsArray = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];

    await Client.create({
      owner_id: userId,
      name,
      contact_person,
      email,
      phone,
      address,
      country,
      currency: currency || 'USD',
      status: status || 'active',
      tags: tagsArray,
      notes,
    });

    res.redirect('/clients');
  } catch (err) {
    console.error(err);
    res.render('clients/new', {
      title: 'Новый клиент',
      path: '/clients',
      user: req.user,
      unreadCount: 0,
      error: 'Ошибка создания клиента',
    });
  }
};

// Форма редактирования
const getEditClient = async (req, res) => {
  try {
    const userId = req.user.id;
    const client = await Client.findOne({ where: { id: req.params.id, owner_id: userId } });
    if (!client) return res.status(404).render('error', { message: 'Клиент не найден', status: 404 });

    res.render('clients/edit', {
      title: 'Редактировать клиента',
      path: '/clients',
      user: req.user,
      unreadCount: 0,
      client,
      error: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка', status: 500 });
  }
};

// Обновить клиента
const putClient = async (req, res) => {
  try {
    const userId = req.user.id;
    const client = await Client.findOne({ where: { id: req.params.id, owner_id: userId } });
    if (!client) return res.status(404).render('error', { message: 'Клиент не найден', status: 404 });

    const { name, contact_person, email, phone, address, country, currency, status, tags, notes } = req.body;
    const tagsArray = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];

    await client.update({ name, contact_person, email, phone, address, country, currency, status, tags: tagsArray, notes });
    res.redirect(`/clients/${client.id}`);
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка обновления', status: 500 });
  }
};

// Удалить клиента
const deleteClient = async (req, res) => {
  try {
    const userId = req.user.id;
    await Client.destroy({ where: { id: req.params.id, owner_id: userId } });
    res.redirect('/clients');
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка удаления', status: 500 });
  }
};

module.exports = { getClients, getClient, getNewClient, postClient, getEditClient, putClient, deleteClient };