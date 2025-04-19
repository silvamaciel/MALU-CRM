const mongoose = require("mongoose");

const LeadStageSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: true,
    },
    ordem: {
      type: Number,
      required: true,
    },
    cor: {
      type: String,
      default: "#1976D2", // Azul padrão, você pode customizar depois
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("LeadStage", LeadStageSchema);
