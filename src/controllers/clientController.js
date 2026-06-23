const { Client, Deal, Invoice, Task, User, Notification } = require('../models/index');
const { Op } = require('sequelize');
const bcrypt = require('bcrypt');
const { sendMail } = require('../config/mailer');
const { sequelize } = require('../config/db');

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

    const unreadCount = await Notification.count({
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

    const unreadCount = await Notification.count({
      where: { user_id: userId, is_read: false },
    });

    const hasAccess = await User.findOne({ where: { email: client.email, role: 'client' } });

    res.render('clients/show', {
      title: client.name,
      path: '/clients',
      user: req.user,
      unreadCount,
      client,
      hasAccess: !!hasAccess,
      successMsg: req.query.success === 'access_created' ? req.query.password : null,
      errorMsg: req.query.error || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка загрузки клиента', status: 500 });
  }
};

const getNewClient = (req, res) => {
  res.render('clients/new', {
    title: 'Новый клиент',
    path: '/clients',
    user: req.user,
    unreadCount: 0,
    error: null,
  });
};

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
      name, contact_person, email, phone, address, country,
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

const deleteClient = async (req, res) => {
  try {
    const userId = req.user.id;
    const client = await Client.findOne({ where: { id: req.params.id, owner_id: userId } });
    if (!client) return res.status(404).render('error', { message: 'Клиент не найден', status: 404 });

    const id = client.id;

    await sequelize.query(`DELETE FROM documents WHERE client_id = '${id}'`);
    await sequelize.query(`DELETE FROM tasks WHERE client_id = '${id}'`);
    await sequelize.query(`DELETE FROM invoices WHERE client_id = '${id}'`);
    await sequelize.query(`DELETE FROM deals WHERE client_id = '${id}'`);

    await client.destroy();
    res.redirect('/clients');
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка удаления', status: 500 });
  }
};

const createClientAccess = async (req, res) => {
  try {
    const userId = req.user.id;
    const client = await Client.findOne({ where: { id: req.params.id, owner_id: userId } });
    if (!client) return res.status(404).render('error', { message: 'Клиент не найден', status: 404 });

    if (!client.email) {
      return res.redirect(`/clients/${client.id}?error=no_email`);
    }

    const existing = await User.findOne({ where: { email: client.email, role: 'client' } });
    if (existing) {
      return res.redirect(`/clients/${client.id}?error=already_exists`);
    }

    const tempPassword = Math.random().toString(36).slice(-8);
    const password_hash = await bcrypt.hash(tempPassword, 10);

    await User.create({
      company_name: client.name,
      email: client.email,
      password_hash,
      role: 'client',
    });

    await sendMail({
      to: client.email,
      subject: 'Доступ в личный кабинет',
      html: `<p>Здравствуйте, ${client.name}!</p>
             <p>Ваш логин: <strong>${client.email}</strong></p>
             <p>Пароль: <strong>${tempPassword}</strong></p>
             <p><a href="https://b2b-platform-production-9ffb.up.railway.app/auth/client/login">Войти в личный кабинет</a></p>`,
    }).catch(err => console.error('Email error:', err));

    res.redirect(`/clients/${client.id}?success=access_created&password=${tempPassword}`);
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка создания доступа', status: 500 });
  }
};

const resetClientAccess = async (req, res) => {
  try {
    const userId = req.user.id;
    const client = await Client.findOne({ where: { id: req.params.id, owner_id: userId } });
    if (!client) return res.status(404).render('error', { message: 'Клиент не найден', status: 404 });

    const existing = await User.findOne({ where: { email: client.email, role: 'client' } });
    if (!existing) {
      return res.redirect(`/clients/${client.id}?error=no_access`);
    }

    const tempPassword = Math.random().toString(36).slice(-8);
    const password_hash = await bcrypt.hash(tempPassword, 10);

    await existing.update({ password_hash });

    await sendMail({
      to: client.email,
      subject: 'Новый пароль для личного кабинета',
      html: `<p>Здравствуйте, ${client.name}!</p>
             <p>Ваш новый пароль: <strong>${tempPassword}</strong></p>
             <p><a href="https://b2b-platform-production-9ffb.up.railway.app/auth/client/login">Войти в личный кабинет</a></p>`,
    }).catch(err => console.error('Email error:', err));

    res.redirect(`/clients/${client.id}?success=access_created&password=${tempPassword}`);
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка сброса пароля', status: 500 });
  }
};

module.exports = {
  getClients, getClient, getNewClient, postClient,
  getEditClient, putClient, deleteClient, createClientAccess,
};