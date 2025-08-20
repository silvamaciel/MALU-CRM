// backend/models/Indexador.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const valorIndexadorSchema = new Schema({
    mesAno: { type: String, required: true }, // Formato "YYYY-MM"
    valor: { type: Number, required: true } // O valor percentual do índice no mês
}, { _id: false });

const indexadorSchema = new Schema({
    nome: { // "INCC", "IGPM", etc.
        type: String,
        required: true,
        unique: true
    },
    valores: [valorIndexadorSchema]
});

const Indexador = mongoose.model('Indexador', indexadorSchema);
module.exports = Indexador;