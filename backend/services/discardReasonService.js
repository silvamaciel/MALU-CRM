// services/discardReasonService.js
const mongoose = require('mongoose');
const DiscardReason = require('../models/DiscardReason'); // Seu modelo (já deve ter 'company')
const Lead = require('../models/Lead'); // Para checar uso antes de deletar

/**
 * Lista todos os motivos de descarte ATIVOS de uma empresa específica, ordenados por nome.
 * @param {string} companyId - ID da empresa.
 * @returns {Promise<Array>} - Array de motivos (documentos Mongoose).
 */
const getAllDiscardReasonsByCompany = async (companyId) => { // <<< Renomeado e recebe companyId
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error('ID da empresa inválido ou não fornecido.');
    }
    try {
        // <<< FILTRA por companyId e ativo=true >>>
        const reasons = await DiscardReason.find({ company: companyId, ativo: true })
                                         .sort({ nome: 1 });
        console.log(`[DRService] Encontrados ${reasons.length} motivos para empresa ${companyId}`);
        return reasons;
    } catch (error) {
        console.error(`[DRService] Erro ao buscar motivos para empresa ${companyId}:`, error);
        throw new Error('Erro ao buscar motivos de descarte.');
    }
};

/**
 * Cria um novo motivo de descarte para uma empresa específica.
 * @param {object} reasonData - Dados do motivo (ex: { nome: 'Sem Budget', descricao: '...' }).
 * @param {string} companyId - ID da empresa.
 * @returns {Promise<object>} - O documento do motivo criado.
 */
const createDiscardReason = async (reasonData, companyId) => { // <<< Recebe companyId
    const { nome, descricao } = reasonData;
    if (!nome || typeof nome !== 'string' || nome.trim() === '') {
        throw new Error('O nome do motivo é obrigatório.');
    }
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error('ID da empresa inválido ou não fornecido.');
    }
    const nomeTrimmed = nome.trim();

    try {
        // <<< Verifica duplicidade NA EMPRESA >>>
        const existing = await DiscardReason.findOne({
            nome: { $regex: new RegExp(`^${nomeTrimmed}$`, 'i') },
            company: companyId // <<< Usa companyId na checagem
        });
        if (existing) {
            throw new Error(`Motivo de descarte '${nomeTrimmed}' já existe nesta empresa.`);
        }

        // <<< Cria associado à EMPRESA >>>
        const newReason = new DiscardReason({
            nome: nomeTrimmed,
            descricao: descricao || null,
            company: companyId, // <<< Associa à empresa
            ativo: true // Assume ativo por padrão
        });
        await newReason.save();
        console.log(`[DRService] Motivo criado para empresa ${companyId}:`, newReason._id);
        return newReason;
    } catch (error) {
        // Hook do model já trata erro de índice composto (company+nome)
        if (error.message.includes("já existe")) throw error;
        console.error(`[DRService] Erro ao criar motivo para empresa ${companyId}:`, error);
        throw new Error(error.message || 'Erro ao criar motivo de descarte.');
    }
};

/**
 * Busca um motivo por ID DENTRO de uma empresa (útil para validação interna talvez)
 * @param {string} id - ID do motivo.
 * @param {string} companyId - ID da empresa.
 */
const getDiscardReasonById = async (id, companyId) => {
     if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("ID do motivo inválido.");
     if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) throw new Error('ID da empresa inválido.');
     try {
        const reason = await DiscardReason.findOne({ _id: id, company: companyId });
        // Não lança erro se não achar, apenas retorna null ou o doc
        return reason;
     } catch (error) {
         console.error(`[DRService] Erro ao buscar motivo ${id} para empresa ${companyId}:`, error);
         throw new Error('Erro ao buscar motivo de descarte.');
     }
};


/**
 * Atualiza um motivo de descarte existente de uma empresa específica.
 * @param {string} id - ID do motivo a atualizar.
 * @param {string} companyId - ID da empresa proprietária.
 * @param {object} updateData - Dados a serem atualizados (nome, descricao, ativo).
 * @returns {Promise<object>} - O documento atualizado.
 */
