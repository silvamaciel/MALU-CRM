const mongoose = require('mongoose');

const DiscardReason = require('../models/DiscardReason');

async function seedDiscardReasons() {
  try {
    const defaultReasons = [
      { nome: "Sem Interesse" },
      { nome: "Contato Inválido" },
      { nome: "Duplicado" },
      { nome: "Preço Alto" },
      { nome: "Comprou Concorrência" },
      { nome: "Não Atende Requisitos" },
      { nome: "Lead Frio" }
    ];
    console.log("[Seed] Verificando/populando Motivos de Descarte padrão...");
    const operations = defaultReasons.map(reason => ({
      updateOne: {
        filter: { nome: reason.nome },
        update: { $setOnInsert: reason },
        upsert: true
      }
    }));
    const result = await DiscardReason.bulkWrite(operations);
    console.log("[Seed] Resultado:", result);
  } catch (error) {
    console.error("[Seed] Erro ao popular Motivos de Descarte:", error);
  }
}


const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB conectado com sucesso!');

    // await seedDiscardReasons();

  } catch (error) {
    console.error('Erro ao conectar no MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
