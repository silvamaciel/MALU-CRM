// services/brokerContactService.js
const mongoose = require('mongoose');
const BrokerContact = require('../models/BrokerContact');
const Lead = require('../models/Lead');

/**
 * Lista todos os contatos de corretores ATIVOS de uma empresa específica.
 * @param {string} companyId - ID da empresa.
 * @returns {Promise<Array>} - Array de contatos de corretores.
 */
const getAllBrokerContactsByCompany = async (companyId) => {
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error('ID da empresa inválido ou não fornecido.');
    }
    try {
        const brokers = await BrokerContact.find({ company: companyId, ativo: true })
                                         .sort({ nome: 1 }); // Ordena por nome
        console.log(`[BrokerSvc] Encontrados ${brokers.length} corretores para empresa ${companyId}`);
        return brokers;
    } catch (error) {
        console.error(`[BrokerSvc] Erro ao buscar corretores para ${companyId}:`, error);
        throw new Error('Erro ao buscar contatos de corretores.');
    }
};

/**
 * Busca um contato de corretor específico pelo ID, DENTRO de uma empresa.
 * @param {string} id - ID do contato do corretor.
 * @param {string} companyId - ID da empresa.
 * @returns {Promise<object|null>} - Documento do contato ou null.
 */
const getBrokerContactById = async (id, companyId) => {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("ID do contato inválido.");
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) throw new Error('ID da empresa inválido.');
    try {
        const broker = await BrokerContact.findOne({ _id: id, company: companyId });
        if (!broker) {
            throw new Error('Contato de corretor não encontrado nesta empresa.');
        }
        return broker;
    } catch (error) {
        console.error(`[BrokerSvc] Erro ao buscar corretor ${id} para ${companyId}:`, error);
        throw new Error(error.message || 'Erro ao buscar contato do corretor.');
    }
};

/**
 * Cria um novo contato de corretor para uma empresa específica.
 * @param {object} brokerData - Dados do corretor (nome*, contato?, email?, creci?, nomeImobiliaria?, cpfCnpj?).
 * @param {string} companyId - ID da empresa.
 * @returns {Promise<object>} - O documento do corretor criado.
 */
const createBrokerContact = async (brokerData, companyId) => {
    const { nome, contato, email, creci, nomeImobiliaria, cpfCnpj } = brokerData;
    if (!nome) { throw new Error('O nome do corretor é obrigatório.'); }
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) { throw new Error('ID da empresa inválido.'); }

    // Limpeza e preparação de dados
    const dataToSave = {
        nome: nome.trim(),
        contato: contato ? contato.trim() : null, // Salva null se vazio
        email: email ? email.trim().toLowerCase() : null, // Salva null se vazio
        creci: creci ? creci.trim() : null,
        nomeImobiliaria: nomeImobiliaria ? nomeImobiliaria.trim() : null,
        cpfCnpj: cpfCnpj ? cpfCnpj.trim().replace(/\D/g, '') : null, // Salva só números ou null
        company: companyId, // Associa à empresa
        ativo: true // Default
    };

    try {
        const newBrokerContact = new BrokerContact(dataToSave);
        await newBrokerContact.save();
        console.log(`[BrokerSvc] Contato de corretor criado para ${companyId}:`, newBrokerContact._id);
        return newBrokerContact;
    } catch (error) {
        console.error(`[BrokerSvc] Erro ao criar corretor para ${companyId}:`, error);
        // Repassa o erro (pode ser de validação ou duplicidade do hook)
        throw new Error(error.message || "Erro ao criar contato de corretor.");
    }
};

/**
 * Atualiza um contato de corretor existente de uma empresa específica.
 * @param {string} id - ID do contato a atualizar.
 * @param {string} companyId - ID da empresa proprietária.
 * @param {object} updateData - Dados a serem atualizados.
 * @returns {Promise<object>} - O documento atualizado.
 */
const updateBrokerContact = async (id, companyId, updateData) => {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("ID do contato inválido.");
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) throw new Error("ID da empresa inválido.");

    const fieldsToUpdate = {};
    const allowedFields = ['nome', 'contato', 'email', 'creci', 'nomeImobiliaria', 'cpfCnpj', 'ativo'];

    for (const key of allowedFields) {
        if (updateData[key] !== undefined) {
             let value = updateData[key];
             if (typeof value === 'string') value = value.trim();
             if (key === 'email' && value) value = value.toLowerCase();
             if (key === 'cpfCnpj' && value) value = value.replace(/\D/g, '');

             if (key !== 'nome' && value === '') {
                 fieldsToUpdate[key] = null;
             } else if (key === 'ativo') {
                 fieldsToUpdate[key] = Boolean(value);
             } else {
                 fieldsToUpdate[key] = value;
             }
        }
    }
    if (fieldsToUpdate.nome === '') throw new Error('O nome não pode ser vazio.');
    if (fieldsToUpdate.email && !/\S+@\S+\.\S+/.test(fieldsToUpdate.email)) throw new Error('Formato de email inválido.');
    if (fieldsToUpdate.cpfCnpj) {
    }

    if (Object.keys(fieldsToUpdate).length === 0) {
        throw new Error("Nenhum dado válido fornecido para atualização.");
    }

    try {
        const updatedBroker = await BrokerContact.findOneAndUpdate(
            { _id: id, company: companyId }, // Filtra por ID e Empresa
            { $set: fieldsToUpdate },
            { new: true, runValidators: true } // Roda validadores do schema
        );

        if (!updatedBroker) {
            throw new Error('Contato de corretor não encontrado nesta empresa.');
        }
        console.log(`[BrokerSvc] Contato de corretor atualizado para ${companyId}:`, id);
        return updatedBroker;
    } catch (error) {
        console.error(`[BrokerSvc] Erro ao atualizar corretor ${id} para ${companyId}:`, error);
        throw new Error(error.message || "Erro ao atualizar contato de corretor.");
    }
};

/**
 * Exclui um contato de corretor de uma empresa específica.
 * @param {string} id - ID do contato a excluir.
 * @param {string} companyId - ID da empresa proprietária.
 */
const deleteBrokerContact = async (id, companyId) => {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("ID do contato inválido.");
    if (!mongoose.Types.ObjectId.isValid(companyId)) throw new Error("ID da empresa inválido.");

    try {
        const brokerToDelete = await BrokerContact.findOne({ _id: id, company: companyId });
        if (!brokerToDelete) {
            throw new Error('Contato de corretor não encontrado nesta empresa.');
        }

        await BrokerContact.deleteOne({ _id: id, company: companyId });
        console.log(`[BrokerSvc] Contato de corretor excluído para ${companyId}:`, id);
        return { message: `Contato "${brokerToDelete.nome}" excluído com sucesso.` };

    } catch (error) {
        console.error(`[BrokerSvc] Erro ao excluir corretor ${id} para ${companyId}:`, error);
        throw new Error(error.message || 'Erro ao excluir contato de corretor.');
    }
};

module.exports = {
    getAllBrokerContactsByCompany,
    getBrokerContactById,
    createBrokerContact,
    updateBrokerContact,
    deleteBrokerContact,
};