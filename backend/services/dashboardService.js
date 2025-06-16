// services/dashboardService.js
const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const LeadStage = require('../models/LeadStage');
const User = require('../models/User');
const Origem = require('../models/origem'); 

const PropostaContrato = require('../models/PropostaContrato');


/**
 * Gera um resumo completo de leads com base em um filtro de período.
 * @param {string} companyId - ID da empresa.
 * @param {string} filter - 'month', 'year', ou 'all'.
 * @returns {Promise<object>} Objeto com o resumo de leads.
 */
const getLeadSummary = async (companyId, filter = 'month') => {
    console.log(`[DashboardService] Buscando resumo de LEADS para Empresa: ${companyId} com filtro: ${filter}`);
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error("ID da empresa inválido.");
    }

    try {
        // --- Definição dos Intervalos de Data ---
        const hoje = new Date();
        let startDate;
        if (filter === 'month') {
            startDate = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        } else if (filter === 'year') {
            startDate = new Date(hoje.getFullYear(), 0, 1);
        }
        // Se o filtro for 'all', startDate permanece undefined.

        const seteDiasAtras = new Date();
        seteDiasAtras.setDate(hoje.getDate() - 7);

        // --- Encontrar o ID do Estágio "Descartado" ---
        const descartadoStage = await LeadStage.findOne({
            company: companyId,
            nome: { $regex: /^descartado$/i }
        }).select('_id').lean();
        const descartadoStageId = descartadoStage?._id;

        // --- Montar a Query de Agregação ---
        const initialMatch = { company: new mongoose.Types.ObjectId(companyId) };
        if (startDate) {
            initialMatch.createdAt = { $gte: startDate };
        }

        const summary = await Lead.aggregate([
            { $match: initialMatch },
            {
                $facet: {
                    // KPI: Total de Leads no Período
                    "totalLeads": [
                        { $count: "count" }
                    ],
                    // KPI: Descartados no Período
                    "descartadosNoPeriodo": [
                        // A condição do estágio 'Descartado' precisa ser aplicada aqui, se o estágio foi encontrado
                        ...(descartadoStageId ? [{ $match: { situacao: descartadoStageId } }] : []),
                        { $count: "count" }
                    ],
                    // KPI: Leads nos Últimos 7 Dias (sempre, independente do filtro principal)
                    "leadsUltimos7Dias": [
                        // Este $match ignora o filtro de período principal e usa seu próprio
                        { $match: { company: new mongoose.Types.ObjectId(companyId), createdAt: { $gte: seteDiasAtras } } },
                        { $count: "count" }
                    ],
                    // Gráficos (baseados no filtro de período principal)
                    "leadsByStage": [
                        { $group: { _id: "$situacao", count: { $sum: 1 } } },
                        { $lookup: { from: 'leadstages', localField: '_id', foreignField: '_id', as: 'stageDetails' } },
                        { $unwind: { path: "$stageDetails", preserveNullAndEmptyArrays: true } },
                        { $project: { _id: 1, nome: "$stageDetails.nome", count: 1, ordem: "$stageDetails.ordem" } },
                        { $sort: { ordem: 1, nome: 1 } }
                    ],
                    "leadsByOrigem": [
                        { $group: { _id: "$origem", count: { $sum: 1 } } },
                        { $lookup: { from: 'origens', localField: '_id', foreignField: '_id', as: 'origemDetails' } },
                        { $unwind: { path: "$origemDetails", preserveNullAndEmptyArrays: true } },
                        { $project: { _id: 1, nome: "$origemDetails.nome", count: 1 } },
                        { $sort: { count: -1 } }
                    ],
                    "leadsByResponsavel": [
                        { $group: { _id: "$responsavel", count: { $sum: 1 } } },
                        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userDetails' } },
                        { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
                        { $project: { _id: 1, nome: "$userDetails.nome", count: 1 } },
                        { $sort: { count: -1 } }
                    ]
                }
            }
        ]);

        // Formata o resultado final
        const formattedSummary = {
            totalLeadsPeriodo: summary[0].totalLeads[0]?.count || 0,
            descartadosPeriodo: summary[0].descartadosNoPeriodo[0]?.count || 0,
            leadsUltimos7Dias: summary[0].leadsUltimos7Dias[0]?.count || 0,
            leadsByStage: summary[0].leadsByStage,
            leadsByOrigem: summary[0].leadsByOrigem,
            leadsByResponsavel: summary[0].leadsByResponsavel,
        };
        
        console.log("[DashboardService] Resumo de Leads Gerado:", formattedSummary);
        return formattedSummary;

    } catch (error) {
        console.error(`[DashboardService] ERRO DETALHADO ao gerar resumo de leads para empresa ${companyId}:`, error);
        throw new Error('Erro ao gerar resumo de leads.');
    }
};

