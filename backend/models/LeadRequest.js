const mongoose = require('mongoose');
const { Schema } = mongoose;

const leadRequestSchema = new Schema({
  company: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  // payload do cliente
  nome: { type: String, required: true, trim: true },
  contato: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  comentario: { type: String, default: null },
  origem: { type: Schema.Types.ObjectId, ref: 'Origem', default: null }, // opcional; admin/servidor pode setar
  // corretor
  corretorResponsavel: { type: Schema.Types.ObjectId, ref: 'BrokerContact', required: true },
  submittedByBroker: { type: Schema.Types.ObjectId, ref: 'BrokerContact', required: true },
  // status
  status: { type: String, enum: ['Pendente', 'Aprovado', 'Rejeitado'], default: 'Pendente', index: true },
  rejectReason: { type: String, default: null },
}, { timestamps: true });

leadRequestSchema.index({ company: 1, contato: 1, status: 1 });
module.exports = mongoose.model('LeadRequest', leadRequestSchema);