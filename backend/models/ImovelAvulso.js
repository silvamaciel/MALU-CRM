const mongoose = require('mongoose');
const { Schema } = mongoose;

const enderecoSchema = new Schema({
    logradouro: { type: String, trim: true },
    numero: { type: String, trim: true },
    complemento: { type: String, trim: true },
    bairro: { type: String, trim: true, index: true },
    cidade: { type: String, required: true, trim: true, index: true },
    uf: { type: String, required: true, trim: true, maxlength: 2 },
    cep: { type: String, trim: true },
}, { _id: false });

const imovelAvulsoSchema = new Schema({
    titulo: { type: String, required: [true, 'O título do imóvel é obrigatório.'], trim: true },
    descricao: { type: String, trim: true },
    tipoImovel: { 
        type: String, 
        required: true,
        enum: ['Apartamento', 'Casa', 'Terreno', 'Sala Comercial', 'Loja', 'Galpão', 'Outro'],
        index: true
    },
    status: {
        type: String,
        required: true,
        enum: ['Disponível', 'Reservado', 'Vendido', 'Inativo', 'Proposta'],
        default: 'Disponível',
        index: true
    },
    quartos: { type: Number, default: 0 },
    suites: { type: Number, default: 0 },
    banheiros: { type: Number, default: 0 },
    vagasGaragem: { type: Number, default: 0 },
    areaTotal: { type: Number, required: [true, 'A área total é obrigatória.'] }, // m²
    
    preco: { type: Number, required: [true, 'O preço é obrigatório.'] },

    endereco: enderecoSchema,
    fotos: [{ 
        url: { type: String, required: true },
        descricao: { type: String }
    }],
    
    company: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    responsavel: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Corretor responsável pelo imóvel
    
    currentLeadId: { type: Schema.Types.ObjectId, ref: 'Lead', default: null },
    currentReservaId: { type: Schema.Types.ObjectId, ref: 'Reserva', default: null },

}, { timestamps: true });

imovelAvulsoSchema.index({ company: 1, tipoImovel: 1, status: 1 });

const ImovelAvulso = mongoose.model('ImovelAvulso', imovelAvulsoSchema);
module.exports = ImovelAvulso;