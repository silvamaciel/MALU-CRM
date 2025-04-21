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
    motivoDescarte: { // <-- VOLTOU a ser String
      type: String,
      default: null,
    },
    comentario: {
      type: String,
      default: null,
    },
    origem: { // <-- Obrigatório
      type: Schema.Types.ObjectId,
      ref: "Origem", // Verifique nome do Model 'Origem'/'origem'
      required: [true, "A origem do lead é obrigatória."],
    },
    responsavel: { // <-- Obrigatório
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "O responsável pelo lead é obrigatório."],
    },
  },
  {
    timestamps: true, // Mantém createdAt e updatedAt
  }
);

// REMOVIDOS Hooks de validação/formatação CPF ou Telefone que pudessem existir aqui
// MANTIDOS Hooks de erro de duplicação (se aplicável a outros campos unique que você tenha)
// Exemplo (se CPF fosse mantido, mas não é o caso agora):
/*
leadSchema.post("save", function (error, doc, next) {
  if (error.name === "MongoServerError" && error.code === 11000) {
     // Adapte a mensagem para qual campo deu duplicidade, se houver outros unique
     next(new Error("Erro de duplicidade ao salvar."));
  } else { next(error); }
});
leadSchema.post("findOneAndUpdate", function (error, doc, next) {
   if (error.name === "MongoServerError" && error.code === 11000) {
     next(new Error("Erro de duplicidade ao atualizar."));
   } else { next(error); }
});
*/

const Lead = mongoose.model("Lead", leadSchema);
module.exports = Lead;