// controllers/leadStageController.js
const leadStageService = require('../services/LeadStageService');
const mongoose = require('mongoose');
const asyncHandler = require("../middlewares/asyncHandler");

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

/**
 * @desc    Atualizar a ordem das situações de lead para uma empresa
 * @route   PUT /api/leadstages/order
 * @access  Privado (Admin)
 */
const updateLeadStagesOrderController = asyncHandler(async (req, res, next) => {
    // Log inicial para sabermos que o controller foi atingido
    console.log("[LeadStageCtrl Order] INÍCIO updateLeadStagesOrderController");

    const companyId = req.user.company; // Obtido do middleware 'protect'
    const { orderedStageIds } = req.body;

    // Logs para depurar o que foi recebido
    console.log("[LeadStageCtrl Order] req.body recebido:", JSON.stringify(req.body, null, 2));
    console.log("[LeadStageCtrl Order] orderedStageIds extraído:", orderedStageIds);
    console.log("[LeadStageCtrl Order] Tipo de orderedStageIds:", typeof orderedStageIds, "É array?", Array.isArray(orderedStageIds));
    
    let algumIdInvalidoLog = false; // Flag para log
    if (Array.isArray(orderedStageIds)) {
        orderedStageIds.forEach((id, index) => {
            const isValid = id && mongoose.Types.ObjectId.isValid(id);
            console.log(`[LeadStageCtrl Order] Verificando ID[${index}]: '${id}', É ObjectId válido? ${isValid}`);
            if (!isValid) {
                algumIdInvalidoLog = true;
            }
        });
    } else {
        algumIdInvalidoLog = true; // Não é um array
    }

    // Validação
    if (algumIdInvalidoLog || !Array.isArray(orderedStageIds)) {
        console.error("[LeadStageCtrl Order] ERRO DE VALIDAÇÃO: Um ou mais IDs são inválidos, nulos, ou 'orderedStageIds' não é um array. Array recebido:", orderedStageIds);
        // Esta é a mensagem de erro que o frontend deveria receber se esta validação falhar
        return next(new ErrorResponse('O corpo da requisição deve conter um array "orderedStageIds" com IDs de situação válidos.', 400));
    }

    console.log("[LeadStageCtrl Order] Todos os IDs parecem válidos. Chamando LeadStageService.updateLeadStagesOrder...");
    const result = await LeadStageService.updateLeadStagesOrder(companyId, orderedStageIds);
    console.log("[LeadStageCtrl Order] LeadStageService.updateLeadStagesOrder retornou.");
    
    res.status(200).json({ success: true, message: result.message });
});


module.exports = {
    checkCompanyId,
    getAllLeadStages,
    createLeadStage,
    updateLeadStage,
    deleteLeadStage,
    updateLeadStagesOrderController
};