// models/LeadHistory.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const leadHistorySchema = new Schema(
  {
    lead: {
      type: Schema.Types.ObjectId,
      ref: "Lead", 
      required: true,
      index: true, 
    },

    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false, 
      default: null,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "CRIACAO",
        "ATUALIZACAO",
        "DESCARTE",
        "REATIVACAO",
        "RESERVA_CRIADA",
        "RESERVA_CANCELADA", 
        "RESERVA_EXPIRADA",  
        "PROPOSTA_CRIADA",
        "RESERVA_CANCELADA_STATUS_LEAD",
        "UNIDADE_LIBERADA"
      ],
    },
    details: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true, 
  }
);

const LeadHistory = mongoose.model("LeadHistory", leadHistorySchema);

module.exports = LeadHistory;
