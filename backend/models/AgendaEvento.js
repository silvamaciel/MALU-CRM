const mongoose = require('mongoose');

const agendaEventoSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  titulo: { type: String, required: true },
  descricao: { type: String },
  dataInicio: { type: Date, required: true },
  dataFim: { type: Date, required: true },
  origem: { type: String, enum: ['google', 'local'], default: 'local' },
  googleEventId: { type: String, index: true }, // para linkar evento Google
}, { timestamps: true });

module.exports = mongoose.model('AgendaEvento', agendaEventoSchema);
