const mongoose = require('mongoose');

const LeadHistoricoSchema = new mongoose.Schema({
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  acao: {
    type: String,
    required: true
  },
  descricao: {
    type: String
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  data: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('LeadHistorico', LeadHistoricoSchema);
