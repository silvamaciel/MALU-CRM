// scripts/indexes.js
/* eslint-disable no-console */
const mongoose = require('mongoose');

// Carregue todos os models que possuem .index() definidos
require('../models/Parcela');
require('../models/Lead');

const MODE = process.env.IDX_MODE || 'create';

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { autoIndex: false });

    const { models } = mongoose;

    for (const name of Object.keys(models)) {
      const Model = models[name];

      if (MODE === 'sync' && typeof Model.syncIndexes === 'function') {
        const res = await Model.syncIndexes();
        console.log(`✔ ${name} syncIndexes ->`, res);
      } else if (typeof Model.createIndexes === 'function') {

        const res = await Model.createIndexes();
        console.log(`✔ ${name} createIndexes ->`, res);
      }
    }

    await mongoose.disconnect();
    console.log('✅ Índices processados com sucesso.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao processar índices:', err);
    process.exit(1);
  }
})();
