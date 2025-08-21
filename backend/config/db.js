// config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const isProd = process.env.NODE_ENV === 'production';

    await mongoose.connect(process.env.MONGO_URI, {
      autoIndex: !isProd,
      maxPoolSize: 10,
    });

    console.log('MongoDB conectado com sucesso! autoIndex =', !isProd);

    // await seedDiscardReasons();
  } catch (error) {
    console.error('Erro ao conectar no MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
