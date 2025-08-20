const mongoose = require('mongoose');
const { Schema } = mongoose;

const parcelaSchema = new Schema({
    contrato: {
        type: Schema.Types.ObjectId,
        ref: 'PropostaContrato',
        required: false,
        default: null,
        index: true
    },
    sacado: {
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
        enum: [
            "ATO", "PARCELA MENSAL", "PARCELA BIMESTRAL",
            "PARCELA TRIMESTRAL", "PARCELA SEMESTRAL", "INTERCALADA",
            "ENTREGA DE CHAVES", "FINANCIAMENTO", "OUTRA"
        ],
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
        enum: ['Pendente', 'Pago', 'Pago com Atraso', 'Atrasado', 'Cancelado', 'Renegociada'],
        default: 'Pendente',
        index: true
    },
    historicoAlteracoes: [{ // Regista cada alteração feita na parcela
        data: { type: Date, default: Date.now },
        usuario: { type: Schema.Types.ObjectId, ref: 'User' },
        campo: String, // ex: 'dataVencimento', 'valorPrevisto'
        valorAntigo: String,
        valorNovo: String,
        motivo: String
    }],
    
    observacoes: {
        type: String,
        trim: true
    },
    
}, { timestamps: true });

const Parcela = mongoose.model('Parcela', parcelaSchema);
module.exports = Parcela;