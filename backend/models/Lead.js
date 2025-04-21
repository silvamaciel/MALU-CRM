// models/Lead.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const leadSchema = new Schema(
  {
    // --- Campos Essenciais ---
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
      required: [true, "O email do lead é obrigatório."],
      // Opcional: match: [/\S+@\S+\.\S+/, 'Email inválido.']
    },
    nascimento: {
      type: Date,
      required: false, // Opcional
    },
    endereco: {
      type: String,
      required: false, // Opcional
    },
    // --- REMOVIDO o campo CPF ---

    situacao: { // <-- Obrigatório
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
      required: [true, "A origem do lead é obrigatória."],
    },
    responsavel: { 
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "O responsável pelo lead é obrigatório."],
    },
  },
  {
    timestamps: true, 
  }
);



const Lead = mongoose.model("Lead", leadSchema);
module.exports = Lead;