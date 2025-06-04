// models/LeadStage.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const leadStageSchema = new Schema(
  {
    nome: {
      type: String,
      required: [true, "O nome da situação é obrigatório."],
      trim: true,
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "A empresa da situação é obrigatória."],
      index: true,
    },
    ativo: {
      type: Boolean,
      default: true,
    },
    ordem: { 
        type: Number,
        default: 0 
    },
  },
  {
    timestamps: true,
  }
);


leadStageSchema.index({ company: 1, nome: 1 }, { unique: true });
leadStageSchema.index({ company: 1, ordem: 1 });

// hooks post-save para erros de duplicidade de nome estão bons
leadStageSchema.post("save", function (error, doc, next) {
  if (
    error.name === "MongoServerError" &&
    error.code === 11000 &&
    error.keyPattern?.company &&
    error.keyPattern?.nome
  ) {
    // Adiciona o nome do documento ao erro para melhor feedback
    next(new Error(`A situação '${doc ? doc.nome : this.nome}' já existe nesta empresa.`));
  } else {
    next(error);
  }
});
leadStageSchema.post("findOneAndUpdate", function (error, doc, next) { 
  if (
    error.name === "MongoServerError" &&
    error.code === 11000 &&
    error.keyPattern?.company &&
    error.keyPattern?.nome
  ) {
    next(
      new Error(`Erro ao atualizar: Nome de situação já existe nesta empresa.`)
    );
  } else {
    next(error);
  }
});


const LeadStage = mongoose.model("LeadStage", leadStageSchema);

module.exports = LeadStage;