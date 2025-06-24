// services/origemService.js
const mongoose = require('mongoose');
const Origem = require('../models/origem');
const Lead = require('../models/Lead'); 

/**
 * Lista todas as origens ATIVAS de uma empresa específica, ordenadas por nome.
 * @param {string} companyId - ID da empresa.
 */
const getAllOrigens = async (companyId) => {
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
         throw new Error('ID da empresa inválido ou não fornecido para buscar origens.');
    }
    try {
        return await Origem.find({ company: companyId, ativo: true })
                           .sort({ nome: 1 })
                           .lean(); // Added .lean()
    } catch (error) {
        console.error(`[OrigemService] Erro ao buscar origens para empresa ${companyId}:`, error);
        throw new Error('Erro ao buscar origens.');
    }
};

/**
 * Cria uma nova origem para uma empresa específica.
 * @param {object} data - Dados da origem (ex: { nome: 'Website', descricao: '...' }).
 * @param {string} companyId - ID da empresa onde criar a origem.
 */
const createOrigem = async (data, companyId) => {
    const { nome, descricao } = data;
    if (!nome || typeof nome !== 'string' || nome.trim() === '') {
        throw new Error('O nome da origem é obrigatório.');
    }
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
         throw new Error('ID da empresa inválido ou não fornecido para criar origem.');
    }
    const nomeTrimmed = nome.trim();

    try {
        const existing = await Origem.findOne({
            nome: { $regex: new RegExp(`^${nomeTrimmed}$`, 'i') },
            company: companyId 
        }).lean(); // Added .lean()
        if (existing) {
            throw new Error(`Origem '${nomeTrimmed}' já existe nesta empresa.`);
        }

        const novaOrigem = new Origem({
            nome: nomeTrimmed,
            descricao: descricao || null, 
            company: companyId 
        });
        await novaOrigem.save();
        console.log(`[OrigemService] Origem criada para empresa ${companyId}:`, novaOrigem._id);
        return novaOrigem;

    } catch (error) {
        if (error.message.includes("já existe")) throw error;
        console.error(`[OrigemService] Erro ao criar origem para empresa ${companyId}:`, error);
        throw new Error(error.message || 'Erro ao criar origem.');
    }
};

/**
 * Atualiza uma origem existente de uma empresa específica.
 * @param {string} id - ID da origem.
 * @param {string} companyId - ID da empresa proprietária.
 * @param {object} data - Dados para atualizar (ex: { nome: 'Novo Nome', descricao: '...', ativo: false }).
 */
const updateOrigem = async (id, companyId, data) => {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("ID de origem inválido.");
    if (!mongoose.Types.ObjectId.isValid(companyId)) throw new Error("ID da empresa inválido.");

    const { nome, descricao, ativo } = data; 
    const fieldsToUpdate = {};
    let hasUpdate = false;

    if (nome !== undefined) {
        if(typeof nome !== 'string' || nome.trim() === '') throw new Error('Nome inválido.');
        fieldsToUpdate.nome = nome.trim();
        hasUpdate = true;
    }
    if (descricao !== undefined) {
        fieldsToUpdate.descricao = descricao || null; 
        hasUpdate = true;
    }
     if (ativo !== undefined) {
         fieldsToUpdate.ativo = Boolean(ativo);
         hasUpdate = true;
     }

    if (!hasUpdate) { throw new Error("Nenhum dado válido fornecido para atualização."); }

    try {
        if (fieldsToUpdate.nome) {
            const existing = await Origem.findOne({
                 nome: { $regex: new RegExp(`^${fieldsToUpdate.nome}$`, 'i') },
                 company: companyId,
                 _id: { $ne: id }
            }).lean(); // Added .lean()
            if (existing) {
                throw new Error(`Já existe outra origem com o nome '${fieldsToUpdate.nome}' nesta empresa.`);
            }
        }

        const atualizada = await Origem.findOneAndUpdate(
            { _id: id, company: companyId }, 
            fieldsToUpdate,
            { new: true, runValidators: true }
        );
        if (!atualizada) {
            throw new Error('Origem não encontrada ou não pertence a esta empresa.');
        }
        console.log(`[OrigemService] Origem atualizada para empresa ${companyId}:`, id);
        return atualizada;

    } catch (error) {
        if (error.message.includes("já existe")) throw error;
        console.error(`[OrigemService] Erro ao atualizar origem ${id} para empresa ${companyId}:`, error);
        throw new Error(error.message || 'Erro ao atualizar origem.');
    }
};

