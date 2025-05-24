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
    empreendimento: {
        type: Schema.Types.ObjectId,
        ref: 'Empreendimento',
        required: [true, 'O Empreendimento é obrigatório para a reserva.'],
        index: true
    },
    unidade: {
        type: Schema.Types.ObjectId,
        ref: 'Unidade',
        required: [true, 'A Unidade é obrigatória para a reserva.'],
        index: true
    },
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: [true, 'A Empresa é obrigatória para a reserva.'],
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
            values: ["Pendente", "Ativa", "Expirada", "Cancelada", "ConvertidaEmProposta", "ConvertidaEmVenda"],
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
        ref: 'Proposta', // Supondo um futuro modelo Proposta
        required: false 
    },
    vendaId: { 
        type: Schema.Types.ObjectId, 
        ref: 'Venda', // Supondo um futuro modelo Venda
        required: false 
    },
}, {
    timestamps: true
});

// Índice ÚNICO PARCIAL: Garante que só pode haver UMA reserva ATIVA para uma unidade.
// Permite múltiplas reservas para a mesma unidade se as anteriores estiverem Expirada, Cancelada, etc.
reservaSchema.index(
    { unidade: 1, statusReserva: 1 },
    {
        unique: true,
        partialFilterExpression: { statusReserva: "Ativa" },
        name: "unidade_statusReserva_ativa_unique_idx" // Nome descritivo para o índice
    }
);


reservaSchema.pre('save', async function(next) {
    if (this.isNew) {
        try {
            // Garante CompanyID consistente com o Lead
            const LeadModel = mongoose.model('Lead');
            const lead = await LeadModel.findById(this.lead).select('company').lean();
            if (lead && lead.company) {
                if (this.company && !this.company.equals(lead.company)) {
                     return next(new Error('Conflito de CompanyID entre Reserva e Lead. A reserva deve pertencer à mesma empresa do Lead.'));
                }
                this.company = lead.company; 
            } else {
                return next(new Error('Lead associado à reserva não encontrado ou sem CompanyID.'));
            }

            if (this.statusReserva === "Ativa") {
                const UnidadeModel = mongoose.model('Unidade');
                const unidade = await UnidadeModel.findById(this.unidade).select('statusUnidade').lean();
                if (!unidade || unidade.statusUnidade !== "Disponível") {
                     return next(new Error(`A unidade ${this.unidade} não está Disponível para reserva.`));
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