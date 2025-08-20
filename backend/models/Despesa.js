const mongoose = require('mongoose');
const { Schema } = mongoose;

const despesaSchema = new Schema({
    descricao: {
        type: String,
        required: [true, 'A descrição da despesa é obrigatória.'],
        trim: true
    },
    credor: { // Para quem devemos pagar
        type: Schema.Types.ObjectId,
        ref: 'Credor',
        required: true,
        index: true
    },
    contrato: { // Opcional: se a despesa estiver ligada a uma venda
        type: Schema.Types.ObjectId,
        ref: 'PropostaContrato',
        default: null
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
        enum: ['A Pagar', 'Paga', 'Atrasada', 'Cancelada'],
        default: 'A Pagar',
        index: true
    },
    centroDeCusto: { // Para categorização
        type: String,
        trim: true,
        enum: ['Comissões', 'Marketing', 'Operacional', 'Outros'],
        default: 'Outros'
    },
    observacoes: {
        type: String,
        trim: true
    },
    registradoPor: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

const Despesa = mongoose.model('Despesa', despesaSchema);
module.exports = Despesa;