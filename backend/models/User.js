const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  senha: {
    type: String,
    required: false
  },
  perfil: {
    type: String,
    enum: ['admin', 'corretor', 'usuario'],
    default: 'usuario'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', UserSchema);
