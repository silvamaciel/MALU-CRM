// services/dashboardService.js
const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const LeadStage = require('../models/LeadStage');
const User = require('../models/User');
const Origem = require('../models/Origem'); 

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
    const companyObjectId = new mongoose.Types.ObjectId(companyId); 

    try {
        // --- Query 1: ID do Status "Descartado" ---
        const discardedStage = await LeadStage.findOne({ company: companyObjectId, nome: "Descartado" }).select('_id').lean();
        const discardedStageId = discardedStage?._id;
        if (!discardedStageId) {
             console.warn(`[DashboardService] Situação "Descartado" não encontrada para empresa ${companyId}`);
        }

        // Query 2: Contagem de Leads Ativos ---
        const activeLeadsFilter = { company: companyObjectId };
        if (discardedStageId) { activeLeadsFilter.situacao = { $ne: discardedStageId }; }
        const totalActiveLeadsPromise = Lead.countDocuments(activeLeadsFilter);

        // Query 3: Agregação Leads por Situação ---
        const leadsByStatusPipeline = [
            { $match: { company: companyObjectId } },
            { $group: { _id: "$situacao", count: { $sum: 1 } }},
            { $lookup: { from: 'leadstages', localField: '_id', foreignField: '_id', as: 'stageDetails' }},
            { $unwind: { path: "$stageDetails", preserveNullAndEmptyArrays: true } },
            { $project: { _id: 0, name: { $ifNull: ["$stageDetails.nome", "Status Removido"] }, count: "$count" }},
            { $sort: { "stageDetails.ordem": 1, name: 1 } } // Ordena pela ordem da situação
        ];
        const leadsByStatusPromise = Lead.aggregate(leadsByStatusPipeline);

        // Query 4: Agregação Leads por Origem >>>
        const leadsByOriginPipeline = [
            { $match: { company: companyObjectId } },
            // 1. Agrupa por ID da origem (ou null)
            { $group: { _id: "$origem", count: { $sum: 1 } }},
            // 2. Busca detalhes da Origem
            { $lookup: { from: 'origems', localField: '_id', foreignField: '_id', as: 'originDetails' }},
            // 3. Descontrói o array (seguro usar pois _id é unique em origens)
            { $unwind: { path: "$originDetails", preserveNullAndEmptyArrays: true } }, // Mantém os que não têm origem (_id: null)
            // 4. Projeta o nome CORRETO ("Sem Origem" se null, ou o nome real) e mantém a contagem
            { $project: {
                _id: 0, // Remove o ID do grupo anterior
                name: { $ifNull: ["$originDetails.nome", "Sem Origem"] }, // Define o nome final
                count: "$count"
            }},
            // 5. <<< NOVO AGRUPAMENTO pelo nome projetado >>>
            // Agrupa novamente, desta vez pelo 'name', somando as contagens
            { $group: {
                _id: "$name",             // Agrupa pelo nome final ('Sem Origem', 'Website', etc.)
                totalCount: { $sum: "$count" } // Soma as contagens de grupos que tiveram o mesmo nome final
            }},
            // 6. <<< PROJEÇÃO FINAL >>>
            // Formata a saída final como { name, count }
            { $project: {
                _id: 0,
                name: "$_id", // O _id do grupo anterior agora é o nome
                count: "$totalCount"
            }},
            // 7. Ordena
            { $sort: { count: -1, name: 1 } } // Ordena por contagem (desc) e nome
       ];
        const leadsByOriginPromise = Lead.aggregate(leadsByOriginPipeline);

        //Query 5: Agregação Leads por Responsável >>>
         const leadsByResponsiblePipeline = [
             { $match: { company: companyObjectId } }, // Filtra pela empresa
             // Agrupa por responsável
             { $group: { _id: "$responsavel", count: { $sum: 1 } }},
              // Busca o nome do usuário responsável
             { $lookup: { from: 'users', // <<< Nome da coleção de usuários
                           localField: '_id', foreignField: '_id', as: 'userDetails' }},
             { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } }, // Mantém grupos com responsável null/deletado
             { $project: { _id: 0, name: { $ifNull: ["$userDetails.nome", "Sem Responsável"] }, count: "$count" }},
             { $sort: { count: -1, name: 1 } } // Ordena por contagem (desc) e nome
        ];
        const leadsByResponsiblePromise = Lead.aggregate(leadsByResponsiblePipeline);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
        thirtyDaysAgo.setUTCHours(0, 0, 0, 0); 

        const leadsByDatePipeline = [
            { $match: {
                company: companyObjectId,
                createdAt: { $gte: thirtyDaysAgo }
            }},
            { $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Etc/UTC" } }, // Formata data como string
                count: { $sum: 1 }
            }},
            { $project: { _id: 0, date: "$_id", count: "$count" }}, // Renomeia _id para date
            { $sort: { date: 1 } } 
          ];
        const leadsByDatePromise = Lead.aggregate(leadsByDatePipeline);


        // --- Executa todas as queries em paralelo ---
        const [
            totalActiveLeads,
            leadsByStatus,
            leadsByOrigin,
            leadsByResponsible,
            leadsByDate
        ] = await Promise.all([
            totalActiveLeadsPromise,
            leadsByStatusPromise,
            leadsByOriginPromise,       
            leadsByResponsiblePromise,   
            leadsByDatePromise          
        ]);

        console.log("[DashboardService] Resumo Gerado");

        // Retorna o objeto completo
        return {
            totalActiveLeads: totalActiveLeads,
            leadsByStatus: leadsByStatus,
            leadsByOrigin: leadsByOrigin,          
            leadsByResponsible: leadsByResponsible, 
            leadsByDate: leadsByDate               
        };

    } catch (error) {
        console.error(`[DashboardService] Erro ao gerar resumo para empresa ${companyId}:`, error);
        throw new Error("Erro ao gerar resumo do dashboard.");
    }
};

module.exports = {
    getDashboardSummary,
};