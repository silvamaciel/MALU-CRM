// controllers/leadStageController.js
const leadStageService = require('../services/LeadStageService');
const mongoose = require('mongoose');

const checkCompanyId = (req, res, next) => {
    if (!req.user || !req.user.company) {
        console.error("[Controller] Erro: req.user ou req.user.company não encontrado. Middleware 'protect' falhou ou usuário não tem empresa.");
        return res.status(500).json({ error: 'Erro interno: Informação da empresa do usuário não encontrada.' });
    }
    req.companyId = req.user.company;
    next();
};



const getAllLeadStages = async (req, res) => {
    try {
        const companyId = req.user.company; 
        const stages = await leadStageService.getAllLeadStages(companyId); 
        res.json(stages);
    } catch (error) {
        console.error("[Ctrl-LS] Erro getAll:", error.message)
        res.status(500).json({ error: error.message });
    }
};

const createLeadStage = async (req, res) => {
    console.log("[Ctrl-LS] Recebido POST /api/leadStage");
    try {
        const companyId = req.user.company; 
        const newStage = await leadStageService.createLeadStage(req.body, companyId);
        res.status(201).json(newStage);
    } catch (error) {
        console.error("[Ctrl-LS] Erro create:", error.message);
        const statusCode = error.message.includes("já existe") ? 409 : 400;
        res.status(statusCode).json({ error: error.message });
    }
};

const updateLeadStage = async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
       return res.status(400).json({ error: 'ID de situação inválido.' });
    }
    console.log(`[Ctrl-LS] Recebido PUT /api/leadStage/${id}`);
    try {
        const companyId = req.user.company; 
        const updatedStage = await leadStageService.updateLeadStage(id, companyId, req.body);
        res.json(updatedStage);
    } catch (error) {
        console.error(`[Ctrl-LS] Erro update ${id}:`, error.message);
        const statusCode = error.message.includes("não encontrada") ? 404 : (error.message.includes("já existe") ? 409 : 400);
        res.status(statusCode).json({ error: error.message });
    }
};

const deleteLeadStage = async (req, res) => {
    const { id } = req.params;
     if (!mongoose.Types.ObjectId.isValid(id)) {
       return res.status(400).json({ error: 'ID de situação inválido.' });
    }
    console.log(`[Ctrl-LS] Recebido DELETE /api/leadStage/${id}`);
    try {
        const companyId = req.user.company; 
        const result = await leadStageService.deleteLeadStage(id, companyId);
        res.status(200).json(result);
    } catch (error) {
        console.error(`[Ctrl-LS] Erro delete ${id}:`, error.message);
        const statusCode = error.message.includes("não encontrada") ? 404 : (error.message.includes("sendo usada") ? 409 : 400);
        res.status(statusCode).json({ error: error.message });
    }
};

module.exports = {
    checkCompanyId,
    getAllLeadStages,
    createLeadStage,
    updateLeadStage,
    deleteLeadStage
};