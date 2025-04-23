// services/origemService.js
const mongoose = require('mongoose');
const Origem = require('../models/origem'); 
const Lead = require('../models/Lead');

/**
 * Lista todas as origens ordenadas por nome.
 */
const getAllOrigens = async () => {
    try {
        // Busca apenas origens ativas se você adicionar o campo 'ativo' ao modelo
        return await Origem.find(/* { ativo: true } */).sort({ nome: 1 });
    } catch (error) {
        console.error("[OrigemService] Erro ao buscar origens:", error);
        throw new Error('Erro ao buscar origens.');
    }
};

/**
 * Cria uma nova origem.
 * @param {object} data - Dados da origem (ex: { nome: 'Website' }).
 */
const createOrigem = async (data) => {
    const { nome } = data;
    if (!nome || typeof nome !== 'string' || nome.trim() === '') {
        throw new Error('O nome da origem é obrigatório.');
    }
    const nomeTrimmed = nome.trim();

    try {
        // Verifica duplicidade (case-insensitive)
        const existing = await Origem.findOne({ nome: { $regex: new RegExp(`^${nomeTrimmed}$`, 'i') } });
        if (existing) {
            throw new Error(`Origem '${nomeTrimmed}' já existe.`);
        }

        const novaOrigem = new Origem({ nome: nomeTrimmed });
        await novaOrigem.save();
        console.log("[OrigemService] Origem criada:", novaOrigem._id);
        return novaOrigem;
    } catch (error) {
        if (error.message.includes("já existe")) throw error; // Repassa erro de duplicação
        console.error("[OrigemService] Erro ao criar origem:", error);
        throw new Error('Erro ao criar origem.');
    }
};

/**
 * Atualiza uma origem existente.
 * @param {string} id - ID da origem.
 * @param {object} data - Dados para atualizar (ex: { nome: 'Site Principal' }).
 */
const updateOrigem = async (id, data) => {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("ID de origem inválido.");
    const { nome } = data;
    if (!nome || typeof nome !== 'string' || nome.trim() === '') {
        throw new Error('O nome da origem é obrigatório para atualização.');
    }
    const nomeTrimmed = nome.trim();

    try {
         // Verifica duplicidade em OUTRO documento
         const existing = await Origem.findOne({
            nome: { $regex: new RegExp(`^${nomeTrimmed}$`, 'i') },
            _id: { $ne: id }
         });
         if (existing) {
            throw new Error(`Já existe outra origem com o nome '${nomeTrimmed}'.`);
         }

        const atualizada = await Origem.findByIdAndUpdate(
            id,
            { nome: nomeTrimmed },
            { new: true, runValidators: true }
        );
        if (!atualizada) {
            throw new Error('Origem não encontrada.');
        }
        console.log("[OrigemService] Origem atualizada:", id);
        return atualizada;
    } catch (error) {
        if (error.message.includes("já existe")) throw error; // Repassa erro de duplicação
        console.error("[OrigemService] Erro ao atualizar origem:", error);
        throw new Error('Erro ao atualizar origem.');
    }
};

/**
 * Exclui uma origem.
 * @param {string} id - ID da origem a excluir.
 */
const deleteOrigem = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("ID de origem inválido.");
    try {
        const origemToDelete = await Origem.findById(id);
        if (!origemToDelete) {
            throw new Error('Origem não encontrada.');
        }

        // <<< VERIFICAÇÃO CRÍTICA: Origem está em uso? >>>
        const leadCount = await Lead.countDocuments({ origem: id });
        if (leadCount > 0) {
            throw new Error(`Não é possível excluir: A origem "${origemToDelete.nome}" está sendo usada por ${leadCount} lead(s).`);
        }
        // <<< FIM VERIFICAÇÃO >>>

        await Origem.findByIdAndDelete(id);
        console.log("[OrigemService] Origem excluída:", id);
        return { mensagem: `Origem "${origemToDelete.nome}" excluída com sucesso.` };

    } catch (error) {
        // Repassa o erro específico ou um genérico
        console.error("[OrigemService] Erro ao excluir origem:", error);
        throw new Error(error.message || 'Erro ao excluir origem.');
    }
};

module.exports = {
    getAllOrigens, // Renomeado para consistência
    createOrigem,
    updateOrigem,
    deleteOrigem,
};