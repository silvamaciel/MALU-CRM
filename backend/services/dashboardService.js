// services/dashboardService.js
const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const LeadStage = require('../models/LeadStage');
const User = require('../models/User');
const Origem = require('../models/origem'); 

const PropostaContrato = require('../models/PropostaContrato');

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

        //Query 6: Leads Descartados
        let totalDiscardedLeadsPromise;
        if (discardedStageId) {
            // Só conta se o estágio 'Descartado' existir
            totalDiscardedLeadsPromise = Lead.countDocuments({ company: companyObjectId, situacao: discardedStageId });
        } else {
            // Se não existe estágio 'Descartado', não há leads descartados
            totalDiscardedLeadsPromise = Promise.resolve(0); // Retorna uma promessa resolvida com 0
        }

        //Query 6: Leads Descartados
        const now = new Date();
        const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)); 
        // Último milissegundo do mês atual UTC
        const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

        console.log(`[DSvc] Intervalo Mês Atual (UTC): ${startOfMonth.toISOString()} a ${endOfMonth.toISOString()}`);
        const totalNewLeadsThisMonthPromise = Lead.countDocuments({
            company: companyObjectId,
            createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        });

        // --- Executa todas as queries em paralelo ---
        const [
            totalActiveLeads,
            leadsByStatus,
            leadsByOrigin,
            leadsByResponsible,
            leadsByDate,
            totalDiscardedLeads,
            totalNewLeadsThisMonth
        ] = await Promise.all([
            totalActiveLeadsPromise,
            leadsByStatusPromise,
            leadsByOriginPromise,       
            leadsByResponsiblePromise,   
            leadsByDatePromise,
            totalDiscardedLeadsPromise,
            totalNewLeadsThisMonthPromise      
        ]);

        console.log("[DashboardService] Resumo Gerado");

        // Retorna o objeto completo
        return {
            totalActiveLeads: totalActiveLeads,
            leadsByStatus: leadsByStatus,
            leadsByOrigin: leadsByOrigin,          
            leadsByResponsible: leadsByResponsible, 
            leadsByDate: leadsByDate,
            totalDiscardedLeads: totalDiscardedLeads,
            totalNewLeadsThisMonth: totalNewLeadsThisMonth
        };

    } catch (error) {
        console.error(`[DashboardService] Erro ao gerar resumo para empresa ${companyId}:`, error);
        throw new Error("Erro ao gerar resumo do dashboard.");
    }
};


/**
 * Gera um resumo financeiro com dados de Propostas/Contratos.
 * @param {string} companyId - ID da empresa.
 * @returns {Promise<object>} Objeto com os dados financeiros agregados.
 */
const getFinancialSummary = async (companyId) => {
    console.log(`[DashboardService] Buscando resumo FINANCEIRO para Empresa: ${companyId}`);
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error("ID da empresa inválido.");
    }

    try {
        const hoje = new Date();
        const inicioDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const inicioSeisMesesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1); // Para o gráfico de vendas mensais

        // Usamos $facet para rodar múltiplas pipelines de agregação independentes em uma única chamada
        const result = await PropostaContrato.aggregate([
            {
                $match: {
                    company: new mongoose.Types.ObjectId(companyId)
                }
            },
            {
                $facet: {
                    // KPI: Vendas e Ticket Médio do Mês Atual
                    "vendasMesAtual": [
                        { $match: { statusPropostaContrato: "Vendido", dataVendaEfetivada: { $gte: inicioDoMes } } },
                        { $group: {
                            _id: null,
                            valorTotalVendido: { $sum: "$valorPropostaContrato" },
                            numeroDeVendas: { $sum: 1 }
                        }}
                    ],
                    // KPI: Valor Total em Propostas Ativas
                    "propostasAtivas": [
                        { $match: { statusPropostaContrato: { $in: ["Em Elaboração", "Aguardando Aprovações", "Aguardando Assinatura Cliente", "Assinado"] } } },
                        { $group: {
                            _id: null,
                            valorTotalEmPropostas: { $sum: "$valorPropostaContrato" },
                            numeroDePropostas: { $sum: 1 }
                        }}
                    ],
                    // Gráfico: Vendas por Mês (últimos 6 meses)
                    "vendasPorMes": [
                        { $match: { statusPropostaContrato: "Vendido", dataVendaEfetivada: { $gte: inicioSeisMesesAtras } } },
                        { $group: {
                            _id: { year: { $year: "$dataVendaEfetivada" }, month: { $month: "$dataVendaEfetivada" } },
                            totalVendido: { $sum: "$valorPropostaContrato" },
                            count: { $sum: 1 }
                        }},
                        { $sort: { "_id.year": 1, "_id.month": 1 } }
                    ],
                    // Gráfico: Funil de Vendas por Valor ($)
                    "funilPorValor": [
                        { $match: { statusPropostaContrato: { $nin: ["Recusado", "Cancelado", "Distrato Realizado"] } } },
                        { $group: {
                            _id: "$statusPropostaContrato",
                            valorTotal: { $sum: "$valorPropostaContrato" },
                            count: { $sum: 1 }
                        }}
                    ]
                }
            }
        ]);

        console.log("[DashboardService] Resumo Financeiro Gerado.");
        // Extrai e formata os resultados do facet
        const vendasMes = result[0].vendasMesAtual[0] || { valorTotalVendido: 0, numeroDeVendas: 0 };
        const propostasAtivas = result[0].propostasAtivas[0] || { valorTotalEmPropostas: 0, numeroDePropostas: 0 };
        
        const summary = {
            valorTotalVendidoMes: vendasMes.valorTotalVendido,
            numeroDeVendasMes: vendasMes.numeroDeVendas,
            ticketMedioMes: vendasMes.numeroDeVendas > 0 ? vendasMes.valorTotalVendido / vendasMes.numeroDeVendas : 0,
            valorTotalEmPropostasAtivas: propostasAtivas.valorTotalEmPropostas,
            numeroDePropostasAtivas: propostasAtivas.numeroDePropostas,
            vendasPorMes: result[0].vendasPorMes,
            funilPorValor: result[0].funilPorValor
        };

        return summary;

    } catch (error) {
        console.error(`[DashboardService] Erro ao gerar resumo financeiro para empresa ${companyId}:`, error);
        throw new Error('Erro ao gerar resumo financeiro.');
    }
};

module.exports = {
    getDashboardSummary,
    getFinancialSummary
};