// models/User.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
    nome: {
        type: String,
        required: [true, 'Nome do usuário é obrigatório.'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Email do usuário é obrigatório.'],
        unique: true, // Geralmente email é único em todo o sistema
        lowercase: true,
        trim: true,
        match: [/\S+@\S+\.\S+/, 'Por favor, insira um endereço de e-mail válido.']
    },
    senha: { 
        type: String,
        required: false, 
        select: false 
    },
    perfil: {
        type: String,
        required: [true, 'Perfil do usuário é obrigatório.'],
        enum: ['admin', 'corretor'],
        default: 'corretor'
    },
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company', 
        required: [true, 'A empresa do usuário é obrigatória.'], 
    },
    googleId: { 
       type: String,
       unique: true,
       sparse: true, 
       index: true
    },
    ativo: { 
        type: Boolean,
        default: true
    }

}, { timestamps: true });

userSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000 && error.keyPattern?.email) {
    next(new Error(`O email ${doc.email} já está cadastrado.`));
  } else if (error.name === 'MongoServerError' && error.code === 11000 && error.keyPattern?.googleId){
    next(new Error(`Esta conta Google já está associada a outro usuário.`));
  } else {
    next(error);
  }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('senha')) {
      return next();
  }
  if (!this.senha) {
       return next();
  }

  console.log(`[User Model] Gerando hash para senha do usuário ${this.email}...`);
  try {
      const salt = await bcrypt.genSalt(10);
      this.senha = await bcrypt.hash(this.senha, salt);
      next();
  } catch (error) {
      next(error); 
  }
});


userSchema.methods.matchPassword = async function(enteredPassword) {
  if (!this.senha) return false;
  return await bcrypt.compare(String(enteredPassword), this.senha);
};

const User = mongoose.model('User', userSchema);

module.exports = User;