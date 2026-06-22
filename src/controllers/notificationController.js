const { Notification } = require('../models/index');

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await Notification.findAll({
      where: { user_id: userId },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    await Notification.update(
      { is_read: true },
      { where: { user_id: userId, is_read: false } }
    );

    res.render('notifications/index', {
      title: 'Уведомления',
      path: '/notifications',
      user: req.user,
      unreadCount: 0,
      notifications,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка загрузки уведомлений', status: 500 });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.count({
      where: { user_id: req.user.id, is_read: false },
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка' });
  }
};

module.exports = { getNotifications, getUnreadCount };