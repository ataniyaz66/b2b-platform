const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');

const errorHandler = require('./src/middleware/errorHandler');
const authRoutes = require('./src/routes/authRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const clientRoutes = require('./src/routes/clientRoutes');
const dealRoutes = require('./src/routes/dealRoutes');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'src/public')));

app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/clients', clientRoutes);
app.use('/deals', dealRoutes);

app.get('/', (req, res) => res.redirect('/auth/login'));

app.use(errorHandler);

module.exports = app;