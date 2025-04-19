// models/Lead.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const leadSchema = new Schema(
  {
    // --- CAMPOS ESSENCIAIS ---
    nome: {
      type: String,
      required: [true, "O nome do lead é obrigatório."],
    },
    contato: {
      type: String,
      required: [true, "O contato do lead é obrigatório."],
    },
    email: {
      type: String,
      required: [true, "O email do lead é obrigatório."],
      // Opcional: match: [/\S+@\S+\.\S+/, 'Por favor, insira um endereço de e-mail válido.']
    },
    nascimento: {
      type: Date,
      required: false,
    },
    endereco: {
      type: String,
      required: false,
    },
    cpf: { // <-- Campo CPF incluído
      type: String,
      required: false,
      unique: true,
      sparse: true,
    },
    situacao: { // <-- Campo Situacao presente
      type: Schema.Types.ObjectId,
      ref: "LeadStage",
      required: [true, "A situação do lead é obrigatória."],
    },
    motivoDescarte: {
      type: String,
      default: null,
    },
    comentario: {
      type: String,
      default: null,
    },
    origem: { // <-- Campo Origem presente
      type: Schema.Types.ObjectId,
      ref: "Origem",
      required: [true, "A origem do lead é obrigatória."],
    },
    responsavel: { // <-- Campo Responsavel presente
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "O responsável pelo lead é obrigatório."],
    },
    // --- FIM CAMPOS ESSENCIAIS ---
  },
  {
    // Adiciona createdAt e updatedAt automaticamente
    timestamps: true,
  }
);

// --- Hooks (MANTIDOS) ---
leadSchema.post("save", function (error, doc, next) {
  if (
    error.name === "MongoServerError" &&
    error.code === 11000 &&
    error.keyPattern?.cpf
  ) {
    next(new Error("Este CPF já está cadastrado para outro lead."));
  } else {
    next(error);
  }
});

leadSchema.post("findOneAndUpdate", function (error, doc, next) {
  if (
    error.name === "MongoServerError" &&
    error.code === 11000 &&
    error.keyPattern?.cpf
  ) {
    next(new Error("Este CPF já está cadastrado para outro lead."));
  } else {
    next(error);
  }
});
// --- FIM Hooks ---

const Lead = mongoose.model("Lead", leadSchema);
module.exports = Lead;