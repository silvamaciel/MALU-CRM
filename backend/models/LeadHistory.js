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
        "UNIDADE_LIBERADA",
        "PROPOSTA_CONTRATO_CRIADA",
        "PROPOSTA_STATUS_ALTERADO", 
        "VENDA_CONCRETIZADA",
        "DISTRATO_REALIZADO",
        "PROPOSTA_STATUS_ASSINADO",
        "PROPOSTA_STATUS_VENDIDO",
        "PROPOSTA_STATUS_RECUSADO",    
        "PROPOSTA_STATUS_CANCELADO",  
        "PROPOSTA_STATUS_DISTRATO_REALIZADO",
        "DISTRATO_REALIZADO"
      ],
      message: 'Valor de ação inválido: {VALUE}'
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
