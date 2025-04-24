// models/origem.js
const mongoose = require('mongoose');

const origemSchema = new mongoose.Schema({ // Usando mongoose.Schema
  nome: {
    type: String,
    required: [true, 'O nome da origem é obrigatório.'],
    trim: true,
  },
  descricao: {
    type: String
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'A empresa da origem é obrigatória.'],
    index: true
  },
  ativo: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Índice composto para nome único POR empresa
origemSchema.index({ company: 1, nome: 1 }, { unique: true });

// Hooks post save/findOneAndUpdate (para tratar erro de duplicação)
origemSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000 && error.keyPattern?.company && error.keyPattern?.nome) {
    next(new Error(`A origem '${doc.nome}' já existe nesta empresa.`));
  } else { next(error); }
});
origemSchema.post('findOneAndUpdate', function(error, doc, next) {
   if (error.name === 'MongoServerError' && error.code === 11000 && error.keyPattern?.company && error.keyPattern?.nome) {
     next(new Error(`Erro ao atualizar: Nome de origem já existe nesta empresa.`));
   } else { next(error); }
 });

const Origem = mongoose.model('Origem', origemSchema); // Verifique se o nome 'Origem' está ok para você

module.exports = Origem;