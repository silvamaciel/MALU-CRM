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
    nomeNoBucket: { // O nome/caminho completo do ficheiro no Space
        type: String,
        required: true,
        unique: true
    },
    url: {
        type: String,
        required: true,
        unique: true
    },
    mimetype: {
        type: String,
        required: true
    },
    size: { // Tamanho em bytes
        type: Number,
        required: true
    },
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    },
    uploadedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    categoria: {
        type: String,
        required: true,
        enum: ['Contratos', 'Documentos Leads', 'Materiais Empreendimentos', 'Recibos', 'Parcela', 'Identidade Visual', 'Mídia WhatsApp', 'Outros'],
        index: true
    },
    associations: [associacaoSchema] // Um ficheiro pode estar associado a múltiplas coisas
}, { timestamps: true });

const Arquivo = mongoose.model('Arquivo', arquivoSchema);
module.exports = Arquivo;