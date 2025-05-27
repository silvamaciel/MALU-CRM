// backend/models/ModeloContrato.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const modeloContratoSchema = new Schema({
    nomeModelo: { 
        type: String,
        required: [true, "O nome do modelo de contrato é obrigatório."],
        trim: true
    },
    tipoDocumento: {
        type: String,
        enum: ["Proposta", "Contrato de Reserva", "Contrato de Compra e Venda", "Outro"],
        required: [true, "O tipo de documento é obrigatório."],
        default: "Contrato de Compra e Venda"
    },
    conteudoHTMLTemplate: {
        type: String,
        required: [true, "O conteúdo HTML do modelo é obrigatório."]
    },
    placeholdersDisponiveis: [{
        placeholder: String, 
        descricao: String  
    }],
    company: { 
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    },
    ativo: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

modeloContratoSchema.index({ nomeModelo: 1, company: 1 }, { unique: true });

const ModeloContrato = mongoose.model('ModeloContrato', modeloContratoSchema);
module.exports = ModeloContrato;