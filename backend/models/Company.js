// models/Company.js
const mongoose = require("mongoose");
const { Schema } = mongoose;
const { cnpj } = require("cpf-cnpj-validator");
const { v4: uuidv4 } = require('uuid');

const companySchema = new Schema(
  {
    nome: {
      type: String,
      required: [true, "O nome da empresa é obrigatório."],
      trim: true,
    },
    cnpj: {
      type: String,
      required: [true, "O CNPJ da empresa é obrigatório."],
      unique: true,
      validate: {
        validator: function (v) {
          const cleanedCNPJ = String(v).replace(/\D/g, "");
          return cnpj.isValid(cleanedCNPJ);
        },
        message: (props) => `${props.value} não é um CNPJ válido!`,
      },
      set: (v) => String(v).replace(/\D/g, ""),
      index: true,
    },
    ativo: {
      type: Boolean,
      default: true,
    },

    facebookPageId: { 
      type: String,
      trim: true,
      index: true,    
      unique: true,   
      sparse: true    
      },

      linkedFacebookForms: [{ 
        formId: { type: String, required: true },
        formName: { type: String } 
    }],

    facebookConnectedByUserId: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
  },
  publicBrokerToken: {
        type: String,
        default: () => uuidv4(),
        unique: true,
        index: true
    },
    
    facebookWebhookSubscriptionId: {
      type: String,
    },
  },
  
  {
    timestamps: true,
  }
);

companySchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    if (error.keyPattern?.cnpj) {
        next(new Error(`O CNPJ ${doc.cnpj} já está cadastrado.`));
    } else if (error.keyPattern?.facebookPageId) {
        next(new Error(`A Página do Facebook ID ${doc.facebookPageId} já está conectada a outra empresa.`));
    } else { next(error); }
  } else { next(error); }
});



companySchema.post("findOneAndUpdate", function (error, doc, next) {
  if (
    error.name === "MongoServerError" &&
    error.code === 11000 &&
    error.keyPattern?.cnpj
  ) {
    next(
      new Error(`Erro ao atualizar: CNPJ já cadastrado para outra empresa.`)
    );
  } else {
    next(error);
  }
});

const Company = mongoose.model("Company", companySchema);

module.exports = Company;
