const cron = require('node-cron');
const { Invoice, Client, Task, Notification, User } = require('../models/index');
const { Op } = require('sequelize');
const { sendMail } = require('../config/mailer');

const startCronJobs = () => {

  // Каждый день в 09:00 — помечаем просроченные счета
  cron.schedule('0 9 * * *', async () => {
    try {
      console.log('⏰ Cron: проверка просроченных счетов...');

      const overdueInvoices = await Invoice.findAll({
        where: {
          status: 'issued',
          due_date: { [Op.lt]: new Date() },
        },
        include: [{ model: Client, as: 'client' }],
      });

      for (const invoice of overdueInvoices) {
        await invoice.update({ status: 'overdue' });

        // Найти владельца клиента
        const owner = await User.findByPk(invoice.client.owner_id);
        if (!owner) continue;

        // Уведомление бизнесу
        await Notification.create({
          user_id: owner.id,
          message: `Счёт на сумму ${invoice.amount} ${invoice.currency} для ${invoice.client.name} просрочен`,
          type: 'invoice',
        });

        // Email бизнесу
        await sendMail({
          to: owner.email,
          subject: 'Просроченный счёт',
          html: `<p>Счёт на сумму <strong>${invoice.amount} ${invoice.currency}</strong> 
                 для клиента <strong>${invoice.client.name}</strong> просрочен.</p>`,
        }).catch(err => console.error('Email error:', err));
      }

      console.log(`✅ Cron: обработано ${overdueInvoices.length} просроченных счетов`);
    } catch (err) {
      console.error('❌ Cron error (invoices):', err);
    }
  });

  // Каждый день в 09:00 — напоминание о задачах с дедлайном завтра
  cron.schedule('0 9 * * *', async () => {
    try {
      console.log('⏰ Cron: проверка задач с дедлайном завтра...');

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const tasks = await Task.findAll({
        where: {
          status: { [Op.ne]: 'done' },
          deadline: {
            [Op.gte]: tomorrow,
            [Op.lt]: dayAfter,
          },
        },
      });

      for (const task of tasks) {
        await Notification.create({
          user_id: task.created_by,
          message: `Завтра дедлайн задачи: "${task.title}"`,
          type: 'task',
        });
      }

      console.log(`✅ Cron: напоминаний о задачах создано: ${tasks.length}`);
    } catch (err) {
      console.error('❌ Cron error (tasks):', err);
    }
  });

  // Каждый день в 09:00 — напоминание о сделках без движения 7+ дней
  cron.schedule('0 9 * * *', async () => {
    try {
      console.log('⏰ Cron: проверка застрявших сделок...');

      const { Deal } = require('../models/index');
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const staleDeals = await Deal.findAll({
        where: {
          stage: { [Op.notIn]: ['won', 'lost'] },
          last_updated: { [Op.lt]: sevenDaysAgo },
        },
        include: [{ model: Client, as: 'client' }],
      });

      for (const deal of staleDeals) {
        await Notification.create({
          user_id: deal.manager_id,
          message: `Сделка "${deal.title}" не двигалась больше 7 дней`,
          type: 'deal',
        });
      }

      console.log(`✅ Cron: застрявших сделок: ${staleDeals.length}`);
    } catch (err) {
      console.error('❌ Cron error (deals):', err);
    }
  });

  console.log('✅ Cron jobs запущены');
};

module.exports = { startCronJobs };