const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  client_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  deal_id: {
    type: DataTypes.UUID,
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'USD',
  },
  status: {
    type: DataTypes.ENUM('issued', 'pending', 'paid', 'overdue'),
    defaultValue: 'issued',
  },
  due_date: {
    type: DataTypes.DATE,
  },
  description: {
    type: DataTypes.TEXT,
  },
  confirmation_file: {
    type: DataTypes.STRING,
  },
  confirmed_at: {
    type: DataTypes.DATE,
  },
  paid_at: {
    type: DataTypes.DATE,
  },
}, {
  tableName: 'invoices',
  timestamps: true,
});

module.exports = Invoice;