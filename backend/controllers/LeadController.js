// controllers/LeadController.js

const leadService = require('../services/LeadService');
const leadHistoryService = require('../services/leadHistoryService'); 
const mongoose = require('mongoose'); 
const asyncHandler = require("../middlewares/asyncHandler");
const ErrorResponse = require('../utils/errorResponse');



const getLeads = async (req, res) => {
    try {
        const companyId = req.user?.company;
        if (!companyId) {
            return res.status(401).json({ error: 'Empresa do usuário não identificada.' });
        }

        const result = await leadService.getLeads(req.query, companyId);
        res.json(result);

    } catch (error) {
        console.error("[Ctrl-Lead getLeads] Erro:", error);
        res.status(500).json({ error: error.message || 'Erro ao buscar leads.' });
    }
};

const getLeadById = async (req, res) => {
    const { id } = req.params;
     if (!mongoose.Types.ObjectId.isValid(id)) {
       return res.status(400).json({ error: 'ID de Lead inválido.' });
    }
    try {
        const companyId = req.user?.company;
        if (!companyId) {
            return res.status(401).json({ error: 'Empresa do usuário não identificada.' });
        }

        const lead = await leadService.getLeadById(id, companyId);
        res.json(lead); // Serviço já lança erro 404 se não encontrado na empresa

    } catch (error) {
        console.error(`[Ctrl-Lead getLeadById ${id}] Erro:`, error.message);
        const statusCode = error.message.toLowerCase().includes("não encontrado") ? 404 : 500;
        res.status(statusCode).json({ error: error.message });
    }
};

const createLead = async (req, res) => {
    try {
        const userId = req.user?._id;
        const companyId = req.user?.company;
        if (!userId || !companyId) {
            return res.status(401).json({ error: 'Usuário ou Empresa não identificado para criar lead.' });
        }

        const novoLead = await leadService.createLead(req.body, companyId, userId);
        res.status(201).json(novoLead);

    } catch (error) {
        console.error("[Ctrl-Lead createLead] Erro:", error.message);
        const statusCode = error.message.toLowerCase().includes("obrigatório") || error.message.toLowerCase().includes("inválido") ? 400 : (error.message.toLowerCase().includes("não encontrado") ? 400 : 500); // Ajustar status se necessário
        res.status(statusCode).json({ error: error.message });
    }
};

const updateLead = async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
       return res.status(400).json({ error: 'ID de Lead inválido.' });
    }
    try {
        // <<< Pega userId e companyId do usuário logado >>>
        const userId = req.user?._id;
        const companyId = req.user?.company;
         if (!userId || !companyId) {
            return res.status(401).json({ error: 'Usuário ou Empresa não identificado para atualizar lead.' });
        }

        // <<< Passa id, req.body, companyId e userId para o serviço >>>
        const leadAtualizado = await leadService.updateLead(id, req.body, companyId, userId);
        res.json(leadAtualizado); // Serviço já lança erro 404 se não encontrado na empresa

    } catch (error) {
        console.error(`[Ctrl-Lead update ${id}] Erro:`, error.message);
        const statusCode = error.message.toLowerCase().includes("não encontrad") ? 404 : (error.message.toLowerCase().includes("já existe") ? 409 : 400);
        res.status(statusCode).json({ error: error.message });
    }
};

const deleteLead = async (req, res) => {
    const { id } = req.params;
     if (!mongoose.Types.ObjectId.isValid(id)) {
       return res.status(400).json({ error: 'ID de Lead inválido.' });
    }
    try {
        const userId = req.user?._id;
        const companyId = req.user?.company;
         if (!userId || !companyId) {
            return res.status(401).json({ error: 'Usuário ou Empresa não identificado para excluir lead.' });
        }

        const msg = await leadService.deleteLead(id, companyId, userId);
        res.json(msg);

    } catch (error) {
        console.error(`[Ctrl-Lead delete ${id}] Erro:`, error.message);
        const statusCode = error.message.toLowerCase().includes("não encontrad") ? 404 : 500;
        res.status(statusCode).json({ error: error.message });
    }
};

const descartarLead = async (req, res) => {
    const { id } = req.params;
     if (!mongoose.Types.ObjectId.isValid(id)) {
       return res.status(400).json({ error: 'ID de Lead inválido.' });
    }
    try {
        const userId = req.user?._id;
        const companyId = req.user?.company;
         if (!userId || !companyId) {
            return res.status(401).json({ error: 'Usuário ou Empresa não identificado para descartar lead.' });
        }

        const lead = await leadService.descartarLead(id, req.body, companyId, userId);
        res.json(lead); 

    } catch (error) {
        console.error(`[Ctrl-Lead descartar ${id}] Erro:`, error.message);
        const statusCode = error.message.toLowerCase().includes("não encontrad") ? 404 : 400;
        res.status(statusCode).json({ error: error.message });
    }
};

const getLeadHistory = async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
       return res.status(400).json({ error: 'ID de Lead inválido.' });
    }
    try {
        const companyId = req.user?.company;
        const lead = await leadService.getLeadById(id, companyId); // Verifica se pertence à empresa
        if (!lead) return res.status(404).json({ error: 'Lead não encontrado nesta empresa.' });

        // Chama o serviço de histórico (que não filtra por empresa por padrão)
        const history = await leadHistoryService.getLeadHistory(id);
        res.json(history);
    } catch (error) {
        console.error(`[Ctrl-Lead getHistory ${id}] Erro:`, error.message);
        const statusCode = error.message.toLowerCase().includes("não encontrado") ? 404 : 500;
        res.status(statusCode).json({ error: error.message });
    }
};

const importLeadsFromCSVController = asyncHandler(async (req, res, next) => {
    const companyId = req.user.company;
    const createdByUserId = req.user._id;

    if (!req.file) {
        return next(new ErrorResponse('Nenhum arquivo CSV foi enviado.', 400));
    }
    
    console.log(`[LeadCtrl Import] Recebido arquivo CSV para importação: ${req.file.originalname}`);

    const fileBuffer = req.file.buffer;

    const summary = await LeadService.importLeadsFromCSV(fileBuffer, companyId, createdByUserId);
    
    res.status(200).json({ success: true, data: summary });
});


module.exports = {
    getLeads,
    getLeadById,
    createLead,
    updateLead,
    deleteLead,
    descartarLead,
    getLeadHistory,
    importLeadsFromCSVController
};