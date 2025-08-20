const mongoose = require('mongoose');
const { Schema } = mongoose;

const valorIndexadorSchema = new Schema({
    mesAno: { 
        type: String, 
        required: true,
        match: [/^\d{4}-\d{2}$/, 'Formato de Mês/Ano deve ser YYYY-MM'] 
    }, // Formato "YYYY-MM"
    valor: { type: Number, required: true } // O valor percentual do índice no mês
}, { _id: false });

const indexadorSchema = new Schema({
    nome: { // "INCC", "IGPM", etc.
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    descricao: {
        type: String,
        trim: true
    },
    valores: [valorIndexadorSchema],
    company: { // Cada empresa pode ter os seus próprios indexadores, se necessário
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    }
}, { timestamps: true });

// Garante que o nome do indexador seja único por empresa
indexadorSchema.index({ company: 1, nome: 1 }, { unique: true });
// Garante que cada mês/ano seja único dentro de um mesmo indexador
indexadorSchema.index({ 'valores.mesAno': 1 }, { unique: true, partialFilterExpression: { 'valores.mesAno': { $exists: true } } });

const Indexador = mongoose.model('Indexador', indexadorSchema);
module.exports = Indexador;