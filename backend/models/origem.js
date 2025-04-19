const mongoose = require('mongoose');

const origemSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  descricao: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Origem', origemSchema);
