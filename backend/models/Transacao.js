const mongoose = require('mongoose');
const { Schema } = mongoose;

const transacaoSchema = new Schema({
    parcela: {
        type: Schema.Types.ObjectId,
        ref: 'Parcela',
        required: true,
        index: true
    },
    contrato: {
        type: Schema.Types.ObjectId,
        ref: 'PropostaContrato',
        required: true
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
    valor: {
        type: Number,
        required: true
    },
    metodoPagamento: {
        type: String,
        enum: ['PIX', 'Transferência', 'Boleto', 'Cartão', 'Dinheiro', 'Outro'],
        required: true
    },
    dataTransacao: {
        type: Date,
        required: true
    },
    registradoPor: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    comprovanteUrl: { // Opcional: para anexar comprovativos no futuro
        type: String
    }
}, { timestamps: true });

const Transacao = mongoose.model('Transacao', transacaoSchema);
module.exports = Transacao;