const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models/index');

// Генерация токена
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role, company_name: user.company_name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// Страница регистрации
const getRegister = (req, res) => {
  res.render('auth/register', { error: null });
};

// Регистрация бизнес-аккаунта
const postRegister = async (req, res) => {
  try {
    const { company_name, email, password } = req.body;

    if (!company_name || !email || !password) {
      return res.render('auth/register', { error: 'Заполните все поля' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.render('auth/register', { error: 'Email уже зарегистрирован' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      company_name,
      email,
      password_hash,
      role: 'business',
    });

    const token = generateToken(user);
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.render('auth/register', { error: 'Ошибка сервера' });
  }
};

// Страница входа
const getLogin = (req, res) => {
  res.render('auth/login', { error: null });
};

// Вход бизнес-аккаунта
const postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email, role: 'business' } });
    if (!user) {
      return res.render('auth/login', { error: 'Неверный email или пароль' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.render('auth/login', { error: 'Неверный email или пароль' });
    }

    const token = generateToken(user);
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.render('auth/login', { error: 'Ошибка сервера' });
  }
};

// Вход клиента
const getClientLogin = (req, res) => {
  res.render('auth/client-login', { error: null });
};

const postClientLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email, role: 'client' } });
    if (!user) {
      return res.render('auth/client-login', { error: 'Неверный email или пароль' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.render('auth/client-login', { error: 'Неверный email или пароль' });
    }

    const token = generateToken(user);
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.redirect('/portal');
  } catch (err) {
    console.error(err);
    res.render('auth/client-login', { error: 'Ошибка сервера' });
  }
};

// Выход
const logout = (req, res) => {
  res.clearCookie('token');
  res.redirect('/auth/login');
};

module.exports = {
  getRegister,
  postRegister,
  getLogin,
  postLogin,
  getClientLogin,
  postClientLogin,
  logout,
};