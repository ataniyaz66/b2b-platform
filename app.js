const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');

const errorHandler = require('./src/middleware/errorHandler');
const authRoutes = require('./src/routes/authRoutes');

const app = express();

// Шаблонизатор
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'src/public')));

// Роуты
app.use('/auth', authRoutes);

app.get('/', (req, res) => {
  res.redirect('/auth/login');
});

// Error handler (всегда последний)
app.use(errorHandler);

module.exports = app;