const mongoose = require('mongoose');
const { Schema } = mongoose;

const associacaoSchema = new Schema({
    kind: { // O tipo de entidade à qual este ficheiro está associado
        type: String,
        required: true,
        enum: ['Lead', 'PropostaContrato', 'Empreendimento', 'Unidade', 'ImovelAvulso', 'User']
    },
    item: { // O ID da entidade específica
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'associations.kind'
    }
}, { _id: false });

const arquivoSchema = new Schema({
    nomeOriginal: { type: String, required: true, trim: true },
    nomeNoBucket: { type: String, required: true, unique: true },
    url: { type: String, required: true, unique: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    company: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    
    // VVVVV O "CÉREBRO" DO SISTEMA ESTÁ AQUI VVVVV
    categoria: {
        type: String,
        required: true,
        enum: ['Contratos', 'Documentos Leads', 'Materiais Empreendimentos', 'Parcela', 'Recibos', 'Identidade Visual', 'Mídia WhatsApp']
    },
    associations: [associacaoSchema]
    
}, { timestamps: true });

const Arquivo = mongoose.model('Arquivo', arquivoSchema);
module.exports = Arquivo;