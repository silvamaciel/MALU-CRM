// models/BrokerContact.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const brokerContactSchema = new Schema({
    nome: {
        type: String,
        required: [true, 'O nome do corretor é obrigatório.'],
        trim: true,
        index: true
    },
    contato: { // Telefone
        type: String,
        required: false, 
        trim: true
    },
    email: {
        type: String,
        required: false,
        trim: true,
        lowercase: true,
        unique: true, 
        sparse: true,
        match: [/\S+@\S+\.\S+/, 'Formato de email inválido.']
    },
    creci: { 
        type: String,
        required: false, 
        trim: true,
        index: true
    },
    nomeImobiliaria:{
        type: String,
        required: false,
    },
    cpfCnpj: {
        type: String,
        required: false,
        trim: true
    },

    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: [true, 'A empresa associada é obrigatória.'],
        index: true
    },
    ativo: { 
        type: Boolean,
        default: true
    }
}, { timestamps: true });

 brokerContactSchema.index({ company: 1, creci: 1 }, { unique: true, sparse: true });
 brokerContactSchema.index({ company: 1, email: 1 }, { unique: true, sparse: true });


const BrokerContact = mongoose.model('BrokerContact', brokerContactSchema);

module.exports = BrokerContact;