/**
 * Exclui uma origem de uma empresa específica.
 * @param {string} id - ID da origem a excluir.
 * @param {string} companyId - ID da empresa proprietária.
 */
const deleteOrigem = async (id, companyId) => { // <<< Aceita companyId
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("ID de origem inválido.");
    if (!mongoose.Types.ObjectId.isValid(companyId)) throw new Error("ID da empresa inválido.");

    try {
        const origemToDelete = await Origem.findOne({ _id: id, company: companyId }).lean(); // Added .lean()
        if (!origemToDelete) {
            throw new Error('Origem não encontrada ou não pertence a esta empresa.');
        }

        const leadCount = await Lead.countDocuments({ origem: id, company: companyId }); // This is a count, no .lean() needed
        if (leadCount > 0) {
            throw new Error(`Não é possível excluir: A origem "${origemToDelete.nome}" está sendo usada por ${leadCount} lead(s) desta empresa.`);
        }

        await Origem.deleteOne({ _id: id, company: companyId });
        console.log(`[OrigemService] Origem excluída para empresa ${companyId}:`, id);
        return { mensagem: `Origem "${origemToDelete.nome}" excluída com sucesso.` };

    } catch (error) {
        console.error(`[OrigemService] Erro ao excluir origem ${id} para empresa ${companyId}:`, error);
        throw new Error(error.message || 'Erro ao excluir origem.');
    }
};


/**
 * Encontra uma Origem pelo nome para uma empresa, ou a cria se não existir.
 * @param {object} origemData - { nome: string, descricao?: string }
 * @param {string} companyId - O ID da empresa.
 * @returns {Promise<Origem>} O documento da origem encontrado ou criado.
 */
const findOrCreateOrigem = async (origemData, companyId) => {
    if (!origemData || !origemData.nome) {
        throw new Error("O nome da origem é obrigatório para encontrar ou criar.");
    }
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error("ID da Empresa inválido.");
    }

    const nomeOrigem = origemData.nome.trim();
    console.log(`[OrigemSvc] Buscando ou criando origem '${nomeOrigem}' para Company: ${companyId}`);

    // Procura por uma origem com o mesmo nome (case-insensitive) para a empresa
    let origem = await Origem.findOne({
        nome: { $regex: new RegExp(`^${nomeOrigem}$`, 'i') },
        company: companyId
    }).lean(); // Added .lean()

    // Se encontrou, retorna o documento existente (which is now a plain object)
    if (origem) {
        console.log(`[OrigemSvc] Origem '${nomeOrigem}' encontrada com ID: ${origem._id}`);
        // If the rest of the system expects a Mongoose document, this might need adjustment
        // or the caller needs to be aware it's a lean object.
        // For findOrCreate, returning the lean object is often fine.
        return origem;
    }

    // Se não encontrou, cria uma nova
    console.log(`[OrigemSvc] Origem '${nomeOrigem}' não encontrada. Criando uma nova...`);
    origem = new Origem({
        nome: nomeOrigem,
        descricao: origemData.descricao || `Origem criada automaticamente via importação/sistema.`,
        company: companyId,
        ativo: true
    });
    
    await origem.save();
    console.log(`[OrigemSvc] Origem '${nomeOrigem}' criada com sucesso com ID: ${origem._id}`);
    return origem;
};


module.exports = {
    getAllOrigens,
    createOrigem,
    updateOrigem,
    deleteOrigem,
    findOrCreateOrigem
};