/**
 * Gera um resumo financeiro com base em um filtro de período.
 * @param {string} companyId - ID da empresa.
 * @param {string} filter - 'month', 'year', ou 'all'.
 */
const getFinancialSummary = async (companyId, filter = 'month') => {
    console.log(`[DashboardService] Buscando resumo FINANCEIRO para Empresa: ${companyId} com filtro: ${filter}`);
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error("ID da empresa inválido.");
    }

    const salesDateFilter = {};
    const hoje = new Date();
    if (filter === 'month') {
        salesDateFilter.dataVendaEfetivada = { $gte: new Date(hoje.getFullYear(), hoje.getMonth(), 1) };
    } else if (filter === 'year') {
        salesDateFilter.dataVendaEfetivada = { $gte: new Date(hoje.getFullYear(), 0, 1) };
    }
    
    try {
        const result = await PropostaContrato.aggregate([
            { $match: { company: new mongoose.Types.ObjectId(companyId) } },
            {
                $facet: {
                    "vendasNoPeriodo": [
                        { $match: { statusPropostaContrato: "Vendido", ...salesDateFilter } },
                        { $group: {
                            _id: null,
                            valorTotalVendido: { $sum: "$valorPropostaContrato" },
                            numeroDeVendas: { $sum: 1 }
                        }}
                    ],
                    "propostasAtivas": [
                        { $match: { statusPropostaContrato: { $in: ["Em Elaboração", "Aguardando Aprovações", "Aguardando Assinatura Cliente", "Assinado"] } } },
                        { $group: {
                            _id: null,
                            valorTotalEmPropostas: { $sum: "$valorPropostaContrato" },
                            numeroDePropostas: { $sum: 1 }
                        }}
                    ],
                    "vendasPorMes": [
                        { $match: { statusPropostaContrato: "Vendido", dataVendaEfetivada: { $gte: new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1) } } },
                        { $group: {
                            _id: { year: { $year: "$dataVendaEfetivada" }, month: { $month: "$dataVendaEfetivada" } },
                            totalVendido: { $sum: "$valorPropostaContrato" },
                            count: { $sum: 1 }
                        }},
                        { $sort: { "_id.year": 1, "_id.month": 1 } }
                    ],
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
        const vendas = result[0].vendasNoPeriodo[0] || { valorTotalVendido: 0, numeroDeVendas: 0 };
        const propostasAtivas = result[0].propostasAtivas[0] || { valorTotalEmPropostas: 0, numeroDePropostas: 0 };
        
        const summary = {
            valorTotalVendidoPeriodo: vendas.valorTotalVendido,
            numeroDeVendasPeriodo: vendas.numeroDeVendas,
            ticketMedioPeriodo: vendas.numeroDeVendas > 0 ? vendas.valorTotalVendido / vendas.numeroDeVendas : 0,
            valorTotalEmPropostasAtivas: propostasAtivas.valorTotalEmPropostas,
            numeroDePropostasAtivas: propostasAtivas.numeroDePropostas,
            vendasPorMes: result[0].vendasPorMes,
            funilPorValor: result[0].funilPorValor
        };
        return summary;

    } catch (error) {
        console.error(`[DashboardService] ERRO DETALHADO ao gerar resumo financeiro para empresa ${companyId}:`, error);
        throw new Error('Erro ao gerar resumo financeiro.');
    }
};



/**
 * Gera métricas avançadas de conversão, tempo e funil.
 * @param {string} companyId - ID da empresa.
 * @param {string} filter - 'month', 'year', ou 'all'.
 */
const getAdvancedMetrics = async (companyId, filter = 'month') => {
    console.log(`[DashboardService] Buscando métricas AVANÇADAS para Empresa: ${companyId} com filtro: ${filter}`);
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error("ID da empresa inválido.");
    }

    // --- Definição dos Intervalos de Data ---
    const hoje = new Date();
    let dateRangeMatch = {}; // Filtro de data para leads criados no período
    if (filter === 'month') {
        dateRangeMatch = { createdAt: { $gte: new Date(hoje.getFullYear(), hoje.getMonth(), 1) } };
    } else if (filter === 'year') {
        dateRangeMatch = { createdAt: { $gte: new Date(hoje.getFullYear(), 0, 1) } };
    }
    
    // --- IDs dos Estágios Chave ---
    const stages = await LeadStage.find({ company: companyId }).select('nome _id').lean();
    const vendidoStageId = stages.find(s => s.nome.toLowerCase() === 'vendido')?._id;
    const novoStageId = stages.find(s => s.nome.toLowerCase() === 'novo')?._id;
    const emAtendimentoStageId = stages.find(s => s.nome.toLowerCase().includes('em atendimento'))?._id;
    const propostaStageId = stages.find(s => s.nome.toLowerCase().includes('proposta'))?._id;


    try {
        const results = await Lead.aggregate([
            {
                $match: { company: new mongoose.Types.ObjectId(companyId), ...dateRangeMatch }
            },
            {
                $facet: {
                    // Métrica 1: Taxa de Conversão e Métrica 2: Tempo Médio de Conversão
                    "conversionMetrics": [
                        { $match: { situacao: vendidoStageId, dataVendaEfetivada: { $exists: true, $ne: null } } },
                        {
                            $project: {
                                conversionTime: {
                                    $dateDiff: {
                                        startDate: "$createdAt",
                                        endDate: "$dataVendaEfetivada",
                                        unit: "day"
                                    }
                                }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                avgConversionTime: { $avg: "$conversionTime" },
                                soldLeadsCount: { $sum: 1 }
                            }
                        }
                    ],
                    // Métrica 3: Leads por Dia da Semana / Hora do Dia
                    "leadsByDayHour": [
                        {
                            $project: {
                                dayOfWeek: { $dayOfWeek: { date: "$createdAt", timezone: "America/Sao_Paulo" } }, // 1=Dom, 2=Seg, ...
                                hour: { $hour: { date: "$createdAt", timezone: "America/Sao_Paulo" } }
                            }
                        },
                        {
                            $group: {
                                _id: { day: "$dayOfWeek", hour: "$hour" },
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { "_id.day": 1, "_id.hour": 1 } }
                    ],
                     // Métrica 4: Funil de Conversão de Estágios (Snapshot de quantos estão em cada estágio)
                    "stageFunnel": [
                        { $group: { _id: "$situacao", count: { $sum: 1 } } }
                    ],
                    // Total de leads para o cálculo da taxa de conversão
                    "totalLeadsCount": [
                        { $count: "count" }
                    ]
                }
            }
        ]);

        const conversionData = results[0].conversionMetrics[0] || { avgConversionTime: 0, soldLeadsCount: 0 };
        const totalLeads = results[0].totalLeadsCount[0]?.count || 0;

        // Montando o funil com os estágios específicos
        const stageCounts = results[0].stageFunnel.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        const funnelData = [
            { name: 'Novo', value: stageCounts[novoStageId] || 0 },
            { name: 'Em Atendimento', value: stageCounts[emAtendimentoStageId] || 0 },
            { name: 'Proposta', value: stageCounts[propostaStageId] || 0 },
            { name: 'Vendido', value: stageCounts[vendidoStageId] || 0 },
        ];


        const finalSummary = {
            conversionRate: totalLeads > 0 ? (conversionData.soldLeadsCount / totalLeads) * 100 : 0,
            avgConversionTime: conversionData.avgConversionTime || 0,
            leadsByDayHour: results[0].leadsByDayHour.map(item => ({ day: item._id.day, hour: item._id.hour, count: item.count })),
            stageFunnelData: funnelData
        };

        console.log("[DashboardService] Métricas avançadas geradas.");
        return finalSummary;

    } catch (error) {
        console.error(`[DashboardService] ERRO ao gerar métricas avançadas:`, error);
        throw new Error('Erro ao gerar métricas avançadas.');
    }
};

module.exports = {
    getLeadSummary,
    getFinancialSummary,
    getAdvancedMetrics
};