const updateDiscardReason = async (id, companyId, updateData) => { // <<< Recebe companyId
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("ID do motivo inválido.");
    if (!mongoose.Types.ObjectId.isValid(companyId)) throw new Error("ID da empresa inválido.");

    const { nome, descricao, ativo } = updateData;
    const fieldsToUpdate = {};
    let hasUpdate = false;

    if (nome !== undefined) {
        if(typeof nome !== 'string' || nome.trim() === '') throw new Error('Nome inválido.');
        fieldsToUpdate.nome = nome.trim(); hasUpdate = true;
    }
    if (descricao !== undefined) { fieldsToUpdate.descricao = descricao || null; hasUpdate = true; }
    if (ativo !== undefined) { fieldsToUpdate.ativo = Boolean(ativo); hasUpdate = true; }

    if (!hasUpdate) { throw new Error("Nenhum dado válido fornecido para atualização."); }

    try {
        // Verifica nome duplicado (se nome está sendo atualizado) NA MESMA EMPRESA
        if (fieldsToUpdate.nome) {
            const existing = await DiscardReason.findOne({
                 nome: { $regex: new RegExp(`^${fieldsToUpdate.nome}$`, 'i') },
                 company: companyId, // <<< Usa companyId
                 _id: { $ne: id }
            });
            if (existing) {
                throw new Error(`Já existe outro motivo com o nome '${fieldsToUpdate.nome}' nesta empresa.`);
            }
        }

        // <<< ATUALIZA filtrando por ID E companyId >>>
        const updatedReason = await DiscardReason.findOneAndUpdate(
            { _id: id, company: companyId }, // Garante que só atualiza se for da empresa certa
            { $set: fieldsToUpdate },
            { new: true, runValidators: true }
        );
        if (!updatedReason) {
            throw new Error('Motivo de descarte não encontrado nesta empresa.');
        }
        console.log(`[DRService] Motivo atualizado para empresa ${companyId}:`, id);
        return updatedReason;
    } catch (error) {
        if (error.message.includes("já existe")) throw error;
        console.error(`[DRService] Erro ao atualizar motivo ${id} para empresa ${companyId}:`, error);
        throw new Error(error.message || 'Erro ao atualizar motivo de descarte.');
    }
};

/**
 * Exclui um motivo de descarte de uma empresa específica.
 * @param {string} id - ID do motivo a excluir.
 * @param {string} companyId - ID da empresa proprietária.
 */
const deleteDiscardReason = async (id, companyId) => { // <<< Recebe companyId
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("ID do motivo inválido.");
    if (!mongoose.Types.ObjectId.isValid(companyId)) throw new Error("ID da empresa inválido.");

    try {
        // <<< Busca filtrando por ID E companyId >>>
        const reasonToDelete = await DiscardReason.findOne({ _id: id, company: companyId });
        if (!reasonToDelete) {
            throw new Error('Motivo de descarte não encontrado nesta empresa.');
        }

        // <<< Verifica se está em uso por Leads DA MESMA EMPRESA >>>
        const leadCount = await Lead.countDocuments({ motivoDescarte: id, company: companyId });
        if (leadCount > 0) {
            throw new Error(`Não é possível excluir: O motivo "${reasonToDelete.nome}" está sendo usado por ${leadCount} lead(s) desta empresa.`);
        }

        // <<< Deleta filtrando por ID E companyId >>>
        await DiscardReason.deleteOne({ _id: id, company: companyId });
        console.log(`[DRService] Motivo excluído para empresa ${companyId}:`, id);
        return { message: `Motivo "${reasonToDelete.nome}" excluído com sucesso.` };

    } catch (error) {
        console.error(`[DRService] Erro ao excluir motivo ${id} para empresa ${companyId}:`, error);
        throw new Error(error.message || 'Erro ao excluir motivo de descarte.');
    }
};

module.exports = {
    getAllDiscardReasonsByCompany, // Renomeado
    createDiscardReason,
    updateDiscardReason,
    deleteDiscardReason,
    getDiscardReasonById // Adicionado se precisar buscar um específico
};