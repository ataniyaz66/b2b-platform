const { Invoice, Client, Deal, Notification, User } = require('../models/index');
const { Op } = require('sequelize');
const { sendMail } = require('../config/mailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Настройка multer для загрузки файлов подтверждения
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../src/public/uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `confirm_${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

const getInvoices = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const clientWhere = { owner_id: userId };
    const invoiceWhere = {};
    if (status) invoiceWhere.status = status;

    const invoices = await Invoice.findAll({
      where: invoiceWhere,
      include: [
        { model: Client, as: 'client', where: clientWhere },
        { model: Deal, as: 'deal', required: false },
      ],
      order: [['createdAt', 'DESC']],
    });

    const unreadCount = await Notification.count({ where: { user_id: userId, is_read: false } });

    res.render('invoices/index', {
      title: 'Счета',
      path: '/invoices',
      user: req.user,
      unreadCount,
      invoices,
      status: status || '',
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка загрузки счетов', status: 500 });
  }
};

const getInvoice = async (req, res) => {
  try {
    const userId = req.user.id;
    const invoice = await Invoice.findOne({
      where: { id: req.params.id },
      include: [
        { model: Client, as: 'client', where: { owner_id: userId } },
        { model: Deal, as: 'deal', required: false },
      ],
    });

    if (!invoice) return res.status(404).render('error', { message: 'Счёт не найден', status: 404 });

    const unreadCount = await Notification.count({ where: { user_id: userId, is_read: false } });

    res.render('invoices/show', {
      title: `Счёт #${invoice.id.slice(0, 8)}`,
      path: '/invoices',
      user: req.user,
      unreadCount,
      invoice,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка', status: 500 });
  }
};

const getNewInvoice = async (req, res) => {
  try {
    const userId = req.user.id;
    const clients = await Client.findAll({ where: { owner_id: userId } });
    const deals = await Deal.findAll({ where: { manager_id: userId } });
    const unreadCount = await Notification.count({ where: { user_id: userId, is_read: false } });

    res.render('invoices/new', {
      title: 'Новый счёт',
      path: '/invoices',
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

const postInvoice = async (req, res) => {
  try {
    const userId = req.user.id;
    const { client_id, deal_id, amount, currency, due_date, description } = req.body;

    if (!client_id || !amount) {
      const clients = await Client.findAll({ where: { owner_id: userId } });
      const deals = await Deal.findAll({ where: { manager_id: userId } });
      return res.render('invoices/new', {
        title: 'Новый счёт',
        path: '/invoices',
        user: req.user,
        unreadCount: 0,
        clients,
        deals,
        selectedClientId: client_id || '',
        selectedDealId: deal_id || '',
        error: 'Клиент и сумма обязательны',
      });
    }

    const invoice = await Invoice.create({
      client_id,
      deal_id: deal_id || null,
      amount,
      currency: currency || 'USD',
      status: 'issued',
      due_date: due_date || null,
      description,
    });

    // Уведомление клиенту на email
    const client = await Client.findByPk(client_id);
    if (client && client.email) {
      await sendMail({
        to: client.email,
        subject: 'Вам выставлен счёт',
        html: `<p>Здравствуйте, ${client.name}!</p>
               <p>Вам выставлен счёт на сумму <strong>${amount} ${currency}</strong>.</p>
               <p>Войдите в личный кабинет для просмотра деталей.</p>`,
      }).catch(err => console.error('Email error:', err));
    }

    res.redirect('/invoices');
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка создания счёта', status: 500 });
  }
};

const patchStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.body;
    const invoice = await Invoice.findOne({
      where: { id: req.params.id },
      include: [{ model: Client, as: 'client', where: { owner_id: userId } }],
    });

    if (!invoice) return res.status(404).json({ error: 'Не найдено' });

    const updateData = { status };
    if (status === 'paid') updateData.paid_at = new Date();

    await invoice.update(updateData);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка' });
  }
};

const deleteInvoice = async (req, res) => {
  try {
    const userId = req.user.id;
    await Invoice.destroy({
      where: { id: req.params.id },
      include: [{ model: Client, as: 'client', where: { owner_id: userId } }],
    });
    res.redirect('/invoices');
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка удаления', status: 500 });
  }
};

module.exports = { getInvoices, getInvoice, getNewInvoice, postInvoice, patchStatus, deleteInvoice, upload };