// models/Lead.js
const mongoose = require("mongoose");
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


const leadSchema = new Schema(
  {
    nome: {
      type: String,
      required: [true, "O nome do lead é obrigatório."],
    },
    contato: { // <-- Sem formatação/validação extra aqui
      type: String,
      required: [true, "O contato do lead é obrigatório."],
    },
    email: {
      type: String,
      required: [false, "O email do lead é obrigatório."],
      match: [/\S+@\S+\.\S+/, 'Email inválido.'],
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true
    },
    nascimento: {
      type: Date,
      required: false, // Opcional
    },
    endereco: {
      type: String,
      required: false, // Opcional
    },

    cpf: { type: String, required: false, unique: true, sparse: true },

    rg: { type: String, trim: true },
    nacionalidade: { type: String, trim: true, default: 'Brasileiro(a)' },
    estadoCivil: {
      type: String,
      trim: true,
      enum: ["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)", "União Estável", "Outro"]
    },
    profissao: { type: String, trim: true },
    nascimento: { type: Date },
    endereco: { type: String, trim: true },

    coadquirentes: {
      type: [coadquirenteSchema],
      default: [] // Default para um array vazio
    },


    situacao: {
      type: Schema.Types.ObjectId,
      ref: "LeadStage",
      required: [true, "A situação do lead é obrigatória."],
    },
    motivoDescarte: {
      type: Schema.Types.ObjectId,
      ref: 'DiscardReason',
      required: false,
      default: null
    },
    comentario: {
      type: String,
      default: null,
    },
    origem: {
      type: Schema.Types.ObjectId,
      ref: "Origem",
      required: [false, "A origem do lead é obrigatória."]
    },
    responsavel: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "O responsável pelo lead é obrigatório."],
    },

    company: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'A empresa do lead é obrigatória.'],
      index: true
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true
    }],

    submittedByBroker: {
      type: Schema.Types.ObjectId,
      ref: 'BrokerContact',
      default: null
    },
    approvalStatus: {
      type: String,
      enum: ['Aprovado', 'Pendente', 'Rejeitado'],
      default: 'Aprovado',
      index: true
    },

  },
  {
    timestamps: true,
  }
);

leadSchema.index({ company: 1, contato: 1 }, { unique: true, sparse: true });
leadSchema.index({ company: 1, email: 1 }, { unique: true, sparse: true });


const Lead = mongoose.model("Lead", leadSchema);
module.exports = Lead;