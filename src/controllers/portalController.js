const { User, Client, Deal, Invoice, Notification } = require('../models/index');
const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

// Подключаем Document модель
const Document = sequelize.models.Document || sequelize.define('Document', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  owner_id: { type: DataTypes.UUID },
  client_id: { type: DataTypes.UUID },
  deal_id: { type: DataTypes.UUID },
  title: { type: DataTypes.STRING },
  type: { type: DataTypes.ENUM('contract', 'act', 'proposal', 'other'), defaultValue: 'other' },
  content: { type: DataTypes.TEXT },
  file_path: { type: DataTypes.STRING },
  generated: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'documents', timestamps: true });

// Multer для загрузки подтверждения оплаты
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../src/public/uploads/confirmations');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `confirm_${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

// Найти клиента по user_id
const findClientByUserId = async (userId) => {
  return Client.findOne({ where: { email: (await User.findByPk(userId)).email } });
};

// Дашборд клиента
const getPortalDashboard = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const client = await Client.findOne({ where: { email: user.email } });

    if (!client) {
      return res.render('client-portal/dashboard', {
        title: 'Личный кабинет',
        user: req.user,
        client: null,
        deals: [],
        invoices: [],
        unreadCount: 0,
      });
    }

    const deals = await Deal.findAll({
      where: { client_id: client.id },
      order: [['createdAt', 'DESC']],
      limit: 5,
    });

    const invoices = await Invoice.findAll({
      where: { client_id: client.id },
      order: [['createdAt', 'DESC']],
      limit: 5,
    });

    const unreadCount = await Notification.count({
      where: { user_id: req.user.id, is_read: false },
    });

    res.render('client-portal/dashboard', {
      title: 'Личный кабинет',
      user: req.user,
      client,
      deals,
      invoices,
      unreadCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка загрузки портала', status: 500 });
  }
};

// Сделки клиента
const getPortalDeals = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const client = await Client.findOne({ where: { email: user.email } });
    if (!client) return res.redirect('/portal');

    const deals = await Deal.findAll({
      where: { client_id: client.id },
      order: [['createdAt', 'DESC']],
    });

    res.render('client-portal/deals', {
      title: 'Мои сделки',
      user: req.user,
      client,
      deals,
      unreadCount: 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка', status: 500 });
  }
};

// Счета клиента
const getPortalInvoices = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const client = await Client.findOne({ where: { email: user.email } });
    if (!client) return res.redirect('/portal');

    const invoices = await Invoice.findAll({
      where: { client_id: client.id },
      order: [['createdAt', 'DESC']],
    });

    res.render('client-portal/invoices', {
      title: 'Мои счета',
      user: req.user,
      client,
      invoices,
      unreadCount: 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка', status: 500 });
  }
};

// Подтверждение оплаты клиентом
const confirmInvoice = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const client = await Client.findOne({ where: { email: user.email } });
    if (!client) return res.status(403).json({ error: 'Нет доступа' });

    const invoice = await Invoice.findOne({
      where: { id: req.params.id, client_id: client.id },
    });
    if (!invoice) return res.status(404).json({ error: 'Счёт не найден' });

    const confirmFile = req.file ? `confirmations/${req.file.filename}` : null;

    await invoice.update({
      status: 'pending',
      confirmed_at: new Date(),
      confirmation_file: confirmFile,
    });

    // Уведомление бизнесу
    const businessUser = await User.findOne({ where: { role: 'business' } });
    if (businessUser) {
      await Notification.create({
        user_id: businessUser.id,
        message: `Клиент ${client.name} подтвердил оплату счёта на сумму ${invoice.amount} ${invoice.currency}`,
        type: 'invoice',
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка' });
  }
};

// Документы клиента
const getPortalDocuments = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const client = await Client.findOne({ where: { email: user.email } });
    if (!client) return res.redirect('/portal');

    const documents = await Document.findAll({
      where: { client_id: client.id },
      order: [['createdAt', 'DESC']],
    });

    res.render('client-portal/documents', {
      title: 'Мои документы',
      user: req.user,
      client,
      documents,
      unreadCount: 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка', status: 500 });
  }
};

module.exports = {
  getPortalDashboard,
  getPortalDeals,
  getPortalInvoices,
  getPortalDocuments,
  confirmInvoice,
  upload,
};