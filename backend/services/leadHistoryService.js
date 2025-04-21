// services/leadHistoryService.js
const mongoose = require('mongoose');
const LeadHistory = require('../models/LeadHistory');
const Lead = require('../models/Lead'); // Para verificar se o lead existe

const getLeadHistory = async (leadId) => {
    if (!mongoose.Types.ObjectId.isValid(leadId)) {
        throw new Error("ID do Lead inválido.");
    }

    // Opcional: Verificar se o lead principal ainda existe
    const leadExists = await Lead.findById(leadId).select('_id').lean();
    if (!leadExists) {
        throw new Error("Lead não encontrado.");
    }

    try {
        const history = await LeadHistory.find({ lead: leadId })
            // Popula o nome do usuário se user não for null (útil quando tiver auth)
            .populate('user', 'nome')
            .sort({ createdAt: -1 }); // Ordena do mais recente para o mais antigo
        return history;
    } catch (error) {
        console.error(`Erro ao buscar histórico para lead ${leadId}:`, error);
        throw new Error("Falha ao buscar histórico do lead.");
    }
};

module.exports = {
    getLeadHistory,
};