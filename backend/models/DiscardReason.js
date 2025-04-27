// models/DiscardReason.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const discardReasonSchema = new Schema(
  {
    nome: {
      type: String,
      required: [true, "O nome do motivo de descarte é obrigatório."],
      trim: true,
    },

    company: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'A empresa é obrigatória para o motivo de descarte.'],
      index: true
  }
  },
  
  {
    timestamps: true,
  }
);


discardReasonSchema.index({ company: 1, nome: 1 }, { unique: true });

discardReasonSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000 && error.keyPattern?.company && error.keyPattern?.nome) {
      next(new Error(`O motivo de descarte com nome '${doc.nome}' já existe nesta empresa.`));
  } else {
      next(error);
  }
});

const DiscardReason = mongoose.model("DiscardReason", discardReasonSchema);

module.exports = DiscardReason;
