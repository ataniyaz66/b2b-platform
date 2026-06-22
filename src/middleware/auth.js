const jwt = require('jsonwebtoken');

// Проверка JWT токена
const authenticate = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.redirect('/auth/login');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.clearCookie('token');
    return res.redirect('/auth/login');
  }
};

// Только для бизнеса
const requireBusiness = (req, res, next) => {
  if (req.user?.role !== 'business') {
    return res.status(403).render('error', {
      message: 'Доступ запрещён',
      status: 403,
    });
  }
  next();
};

// Только для клиента
const requireClient = (req, res, next) => {
  if (req.user?.role !== 'client') {
    return res.status(403).render('error', {
      message: 'Доступ запрещён',
      status: 403,
    });
  }
  next();
};

module.exports = { authenticate, requireBusiness, requireClient };