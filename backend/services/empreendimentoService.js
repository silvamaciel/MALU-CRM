// backend/services/empreendimentoService.js
const Empreendimento = require('../models/Empreendimento');
const Unidade = require('../models/Unidade');
const mongoose = require('mongoose');

/**
 * Cria um novo empreendimento.
 * @param {object} empreendimentoData - Dados do empreendimento a ser criado.
 * @param {string} companyId - ID da empresa à qual o empreendimento pertence.
 * @returns {Promise<Empreendimento>} O empreendimento criado.
 */
const createEmpreendimento = async (empreendimentoData, companyId) => {
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error('ID da empresa inválido.');
    }
    if (!empreendimentoData || !empreendimentoData.nome || !empreendimentoData.tipo || !empreendimentoData.statusEmpreendimento || !empreendimentoData.localizacao?.cidade || !empreendimentoData.localizacao?.uf) {
        throw new Error('Dados insuficientes para criar empreendimento. Nome, tipo, status, cidade e UF da localização são obrigatórios.');
    }

    const novoEmpreendimento = new Empreendimento({
        ...empreendimentoData,
        company: companyId,
        ativo: true // Garante que começa ativo
    });

    try {
        await novoEmpreendimento.save();
        console.log(`[EmpreendimentoService] Empreendimento criado: ${novoEmpreendimento._id} para Company: ${companyId}`);
        return novoEmpreendimento;
    } catch (error) {
        if (error.code === 11000) { // Erro de índice único (nome + company)
            throw new Error(`Já existe um empreendimento com o nome "${novoEmpreendimento.nome}" nesta empresa.`);
        }
        console.error("[EmpreendimentoService] Erro ao criar empreendimento:", error);
        throw new Error(error.message || "Erro ao salvar novo empreendimento.");
    }
};

/**
 * Lista todos os empreendimentos de uma empresa com paginação.
 * @param {string} companyId - ID da empresa.
 * @param {object} filters - Objeto com filtros (ex: { tipo: 'Residencial', statusEmpreendimento: 'Lançamento' }).
 * @param {object} paginationOptions - Opções de paginação (page, limit).
 * @returns {Promise<{empreendimentos: Array<Empreendimento>, total: number, page: number, pages: number}>}
 */
const getEmpreendimentosByCompany = async (companyId, filters = {}, paginationOptions = { page: 1, limit: 10 }) => {
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error('ID da empresa inválido.');
    }

    const page = parseInt(paginationOptions.page, 10) || 1;
    const limit = parseInt(paginationOptions.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const queryConditions = { company: companyId, ativo: true, ...filters };

    // Remove filtros com valores vazios ou nulos para não interferir na query
    for (const key in queryConditions) {
        if (queryConditions[key] === null || queryConditions[key] === undefined || queryConditions[key] === '') {
            delete queryConditions[key];
        }
    }
    
    console.log(`[EmpreendimentoService] Buscando empreendimentos para Company: ${companyId}, Condições:`, queryConditions);

    try {
        const empreendimentos = await Empreendimento.find(queryConditions)
            .sort({ nome: 1 }) // Ordena por nome A-Z
            .skip(skip)
            .limit(limit)
            .populate('totalUnidades') // Para popular o campo virtual
            .lean({ virtuals: true }); // Necessário para virtuals com lean

        const totalEmpreendimentos = await Empreendimento.countDocuments(queryConditions);

        console.log(`[EmpreendimentoService] ${totalEmpreendimentos} empreendimentos encontrados para Company: ${companyId}`);
        return {
            empreendimentos,
            total: totalEmpreendimentos,
            page,
            pages: Math.ceil(totalEmpreendimentos / limit) || 1
        };
    } catch (error) {
        console.error("[EmpreendimentoService] Erro ao buscar empreendimentos:", error);
        throw new Error("Erro ao buscar empreendimentos.");
    }
};

/**
 * Busca um empreendimento específico por ID, garantindo que pertence à empresa.
 * @param {string} empreendimentoId - ID do empreendimento.
 * @param {string} companyId - ID da empresa.
 * @returns {Promise<Empreendimento|null>} O empreendimento encontrado ou null.
 */
const getEmpreendimentoByIdAndCompany = async (empreendimentoId, companyId) => {
    if (!empreendimentoId || !mongoose.Types.ObjectId.isValid(empreendimentoId) ||
        !companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error('IDs de empreendimento ou empresa inválidos.');
    }
    console.log(`[EmpreendimentoService] Buscando empreendimento ID: ${empreendimentoId} para Company: ${companyId}`);
    try {
        const empreendimento = await Empreendimento.findOne({
            _id: empreendimentoId,
            company: companyId,
            ativo: true
        })
        .populate('totalUnidades')
        .lean({ virtuals: true });

        if (!empreendimento) {
            console.log(`[EmpreendimentoService] Empreendimento ID: ${empreendimentoId} não encontrado para Company: ${companyId} ou inativo.`);
            return null;
        }
        return empreendimento;
    } catch (error) {
        console.error(`[EmpreendimentoService] Erro ao buscar empreendimento ${empreendimentoId}:`, error);
        throw new Error("Erro ao buscar empreendimento por ID.");
    }
};


module.exports = {
    createEmpreendimento,
    getEmpreendimentosByCompany,
    getEmpreendimentoByIdAndCompany
    // updateEmpreendimento,
    // deleteEmpreendimento
};