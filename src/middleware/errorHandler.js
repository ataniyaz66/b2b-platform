const errorHandler = (err, req, res, next) => {
  console.error('❌ Ошибка:', err.stack);

  const status = err.status || 500;
  const message = err.message || 'Внутренняя ошибка сервера';

  // Если запрос ждёт JSON
  if (req.headers['content-type'] === 'application/json') {
    return res.status(status).json({ success: false, message });
  }

  res.status(status).render('error', { message, status });
};

module.exports = errorHandler;