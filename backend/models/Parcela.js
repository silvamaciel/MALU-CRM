const mongoose = require('mongoose');
const { Schema } = mongoose;

const parcelaSchema = new Schema({
    contrato: {
        type: Schema.Types.ObjectId,
        ref: 'PropostaContrato',
        required: true,
        index: true
    },
    lead: {
        type: Schema.Types.ObjectId,
        ref: 'Lead',
        required: true,
        index: true
    },
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    },
    numeroParcela: {
        type: Number,
        required: true
    },
    tipo: {
        type: String,
        required: true,
        enum: ['Sinal', 'Parcela Mensal', 'Intercalada', 'Financiamento', 'Chaves', 'Outra'],
        default: 'Parcela Mensal'
    },
    valorPrevisto: {
        type: Number,
        required: true
    },
    valorPago: {
        type: Number,
        required: true,
        default: 0
    },
    dataVencimento: {
        type: Date,
        required: true,
        index: true
    },
    dataPagamento: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ['Pendente', 'Pago', 'Pago com Atraso', 'Atrasado', 'Cancelado'],
        default: 'Pendente',
        index: true
    },
    observacoes: {
        type: String,
        trim: true
    }
}, { timestamps: true });

const Parcela = mongoose.model('Parcela', parcelaSchema);
module.exports = Parcela;