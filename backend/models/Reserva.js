// backend/models/Reserva.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const reservaSchema = new Schema({
    lead: {
        type: Schema.Types.ObjectId,
        ref: 'Lead',
        required: [true, 'O Lead é obrigatório para a reserva.'],
        index: true
    },
    imovel: { 
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'tipoImovel'
    },
    tipoImovel: {
        type: String,
        required: true,
        enum: ['Unidade', 'ImovelAvulso']
    },
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: false, // vai ser setado via pre-save
        index: true
    },
    dataReserva: {
        type: Date,
        required: [true, 'A Data da Reserva é obrigatória.'],
        default: Date.now
    },
    validadeReserva: {
        type: Date,
        required: [true, 'A Data de Validade da Reserva é obrigatória.']
    },
    valorSinal: {
        type: Number,
        required: false,
        min: [0, 'O valor do sinal não pode ser negativo.']
    },
    observacoesReserva: {
        type: String,
        trim: true
    },
    statusReserva: {
        type: String,
        required: [true, 'O Status da Reserva é obrigatório.'],
        enum: {
            values: ["Pendente", "Ativa", "Expirada", "Cancelada", "ConvertidaEmProposta", "ConvertidaEmVenda", "Distratada"],
            message: 'Status da Reserva inválido: {VALUE}.'
        },
        default: "Ativa",
        index: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'O usuário criador da reserva é obrigatório.']
    },
    propostaId: { 
        type: Schema.Types.ObjectId, 
        ref: 'Proposta',
        required: false 
    },
    vendaId: { 
        type: Schema.Types.ObjectId, 
        ref: 'Venda',
        required: false 
    },
}, {
    timestamps: true
});

// Índice ÚNICO PARCIAL: Garante que só pode haver UMA reserva ATIVA para um imóvel (unidade).
reservaSchema.index(
    { imovel: 1, statusReserva: 1 },
    {
        unique: true,
        partialFilterExpression: { statusReserva: "Ativa" },
        name: "imovel_statusReserva_ativa_unique_idx"
    }
);

// Validação de consistência e lógica de negócio
reservaSchema.pre('save', async function(next) {
    if (this.isNew) {
        try {
            // Valida e seta empresa com base no lead
            const LeadModel = mongoose.model('Lead');
            const lead = await LeadModel.findById(this.lead).select('company').lean();

            if (lead?.company) {
                if (this.company && !this.company.equals(lead.company)) {
                    return next(new Error('Conflito de CompanyID entre Reserva e Lead. A reserva deve pertencer à mesma empresa do Lead.'));
                }
                this.company = lead.company;
            } else {
                return next(new Error('Lead associado à reserva não encontrado ou sem CompanyID.'));
            }

            // Valida se imóvel (Unidade) está disponível
            if (this.statusReserva === "Ativa" && this.tipoImovel === "Unidade") {
                const UnidadeModel = mongoose.model('Unidade');
                const unidade = await UnidadeModel.findById(this.imovel).select('statusUnidade').lean();

                if (!unidade || unidade.statusUnidade !== "Disponível") {
                    return next(new Error(`A unidade ${this.imovel} não está Disponível para reserva.`));
                }
            }

        } catch (error) {
            return next(error);
        }
    }
    next();
});

const Reserva = mongoose.model('Reserva', reservaSchema);
module.exports = Reserva;
