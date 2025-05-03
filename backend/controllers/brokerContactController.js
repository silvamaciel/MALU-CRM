// controllers/brokerContactController.js
const brokerContactService = require('../services/brokerContactService');
const mongoose = require('mongoose'); // Para validar ObjectId

/**
 * Controller para listar contatos de corretores da empresa logada.
 */
const getAllBrokerContacts = async (req, res) => {
    try {
        // Pega companyId do usuário autenticado via middleware 'protect'
        const companyId = req.user?.company;
        if (!companyId) {
            return res.status(401).json({ error: 'Empresa do usuário não identificada.' });
        }
        const brokers = await brokerContactService.getAllBrokerContactsByCompany(companyId);
        res.json(brokers);
    } catch (error) {
        console.error("[BrokerCtrl] Erro getAll:", error.message);
        res.status(500).json({ error: error.message || 'Erro ao buscar contatos de corretores.' });
    }
};

/**
 * Controller para buscar um contato de corretor por ID.
 */
const getBrokerContactById = async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
       return res.status(400).json({ error: 'ID de contato inválido.' });
    }
    try {
        const companyId = req.user?.company;
        if (!companyId) {
            return res.status(401).json({ error: 'Empresa do usuário não identificada.' });
        }
        const broker = await brokerContactService.getBrokerContactById(id, companyId);
        // Serviço lança erro 404 se não encontrar na empresa
        res.json(broker);
    } catch (error) {
        console.error(`[BrokerCtrl] Erro getById ${id}:`, error.message);
        const statusCode = error.message.includes("não encontrado") ? 404 : 500;
        res.status(statusCode).json({ error: error.message });
    }
};

/**
 * Controller para criar um novo contato de corretor.
 */
const createBrokerContact = async (req, res) => {
    console.log("[BrokerCtrl] Recebido POST /api/brokers");
    try {
        const companyId = req.user?.company;
        if (!companyId) {
            return res.status(401).json({ error: 'Empresa do usuário não identificada.' });
        }
        const newBrokerContact = await brokerContactService.createBrokerContact(req.body, companyId);
        res.status(201).json(newBrokerContact);
    } catch (error) {
        console.error("[BrokerCtrl] Erro create:", error.message);
        // Serviço pode retornar erro 409 (duplicado) ou 400 (validação)
        const statusCode = error.message.includes("já existe") ? 409 : 400;
        res.status(statusCode).json({ error: error.message });
    }
};

/**
 * Controller para atualizar um contato de corretor.
 */
const updateBrokerContact = async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
       return res.status(400).json({ error: 'ID de contato inválido.' });
    }
    console.log(`[BrokerCtrl] Recebido PUT /api/brokers/${id}`);
    try {
        const companyId = req.user?.company;
        if (!companyId) {
            return res.status(401).json({ error: 'Empresa do usuário não identificada.' });
        }
        const updatedBroker = await brokerContactService.updateBrokerContact(id, companyId, req.body);
        res.json(updatedBroker); // Serviço lança erro 404 se não encontrado
    } catch (error) {
        console.error(`[BrokerCtrl] Erro update ${id}:`, error.message);
        const statusCode = error.message.includes("não encontrado") ? 404 : (error.message.includes("já existe") ? 409 : 400);
        res.status(statusCode).json({ error: error.message });
    }
};

/**
 * Controller para excluir um contato de corretor.
 */
const deleteBrokerContact = async (req, res) => {
    const { id } = req.params;
     if (!mongoose.Types.ObjectId.isValid(id)) {
       return res.status(400).json({ error: 'ID de contato inválido.' });
    }
    console.log(`[BrokerCtrl] Recebido DELETE /api/brokers/${id}`);
    try {
        const companyId = req.user?.company;
        if (!companyId) {
            return res.status(401).json({ error: 'Empresa do usuário não identificada.' });
        }
        const result = await brokerContactService.deleteBrokerContact(id, companyId);
        res.status(200).json(result); // Serviço lança erro 404 ou 409 (em uso)
    } catch (error) {
        console.error(`[BrokerCtrl] Erro delete ${id}:`, error.message);
        const statusCode = error.message.includes("não encontrada") ? 404 : (error.message.includes("sendo usado") ? 409 : 400); // Ajustar status se serviço lançar 'em uso'
        res.status(statusCode).json({ error: error.message });
    }
};

module.exports = {
    getAllBrokerContacts,
    getBrokerContactById,
    createBrokerContact,
    updateBrokerContact,
    deleteBrokerContact,
};  