const mongoose = require('mongoose');
const { Schema } = mongoose;

const arquivoSchema = new Schema({
    nomeOriginal: {
        type: String,
        required: true,
        trim: true
    },
    nomeNoBucket: { 
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

    relatedTo: {
        model: { type: String, enum: ['Lead', 'PropostaContrato', 'Empreendimento', 'Parcela'] },
        id: { type: Schema.Types.ObjectId }
    }
}, { timestamps: true });

const Arquivo = mongoose.model('Arquivo', arquivoSchema);
module.exports = Arquivo;