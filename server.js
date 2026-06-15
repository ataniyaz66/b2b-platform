require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./src/config/db');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('✅ База данных подключена');

    await sequelize.sync({ alter: true });
    console.log('✅ Модели синхронизированы');

    app.listen(PORT, () => {
      console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Ошибка запуска:', error);
    process.exit(1);
  }
}

start();