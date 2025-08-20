const mongoose = require('mongoose');
const { Schema } = mongoose;

const dadosBancariosSchema = new Schema({
    banco: { type: String, trim: true },
    agencia: { type: String, trim: true },
    conta: { type: String, trim: true },
    tipoConta: { type: String, enum: ['Corrente', 'Poupança'] },
    pix: { type: String, trim: true },
}, { _id: false });

const credorSchema = new Schema({
    nome: {
        type: String,
        required: [true, 'O nome do credor é obrigatório.'],
        trim: true
    },
    cpfCnpj: {
        type: String,
        trim: true,
        unique: true,
        sparse: true // Permite múltiplos credores com cpfCnpj nulo
    },
    tipo: {
        type: String,
        required: true,
        enum: ['Corretor', 'Funcionário', 'Fornecedor', 'Outro'],
        default: 'Fornecedor'
    },
    // Referência opcional para vincular a um Corretor ou Utilizador existente
    brokerContactRef: { type: Schema.Types.ObjectId, ref: 'BrokerContact', default: null },
    userRef: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    
    contato: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    dadosBancarios: dadosBancariosSchema,

    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    }
}, { timestamps: true });

credorSchema.index({ company: 1, nome: 1 });

const Credor = mongoose.model('Credor', credorSchema);
module.exports = Credor;