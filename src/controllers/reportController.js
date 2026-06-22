const { Client, Deal, Invoice, Task } = require('../models/index');
const { Op, fn, col, literal } = require('sequelize');

const getReports = async (req, res) => {
  try {
    const userId = req.user.id;

    // Сделки по стадиям
    const dealsByStage = await Deal.findAll({
      where: { manager_id: userId },
      attributes: ['stage', [fn('COUNT', col('id')), 'count'], [fn('SUM', col('amount')), 'total']],
      group: ['stage'],
      raw: true,
    });

    // Счета по статусам
    const invoicesByStatus = await Invoice.findAll({
      attributes: ['status', [fn('COUNT', col('Invoice.id')), 'count'], [fn('SUM', col('amount')), 'total']],
      include: [{ model: Client, as: 'client', where: { owner_id: userId }, attributes: [] }],
      group: ['Invoice.status'],
      raw: true,
    });

    // Общая сумма оплаченных счетов
    const paidTotal = invoicesByStatus.find(i => i.status === 'paid');

    // Клиенты по статусам
    const clientsByStatus = await Client.findAll({
      where: { owner_id: userId },
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true,
    });

    // Задачи по статусам
    const tasksByStatus = await Task.findAll({
      where: { created_by: userId },
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true,
    });

    // Топ клиенты по сумме сделок
    const topClients = await Deal.findAll({
      where: { manager_id: userId },
      attributes: ['client_id', [fn('SUM', col('amount')), 'total']],
      include: [{ model: Client, as: 'client', attributes: ['name'] }],
      group: ['Deal.client_id', 'client.id'],
      order: [[literal('total'), 'DESC']],
      limit: 5,
      raw: true,
    });

    const { Notification } = require('../models/index');
    const unreadCount = await Notification.count({ where: { user_id: userId, is_read: false } });

    res.render('reports/index', {
      title: 'Отчёты',
      path: '/reports',
      user: req.user,
      unreadCount,
      dealsByStage,
      invoicesByStatus,
      clientsByStatus,
      tasksByStatus,
      topClients,
      paidTotal: paidTotal ? parseFloat(paidTotal.total || 0) : 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка загрузки отчётов', status: 500 });
  }
};

module.exports = { getReports };