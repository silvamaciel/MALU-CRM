// backend/models/Empreendimento.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const localizacaoSchema = new Schema({
    logradouro: { type: String, trim: true },
    numero: { type: String, trim: true },
    bairro: { type: String, trim: true },
    cidade: { type: String, trim: true, required: [true, 'Cidade é obrigatória.'] },
    uf: { type: String, trim: true, uppercase: true, minlength: 2, maxlength: 2, required: [true, 'UF é obrigatória.'] },
    cep: { type: String, trim: true },
    latitude: { type: String, trim: true },
    longitude: { type: String, trim: true },
    }, { _id: false });

const imagemSchema = new Schema({
    url: { type: String, required: false },
    thumbnailUrl: { type: String }, 
    altText: { type: String, trim: true }
}, { _id: false });

const empreendimentoSchema = new Schema({
    nome: {
        type: String,
        required: [true, 'O nome do empreendimento é obrigatório.'],
        trim: true,
        index: true
    },
    construtoraIncorporadora: {
        type: String,
        trim: true
    },
    localizacao: localizacaoSchema,
    tipo: {
        type: String,
        required: [true, 'O tipo do empreendimento é obrigatório.'],
        enum: {
            values: ["Residencial Vertical", "Residencial Horizontal", "Loteamento", "Comercial"],
            message: 'Tipo de empreendimento inválido: {VALUE}.'
        }
    },
    statusEmpreendimento: {
        type: String,
        required: [true, 'O status do empreendimento é obrigatório.'],
        enum: {
            values: ["Em Planejamento", "Breve Lançamento", "Lançamento", "Em Obras", "Pronto para Morar", "Concluído"],
            message: 'Status de empreendimento inválido: {VALUE}.'
        },
        default: "Em Planejamento"
    },
    descricao: { 
        type: String,
        trim: true
    },
    imagemPrincipal: imagemSchema,
    dataPrevistaEntrega: {
        type: Date,
        required: false
    },
    company: { 
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    },
    ativo: { 
        type: Boolean,
        default: true
    },
}, {
    timestamps: true,
});

empreendimentoSchema.index({ nome: 1, company: 1 }, { unique: true });

 empreendimentoSchema.virtual('totalUnidades', {
   ref: 'Unidade',
   localField: '_id',
   foreignField: 'empreendimento',
   count: true
});


const Empreendimento = mongoose.model('Empreendimento', empreendimentoSchema);
module.exports = Empreendimento;