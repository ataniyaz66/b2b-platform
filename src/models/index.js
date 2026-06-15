const User = require('./User');
const Client = require('./Client');
const Deal = require('./Deal');
const Invoice = require('./Invoice');
const Task = require('./Task');
const Notification = require('./Notification');

// User -> Client (владелец)
User.hasMany(Client, { foreignKey: 'owner_id', as: 'clients' });
Client.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });

// User -> Deal (менеджер)
User.hasMany(Deal, { foreignKey: 'manager_id', as: 'deals' });
Deal.belongsTo(User, { foreignKey: 'manager_id', as: 'manager' });

// Client -> Deal
Client.hasMany(Deal, { foreignKey: 'client_id', as: 'deals' });
Deal.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

// Client -> Invoice
Client.hasMany(Invoice, { foreignKey: 'client_id', as: 'invoices' });
Invoice.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

// Deal -> Invoice
Deal.hasMany(Invoice, { foreignKey: 'deal_id', as: 'invoices' });
Invoice.belongsTo(Deal, { foreignKey: 'deal_id', as: 'deal' });

// Client -> Task
Client.hasMany(Task, { foreignKey: 'client_id', as: 'tasks' });
Task.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

// Deal -> Task
Deal.hasMany(Task, { foreignKey: 'deal_id', as: 'tasks' });
Task.belongsTo(Deal, { foreignKey: 'deal_id', as: 'deal' });

// User -> Task (создатель)
User.hasMany(Task, { foreignKey: 'created_by', as: 'created_tasks' });
Task.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// User -> Notification
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = { User, Client, Deal, Invoice, Task, Notification };