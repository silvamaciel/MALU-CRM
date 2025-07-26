// backend/models/Unidade.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const unidadeSchema = new Schema(
  {
    empreendimento: {
      type: Schema.Types.ObjectId,
      ref: "Empreendimento",
      required: true,
      index: true,
    },
    identificador: {
      type: String,
      required: [true, "O identificador da unidade é obrigatório."],
      trim: true,
    },
    tipologia: {
      type: String,
      trim: true,
    },
    areaUtil: {
      type: Number,
      min: [0, "Área útil não pode ser negativa."],
    },
    areaTotal: {
      type: Number,
      min: [0, "Área total não pode ser negativa."],
    },
    precoTabela: {
      type: Double,
      min: [0, "Preço não pode ser negativo."],
    },
    statusUnidade: {
      type: String,
      required: [true, "O status da unidade é obrigatório."],
      enum: {
        values: [
          "Disponível",
          "Reservada",
          "Proposta",
          "Vendido",
          "Bloqueado",
        ],
        message: "Status de unidade inválido: {VALUE}.",
      },
      default: "Disponível",
    },
    descricao: {
      type: String,
      trim: true,
    },
    destaque: {
      type: Boolean,
      default: false,
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    ativo: {
      type: Boolean,
      default: true,
    },
    currentLeadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      required: false,
      default: null,
      index: true,
      sparse: true,
    },
    currentReservaId: { type: Schema.Types.ObjectId, ref: "Reserva" },
    
    currentLeadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      required: false,
      default: null,
      index: true, 
      sparse: true, 
    },

    currentReservaId: { // ID da Reserva ATIVA para esta unidade
    type: Schema.Types.ObjectId,
    ref: 'Reserva',
    required: false,
    default: null,
    unique: true, 
    sparse: true 
    },


  },
  {
    timestamps: true,
  }
);

unidadeSchema.index({ empreendimento: 1, identificador: 1 }, { unique: true });

unidadeSchema.pre("save", async function (next) {
  if (this.isNew || this.isModified("empreendimento")) {
    try {
      const EmpreendimentoModel = mongoose.model("Empreendimento");
      const emp = await EmpreendimentoModel.findById(this.empreendimento)
        .select("company")
        .lean();
      if (emp) {
        this.company = emp.company;
      } else {
        next(
          new Error(
            "Empreendimento pai não encontrado para definir o companyId da unidade."
          )
        );
        return;
      }
    } catch (error) {
      next(error);
      return;
    }
  }
  next();
});

const Unidade = mongoose.model("Unidade", unidadeSchema);
module.exports = Unidade;
