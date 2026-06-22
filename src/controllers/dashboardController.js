const { Client, Deal, Invoice, Task, Notification } = require('../models/index');
const { Op } = require('sequelize');

const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Считаем статистику
    const clientsCount = await Client.count({ where: { owner_id: userId } });
    const dealsCount = await Deal.count({ where: { manager_id: userId } });
    const invoicesCount = await Invoice.count({
      include: [{ model: Client, as: 'client', where: { owner_id: userId } }],
    });

    // Активные сделки (не выиграны и не проиграны)
    const activeDeals = await Deal.count({
      where: {
        manager_id: userId,
        stage: { [Op.notIn]: ['won', 'lost'] },
      },
    });

    // Просроченные задачи
    const overdueTasks = await Task.findAll({
      where: {
        created_by: userId,
        status: { [Op.ne]: 'done' },
        deadline: { [Op.lt]: new Date() },
      },
      limit: 5,
      order: [['deadline', 'ASC']],
    });

    // Последние сделки
    const recentDeals = await Deal.findAll({
      where: { manager_id: userId },
      include: [{ model: Client, as: 'client' }],
      order: [['createdAt', 'DESC']],
      limit: 5,
    });

    // Непрочитанные уведомления
    const unreadCount = await Notification.count({
      where: { user_id: userId, is_read: false },
    });

    res.render('dashboard', {
      title: 'Дашборд',
      path: '/dashboard',
      user: req.user,
      unreadCount,
      stats: {
        clientsCount,
        dealsCount,
        invoicesCount,
        activeDeals,
      },
      overdueTasks,
      recentDeals,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка загрузки дашборда', status: 500 });
  }
};

module.exports = { getDashboard };