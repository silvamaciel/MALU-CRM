// backend/services/ModeloContratoService.js
const mongoose = require('mongoose');
const ModeloContrato = require('../models/ModeloContrato');
const PropostaContrato = require('../models/PropostaContrato'); 

/**
 * Cria um novo modelo de contrato.
 */
const createModeloContrato = async (modeloData, companyId) => {
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error('ID da empresa inválido.');
    }
    if (!modeloData || !modeloData.nomeModelo || !modeloData.tipoDocumento || !modeloData.conteudoHTMLTemplate) {
        throw new Error('Dados insuficientes. Nome, tipo e conteúdo HTML são obrigatórios.');
    }

    const novoModelo = new ModeloContrato({
        ...modeloData,
        company: companyId,
        ativo: true
    });

    try {
        await novoModelo.save();
        console.log(`[ModContratoSvc] Modelo de Contrato criado: ${novoModelo._id} para Company: ${companyId}`);
        return novoModelo;
    } catch (error) {
        if (error.code === 11000) { // Erro de índice único (nomeModelo + company)
            throw new Error(`Já existe um modelo de contrato com o nome "${novoModelo.nomeModelo}" nesta empresa.`);
        }
        console.error("[ModContratoSvc] Erro ao criar modelo de contrato:", error);
        throw new Error(error.message || "Erro ao salvar novo modelo de contrato.");
    }
};

/**
 * Lista todos os modelos de contrato de uma empresa com paginação.
 */
const getModelosContratoByCompany = async (companyId, filters = {}, paginationOptions = { page: 1, limit: 10 }) => {
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error('ID da empresa inválido.');
    }
    const page = parseInt(paginationOptions.page, 10) || 1;
    const limit = parseInt(paginationOptions.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const queryConditions = { company: companyId, ativo: true, ...filters };
    for (const key in queryConditions) {
        if (queryConditions[key] === null || queryConditions[key] === undefined || queryConditions[key] === '') {
            delete queryConditions[key];
        }
    }
    
    console.log(`[ModContratoSvc] Buscando modelos de contrato para Company: ${companyId}, Condições:`, queryConditions);
    try {
        const modelos = await ModeloContrato.find(queryConditions)
            .sort({ nomeModelo: 1 })
            .skip(skip)
            .limit(limit)
            .lean();
        const totalModelos = await ModeloContrato.countDocuments(queryConditions);
        console.log(`[ModContratoSvc] ${totalModelos} modelos encontrados para Company: ${companyId}`);
        return { modelos, total: totalModelos, page, pages: Math.ceil(totalModelos / limit) || 1 };
    } catch (error) {
        console.error("[ModContratoSvc] Erro ao buscar modelos de contrato:", error);
        throw new Error("Erro ao buscar modelos de contrato.");
    }
};

/**
 * Busca um modelo de contrato específico por ID.
 */
const getModeloContratoById = async (modeloId, companyId) => {
    if (!modeloId || !mongoose.Types.ObjectId.isValid(modeloId) ||
        !companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error('IDs de Modelo de Contrato ou Empresa inválidos.');
    }
    console.log(`[ModContratoSvc] Buscando Modelo ID: ${modeloId} para Company: ${companyId}`);
    try {
        const modelo = await ModeloContrato.findOne({ _id: modeloId, company: companyId, ativo: true }).lean();
        if (!modelo) {
            console.log(`[ModContratoSvc] Modelo ID: ${modeloId} não encontrado para Company: ${companyId} ou inativo.`);
            return null;
        }
        return modelo;
    } catch (error) {
        console.error(`[ModContratoSvc] Erro ao buscar modelo ${modeloId}:`, error);
        throw new Error("Erro ao buscar modelo de contrato por ID.");
    }
};

/**
 * Atualiza um modelo de contrato existente.
 */
const updateModeloContrato = async (modeloId, updateData, companyId) => {
    if (!modeloId || !mongoose.Types.ObjectId.isValid(modeloId) ||
        !companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error('IDs de Modelo de Contrato ou Empresa inválidos para atualização.');
    }
    console.log(`[ModContratoSvc] Atualizando Modelo ID: ${modeloId} para Company: ${companyId}`);
    delete updateData.company; delete updateData.ativo; delete updateData._id;

    try {
        if (updateData.nomeModelo) {
            const existing = await ModeloContrato.findOne({
                _id: { $ne: modeloId }, nomeModelo: updateData.nomeModelo, company: companyId, ativo: true
            });
            if (existing) {
                throw new Error(`Já existe um modelo de contrato com o nome "${updateData.nomeModelo}" nesta empresa.`);
            }
        }
        const modeloAtualizado = await ModeloContrato.findOneAndUpdate(
            { _id: modeloId, company: companyId, ativo: true },
            { $set: updateData },
            { new: true, runValidators: true }
        );
        if (!modeloAtualizado) {
            throw new Error("Modelo de Contrato não encontrado, não pertence à empresa ou está inativo.");
        }
        console.log(`[ModContratoSvc] Modelo ID: ${modeloId} atualizado.`);
        return modeloAtualizado;
    } catch (error) {
        if (error.code === 11000) {
            throw new Error(`Já existe um modelo de contrato com o nome "${updateData.nomeModelo}" nesta empresa.`);
        }
        console.error(`[ModContratoSvc] Erro ao atualizar modelo ${modeloId}:`, error);
        throw new Error(error.message || "Erro ao atualizar modelo de contrato.");
    }
};

/**
 * Desativa (soft delete) um modelo de contrato.
 */
const deleteModeloContrato = async (modeloId, companyId) => {
    if (!modeloId || !mongoose.Types.ObjectId.isValid(modeloId) ||
        !companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error('IDs de Modelo de Contrato ou Empresa inválidos para desativação.');
    }
    console.log(`[ModContratoSvc] Desativando Modelo ID: ${modeloId} para Company: ${companyId}`);

    const propostasUsandoModelo = await PropostaContrato.countDocuments({ modeloContratoUtilizado: modeloId, company: companyId });
     if (propostasUsandoModelo > 0) {
         throw new Error('Não é possível desativar um modelo de contrato que já está em uso.');
    }

    try {
        const modelo = await ModeloContrato.findOneAndUpdate(
            { _id: modeloId, company: companyId, ativo: true },
            { $set: { ativo: false } },
            { new: true }
        );
        if (!modelo) {
            throw new Error("Modelo de Contrato não encontrado, já está inativo ou não pertence à empresa.");
        }
        console.log(`[ModContratoSvc] Modelo ID: ${modeloId} desativado.`);
        return { message: "Modelo de contrato desativado com sucesso." };
    } catch (error) {
        console.error(`[ModContratoSvc] Erro ao desativar modelo ${modeloId}:`, error);
        throw new Error(error.message || "Erro ao desativar modelo de contrato.");
    }
};

module.exports = {
    createModeloContrato,
    getModelosContratoByCompany,
    getModeloContratoById,
    updateModeloContrato,
    deleteModeloContrato
};