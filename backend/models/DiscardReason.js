// models/DiscardReason.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const discardReasonSchema = new Schema({
  nome: {
    type: String,
    required: [true, 'O nome do motivo de descarte é obrigatório.'],
    unique: true, // Garante que os motivos sejam únicos
    trim: true
  },
  // Você pode adicionar outros campos se precisar, como 'ativo: Boolean'
}, {
  timestamps: true // Adiciona createdAt e updatedAt
});



const DiscardReason = mongoose.model('DiscardReason', discardReasonSchema);

module.exports = DiscardReason;