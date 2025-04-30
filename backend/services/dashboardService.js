// services/dashboardService.js
const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const LeadStage = require('../models/LeadStage');
const User = require('../models/User'); // Pode ser útil para outros resumos depois
const Origem = require('../models/Origem'); // Pode ser útil para outros resumos depois

/**
 * Busca dados resumidos para o dashboard de uma empresa específica.
 * @param {string} companyId - ID da empresa.
 * @returns {Promise<object>} - Objeto com dados resumidos.
 */
const getDashboardSummary = async (companyId) => {
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error('ID da empresa inválido ou não fornecido.');
    }
    console.log(`[DashboardService] Buscando resumo para Empresa: ${companyId}`);

    try {
        // 1. Encontrar o ID da situação "Descartado" para esta empresa
        const discardedStage = await LeadStage.findOne({ company: companyId, nome: "Descartado" }).select('_id').lean();
        const discardedStageId = discardedStage?._id; // Será null se não encontrar

        if (!discardedStageId) {
             console.warn(`[DashboardService] Situação "Descartado" não encontrada para empresa ${companyId}`);
             // Poderia retornar um erro ou continuar sem essa informação? Vamos continuar.
        }

        // 2. Contar Leads Ativos (Situação diferente de Descartado)
        const activeLeadsFilter = { company: companyId };
        if (discardedStageId) {
            activeLeadsFilter.situacao = { $ne: discardedStageId }; // $ne = Not Equal
        } else {
             // Se não achou 'Descartado', talvez conte todos? Ou logue um aviso?
             console.warn(`[DashboardService] Contando todos os leads como ativos pois 'Descartado' não foi encontrado para ${companyId}`);
        }
        const totalActiveLeads = await Lead.countDocuments(activeLeadsFilter);
        console.log(`[DashboardService] Leads Ativos: ${totalActiveLeads}`);


        // 3. Agregar Leads por Situação (Status)
        const leadsByStatusPipeline = [
            // Estágio 1: Filtrar apenas leads da empresa correta
            { $match: { company: new mongoose.Types.ObjectId(companyId) } },
            // Estágio 2: Agrupar por 'situacao' e contar quantos em cada grupo
            { $group: {
                _id: "$situacao", // Agrupa pelo campo 'situacao' (que contém o ObjectId)
                count: { $sum: 1 } // Conta 1 para cada documento no grupo
            }},
            // Estágio 3: Buscar os detalhes da Situação (o nome) usando $lookup
            { $lookup: {
                from: 'leadstages',       // Nome da coleção de LeadStage (Mongoose geralmente pluraliza e põe minúsculo)
                localField: '_id',        // Campo em LeadHistory (_id do $group, que é o ID da Situação)
                foreignField: '_id',      // Campo em LeadStage para fazer a junção
                as: 'stageDetails'        // Nome do novo array que será adicionado com os detalhes
            }},
            // Estágio 4: Desconstruir o array 'stageDetails' (sabemos que só virá 1 item)
            { $unwind: { path: "$stageDetails", preserveNullAndEmptyArrays: true } }, // preserveNull.. caso uma situação tenha sido deletada
            // Estágio 5: Projetar/Formatar a saída desejada
            { $project: {
                _id: 0, // Não incluir o _id do grupo
                name: { $ifNull: ["$stageDetails.nome", "Status Desconhecido"] }, // Pega o nome, ou usa default se não achar
                count: "$count" // Mantém a contagem
            }},
             // Estágio 6: Ordenar pelo nome do status (opcional)
             { $sort: { name: 1 } }
        ];

        const leadsByStatus = await Lead.aggregate(leadsByStatusPipeline);
        console.log("[DashboardService] Leads por Status:", leadsByStatus);


        // --- Adicione outras agregações aqui depois ---
        // Ex: Leads por Origem
        // Ex: Leads criados nos últimos 30 dias


        // 4. Retornar os dados compilados
        return {
            totalActiveLeads: totalActiveLeads,
            leadsByStatus: leadsByStatus,
            // leadsByOrigin: [], // Placeholder
            // leadsLast30Days: [] // Placeholder
        };

    } catch (error) {
        console.error(`[DashboardService] Erro ao gerar resumo para empresa ${companyId}:`, error);
        throw new Error("Erro ao gerar resumo do dashboard.");
    }
};

module.exports = {
    getDashboardSummary,
};