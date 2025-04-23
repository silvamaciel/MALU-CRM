// controllers/leadStageController.js
// (Se já criou o arquivo antes, substitua. Senão, crie novo)
const leadStageService = require('../services/leadStageService');
const mongoose = require('mongoose'); // Para validar ID na rota se precisar

// Controller para listar todas as situações
const getAllLeadStages = async (req, res) => {
    try {
        const stages = await leadStageService.getLeadStages();
        res.json(stages);
    } catch (error) {
        console.error("[Ctrl-LS] Erro getAll:", error.message)
        res.status(500).json({ error: error.message });
    }
};

// Controller para criar uma nova situação
const createLeadStage = async (req, res) => {
    console.log("[Ctrl-LS] Recebido POST /api/leadStage");
    try {
        const newStage = await leadStageService.createLeadStage(req.body);
        res.status(201).json(newStage);
    } catch (error) {
        console.error("[Ctrl-LS] Erro create:", error.message);
        // Erro pode ser 400 (Bad Request) ou 409 (Conflict)
        const statusCode = error.message.includes("já existe") ? 409 : 400;
        res.status(statusCode).json({ error: error.message });
    }
};

// Controller para atualizar uma situação
const updateLeadStage = async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
       return res.status(400).json({ error: 'ID de situação inválido.' });
    }
    console.log(`[Ctrl-LS] Recebido PUT /api/leadStage/${id}`);
    try {
        const updatedStage = await leadStageService.updateLeadStage(id, req.body);
        // O serviço agora lança erro se não encontrar, então não precisamos checar null aqui
        res.json(updatedStage);
    } catch (error) {
        console.error(`[Ctrl-LS] Erro update ${id}:`, error.message);
        const statusCode = error.message.includes("não encontrada") ? 404 : (error.message.includes("já existe") ? 409 : 400);
        res.status(statusCode).json({ error: error.message });
    }
};

// Controller para excluir uma situação
const deleteLeadStage = async (req, res) => {
    const { id } = req.params;
     if (!mongoose.Types.ObjectId.isValid(id)) {
       return res.status(400).json({ error: 'ID de situação inválido.' });
    }
    console.log(`[Ctrl-LS] Recebido DELETE /api/leadStage/${id}`);
    try {
        const result = await leadStageService.deleteLeadStage(id);
        // O serviço agora lança erro se não encontrar, ou retorna msg de sucesso
        res.status(200).json(result); // Envia a mensagem de sucesso
    } catch (error) {
        console.error(`[Ctrl-LS] Erro delete ${id}:`, error.message);
         // Erro pode ser 404, 409 (em uso), 400 ou 500
        const statusCode = error.message.includes("não encontrada") ? 404 : (error.message.includes("sendo usada") ? 409 : 400);
        res.status(statusCode).json({ error: error.message });
    }
};

module.exports = {
    getAllLeadStages,
    createLeadStage,
    updateLeadStage,
    deleteLeadStage
};