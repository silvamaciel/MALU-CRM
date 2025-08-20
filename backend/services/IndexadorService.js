const Indexador = require('../models/Indexador');

// Lista todos os indexadores de uma empresa
const getIndexadores = async (companyId) => {
    return Indexador.find({ company: companyId }).sort({ nome: 1 });
};

// Cria um novo indexador
const createIndexador = async (data, companyId) => {
    const { nome, descricao } = data;
    const indexador = new Indexador({ nome, descricao, company: companyId });
    await indexador.save();
    return indexador;
};

// Adiciona ou atualiza o valor de um indexador para um mês/ano específico
const upsertValorIndexador = async (indexadorId, valorData, companyId) => {
    const { mesAno, valor } = valorData;
    const indexador = await Indexador.findOne({ _id: indexadorId, company: companyId });
    if (!indexador) throw new Error("Indexador não encontrado.");

    const existingValorIndex = indexador.valores.findIndex(v => v.mesAno === mesAno);
    
    if (existingValorIndex > -1) {
        // Atualiza o valor existente
        indexador.valores[existingValorIndex].valor = valor;
    } else {
        // Adiciona o novo valor e ordena o array
        indexador.valores.push({ mesAno, valor });
        indexador.valores.sort((a, b) => a.mesAno.localeCompare(b.mesAno));
    }

    await indexador.save();
    return indexador;
};

module.exports = {
    getIndexadores,
    createIndexador,
    upsertValorIndexador
};