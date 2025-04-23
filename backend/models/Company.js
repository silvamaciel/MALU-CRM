// models/Company.js
const mongoose = require('mongoose');
const { Schema } = mongoose;
const { cnpj } = require('cpf-cnpj-validator');

const companySchema = new Schema({
    nome: {
        type: String,
        required: [true, 'O nome da empresa é obrigatório.'],
        trim: true,
    },
    cnpj: {
        type: String,
        required: [true, 'O CNPJ da empresa é obrigatório.'],
        unique: true, 
        validate: { 
            validator: function(v) {
                const cleanedCNPJ = String(v).replace(/\D/g, '');
                return cnpj.isValid(cleanedCNPJ); 
            },
            message: props => `${props.value} não é um CNPJ válido!`
        },
        set: v => String(v).replace(/\D/g, ''), 
        index: true 
    },
    ativo: { 
        type: Boolean,
        default: true
    }
}, {
    timestamps: true 
});


companySchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000 && error.keyPattern?.cnpj) {
    next(new Error(`O CNPJ informado já está cadastrado.`));
  } else {
    next(error);
  }
});

companySchema.post('findOneAndUpdate', function(error, doc, next) {
   if (error.name === 'MongoServerError' && error.code === 11000 && error.keyPattern?.cnpj) {
     next(new Error(`Erro ao atualizar: CNPJ já cadastrado para outra empresa.`));
   } else {
     next(error);
   }
 });


const Company = mongoose.model('Company', companySchema);

module.exports = Company;