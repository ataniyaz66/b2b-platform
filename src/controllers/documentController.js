const { Client, Deal, Notification } = require('../models/index');
const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Модель документа (создаём inline если нет отдельного файла)
const Document = sequelize.define('Document', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  owner_id: { type: DataTypes.UUID, allowNull: false },
  client_id: { type: DataTypes.UUID },
  deal_id: { type: DataTypes.UUID },
  title: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.ENUM('contract', 'act', 'proposal', 'other'), defaultValue: 'other' },
  content: { type: DataTypes.TEXT },
  file_path: { type: DataTypes.STRING },
  generated: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'documents', timestamps: true });

// Связи
Document.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
Document.belongsTo(Deal, { foreignKey: 'deal_id', as: 'deal' });

// Sync
Document.sync({ alter: true }).catch(console.error);

// Multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../src/public/uploads/documents');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `doc_${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

const getDocuments = async (req, res) => {
  try {
    const userId = req.user.id;
    const documents = await Document.findAll({
      where: { owner_id: userId },
      include: [
        { model: Client, as: 'client', required: false },
        { model: Deal, as: 'deal', required: false },
      ],
      order: [['createdAt', 'DESC']],
    });

    const unreadCount = await Notification.count({ where: { user_id: userId, is_read: false } });

    res.render('documents/index', {
      title: 'Документы',
      path: '/documents',
      user: req.user,
      unreadCount,
      documents,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка загрузки документов', status: 500 });
  }
};

const getDocument = async (req, res) => {
  try {
    const userId = req.user.id;
    const document = await Document.findOne({
      where: { id: req.params.id, owner_id: userId },
      include: [
        { model: Client, as: 'client', required: false },
        { model: Deal, as: 'deal', required: false },
      ],
    });

    if (!document) return res.status(404).render('error', { message: 'Документ не найден', status: 404 });

    const unreadCount = await Notification.count({ where: { user_id: userId, is_read: false } });

    res.render('documents/show', {
      title: document.title,
      path: '/documents',
      user: req.user,
      unreadCount,
      document,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка', status: 500 });
  }
};

const getNewDocument = async (req, res) => {
  try {
    const userId = req.user.id;
    const clients = await Client.findAll({ where: { owner_id: userId } });
    const deals = await Deal.findAll({ where: { manager_id: userId } });
    const unreadCount = await Notification.count({ where: { user_id: userId, is_read: false } });

    res.render('documents/new', {
      title: 'Новый документ',
      path: '/documents',
      user: req.user,
      unreadCount,
      clients,
      deals,
      error: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка', status: 500 });
  }
};

const postDocument = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, type, client_id, deal_id, content } = req.body;

    if (!title) {
      const clients = await Client.findAll({ where: { owner_id: userId } });
      const deals = await Deal.findAll({ where: { manager_id: userId } });
      return res.render('documents/new', {
        title: 'Новый документ',
        path: '/documents',
        user: req.user,
        unreadCount: 0,
        clients,
        deals,
        error: 'Название обязательно',
      });
    }

    const filePath = req.file ? `documents/${req.file.filename}` : null;

    await Document.create({
      owner_id: userId,
      title,
      type: type || 'other',
      client_id: client_id || null,
      deal_id: deal_id || null,
      content: content || null,
      file_path: filePath,
      generated: false,
    });

    res.redirect('/documents');
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка создания документа', status: 500 });
  }
};

// Генерация PDF
const generatePDF = async (req, res) => {
  try {
    const userId = req.user.id;
    const document = await Document.findOne({
      where: { id: req.params.id, owner_id: userId },
      include: [
        { model: Client, as: 'client', required: false },
        { model: Deal, as: 'deal', required: false },
      ],
    });

    if (!document) return res.status(404).render('error', { message: 'Документ не найден', status: 404 });

    const doc = new PDFDocument({ margin: 50 });
    const filename = `document_${document.id}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // Путь к шрифту
    const fontPath = path.join(__dirname, '../../src/public/fonts/arial.ttf');

    doc.registerFont('Arial', fontPath);
    doc.font('Arial');

    // Шапка
    doc.fontSize(20).text(document.title, { align: 'center' });
    doc.moveDown();

    // Тип
    const typeMap = { contract: 'Договор', act: 'Акт', proposal: 'Предложение', other: 'Документ' };
    doc.fontSize(12).text(`Тип: ${typeMap[document.type] || document.type}`);
    doc.text(`Дата: ${new Date(document.createdAt).toLocaleDateString('ru-RU')}`);
    doc.moveDown();

    // Клиент
    if (document.client) {
      doc.fontSize(12).text('Клиент:', { underline: true });
      doc.text(document.client.name);
      if (document.client.contact_person) doc.text(`Контакт: ${document.client.contact_person}`);
      if (document.client.email) doc.text(`Email: ${document.client.email}`);
      if (document.client.address) doc.text(`Адрес: ${document.client.address}`);
      doc.moveDown();
    }

    // Сделка
    if (document.deal) {
      doc.text('Сделка:', { underline: true });
      doc.text(`${document.deal.title} — ${document.deal.amount} ${document.deal.currency}`);
      doc.moveDown();
    }

    // Содержимое
    if (document.content) {
      doc.text('Содержание:', { underline: true });
      doc.moveDown(0.5);
      doc.text(document.content, { lineGap: 4 });
      doc.moveDown();
    }

    // Подписи
    doc.moveDown(2);
    doc.text('_______________________          _______________________');
    doc.fontSize(9).fillColor('gray').text('Подпись / Дата                             Подпись клиента / Дата');

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка генерации PDF', status: 500 });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const userId = req.user.id;
    await Document.destroy({ where: { id: req.params.id, owner_id: userId } });
    res.redirect('/documents');
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка удаления', status: 500 });
  }
};

module.exports = { getDocuments, getDocument, getNewDocument, postDocument, generatePDF, deleteDocument, upload };