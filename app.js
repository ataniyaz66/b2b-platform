const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');

const errorHandler = require('./src/middleware/errorHandler');
const authRoutes = require('./src/routes/authRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const clientRoutes = require('./src/routes/clientRoutes');
const dealRoutes = require('./src/routes/dealRoutes');
const invoiceRoutes = require('./src/routes/invoiceRoutes');
const taskRoutes = require('./src/routes/taskRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const documentRoutes = require('./src/routes/documentRoutes');
const portalRoutes = require('./src/routes/portalRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));
app.set('view cache', false);
app.locals.rmWhitespace = false;

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'src/public')));

app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/clients', clientRoutes);
app.use('/deals', dealRoutes);
app.use('/invoices', invoiceRoutes);
app.use('/tasks', taskRoutes);
app.use('/reports', reportRoutes);
app.use('/documents', documentRoutes);
app.use('/portal', portalRoutes);
app.use('/notifications', notificationRoutes);

app.get('/', (req, res) => res.redirect('/auth/login'));

app.use(errorHandler);

module.exports = app;