// models/LeadRequest.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const coadquirenteSchema = new Schema({
  nome: { type: String, required: true, trim: true },
  cpf: { type: String, trim: true },
  rg: { type: String, trim: true },
  nacionalidade: { type: String, trim: true, default: 'Brasileiro(a)' },
  estadoCivil: {
    type: String,
    trim: true,
    enum: ["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)", "União Estável", "Outro"]
  },
  profissao: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  contato: { type: String, trim: true },
  endereco: { type: String, trim: true },
  nascimento: { type: Date },
}, { _id: false });

const leadRequestSchema = new Schema({
  company: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },

  // dados do cliente (espelham Lead)
  nome: { type: String, required: true, trim: true },
  contato: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  nascimento: { type: Date },
  endereco: { type: String, trim: true },
  cpf: { type: String, trim: true },
  rg: { type: String, trim: true },
  nacionalidade: { type: String, trim: true, default: 'Brasileiro(a)' },
  estadoCivil: {
    type: String,
    trim: true,
    enum: ["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)", "União Estável", "Outro"]
  },
  profissao: { type: String, trim: true },
  comentario: { type: String, default: null },
  origem: { type: Schema.Types.ObjectId, ref: 'Origem', default: null },

  coadquirentes: { type: [coadquirenteSchema], default: [] },

  // corretor
  corretorResponsavel: { type: Schema.Types.ObjectId, ref: 'BrokerContact', required: true },
  submittedByBroker: { type: Schema.Types.ObjectId, ref: 'BrokerContact', required: true },

  // metadados
  tags: [{ type: String, trim: true, lowercase: true }], // opcional (paridade)

  // status
  status: { type: String, enum: ['Pendente', 'Aprovado', 'Rejeitado'], default: 'Pendente', index: true },
  rejectReason: { type: String, default: null },
}, { timestamps: true });

// índices
leadRequestSchema.index({ company: 1, contato: 1, status: 1 });
leadRequestSchema.index({ company: 1, email: 1, status: 1 }, { sparse: true });

module.exports = mongoose.model('LeadRequest', leadRequestSchema);
