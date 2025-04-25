// models/Lead.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

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
      required: [true, "A origem do lead é obrigatória."],
    },
    responsavel: { type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "O responsável pelo lead é obrigatório."],
    },

    company: {   type: Schema.Types.ObjectId,
      ref: 'Company', 
      required: [true, 'A empresa do lead é obrigatória.'], 
      index: true 
  },

  },
  {
    timestamps: true, 
  }
);



const Lead = mongoose.model("Lead", leadSchema);
module.exports = Lead;