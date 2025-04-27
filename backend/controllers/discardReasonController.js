// controllers/discardReasonController.js
const discardReasonService = require('../services/discardReasonService');
const mongoose = require('mongoose'); // Para validar ID

/**
 * Controller para listar motivos de descarte da empresa do usuário logado.
 */
const getAllDiscardReasonsByCompany = async (req, res) => {
    try {
        // <<< Pega companyId do usuário logado >>>
        const companyId = req.user?.company;
        if (!companyId) {
            return res.status(401).json({ error: 'Empresa do usuário não identificada.' });
        }
        // <<< Chama o serviço com companyId >>>
        const reasons = await discardReasonService.getAllDiscardReasonsByCompany(companyId);
        res.json(reasons);
    } catch (error) {
        console.error("[Ctrl-DR] Erro getAll:", error.message)
        res.status(500).json({ error: error.message });
    }
};

/**
 * Controller para criar um novo motivo de descarte (para a empresa do requisitante).
 */
const createDiscardReason = async (req, res) => {
    console.log("[Ctrl-DR] Recebido POST /api/motivosdescarte");
    try {
        // <<< Pega companyId do usuário logado >>>
        const companyId = req.user?.company;
        if (!companyId) {
            return res.status(401).json({ error: 'Empresa do usuário não identificada.' });
        }
        // <<< Passa req.body e companyId >>>
        const newReason = await discardReasonService.createDiscardReason(req.body, companyId);
        res.status(201).json(newReason);
    } catch (error) {
        console.error("[Ctrl-DR] Erro create:", error.message);
        const statusCode = error.message.includes("já existe") ? 409 : 400;
        res.status(statusCode).json({ error: error.message });
    }
};

/**
 * Controller para atualizar um motivo de descarte (da empresa do requisitante).
 */
const updateDiscardReason = async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
       return res.status(400).json({ error: 'ID de motivo inválido.' });
    }
    console.log(`[Ctrl-DR] Recebido PUT /api/motivosdescarte/${id}`);
    try {
        // <<< Pega companyId do usuário logado >>>
        const companyId = req.user?.company;
        if (!companyId) {
            return res.status(401).json({ error: 'Empresa do usuário não identificada.' });
        }
        // <<< Passa id, companyId e req.body >>>
        const updatedReason = await discardReasonService.updateDiscardReason(id, companyId, req.body);
        res.json(updatedReason); // Serviço já trata 'não encontrado'
    } catch (error) {
        console.error(`[Ctrl-DR] Erro update ${id}:`, error.message);
        const statusCode = error.message.includes("não encontrada") ? 404 : (error.message.includes("já existe") ? 409 : 400);
        res.status(statusCode).json({ error: error.message });
    }
};

/**
 * Controller para excluir um motivo de descarte (da empresa do requisitante).
 */
const deleteDiscardReason = async (req, res) => {
     const { id } = req.params;
     if (!mongoose.Types.ObjectId.isValid(id)) {
       return res.status(400).json({ error: 'ID de motivo inválido.' });
    }
    console.log(`[Ctrl-DR] Recebido DELETE /api/motivosdescarte/${id}`);
    try {
        // <<< Pega companyId do usuário logado >>>
        const companyId = req.user?.company;
        if (!companyId) {
            return res.status(401).json({ error: 'Empresa do usuário não identificada.' });
        }
        // <<< Passa id e companyId >>>
        const result = await discardReasonService.deleteDiscardReason(id, companyId);
        res.status(200).json(result); // Serviço já trata 'não encontrado' ou 'em uso'
    } catch (error) {
        console.error(`[Ctrl-DR] Erro delete ${id}:`, error.message);
        // Serviço lança erro com mensagem específica (404, 409), senão 500
        const statusCode = error.message.includes("não encontrada") ? 404 : (error.message.includes("sendo usado") ? 409 : 500);
        res.status(statusCode).json({ error: error.message });
    }
};

module.exports = {
    getAllDiscardReasonsByCompany,
    createDiscardReason,
    updateDiscardReason,
    deleteDiscardReason
};