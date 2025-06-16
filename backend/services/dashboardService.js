// services/dashboardService.js
const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const LeadStage = require('../models/LeadStage');
const User = require('../models/User');
const Origem = require('../models/origem'); 

const PropostaContrato = require('../models/PropostaContrato');


/**
 * Gera um resumo de leads com base em um filtro de período.
 * @param {string} companyId - ID da empresa.
 * @param {string} filter - 'month', 'year', ou 'all'.
 */
const getLeadSummary = async (companyId, filter = 'month') => {
    console.log(`[DashboardService] Buscando resumo de LEADS para Empresa: ${companyId} com filtro: ${filter}`);
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error("ID da empresa inválido.");
    }

    const dateQuery = {};
    const hoje = new Date();
    
    if (filter === 'month') {
        const inicioDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        dateQuery.$gte = inicioDoMes;
    } else if (filter === 'year') {
        const inicioDoAno = new Date(hoje.getFullYear(), 0, 1);
        dateQuery.$gte = inicioDoAno;
    }

    const matchConditions = { company: new mongoose.Types.ObjectId(companyId) };
    if (Object.keys(dateQuery).length > 0) {
        matchConditions.createdAt = dateQuery;
    }
    
    try {
        const summary = await Lead.aggregate([
            { $match: matchConditions },
            {
                $facet: {
                    // Contagem total de leads no período
                    "totalLeads": [
                        { $count: "count" }
                    ],
                    // Contagem de leads por situação (stage)
                    "leadsByStage": [
                        { $group: { _id: "$situacao", count: { $sum: 1 } } },
                        { $lookup: { from: 'leadstages', localField: '_id', foreignField: '_id', as: 'stageDetails' } },
                        { $unwind: "$stageDetails" },
                        { $project: { _id: 1, nome: "$stageDetails.nome", count: 1, ordem: "$stageDetails.ordem" } },
                        { $sort: { ordem: 1, nome: 1 } }
                    ],
                    // Contagem de leads por origem
                    "leadsByOrigem": [
                        { $group: { _id: "$origem", count: { $sum: 1 } } },
                        { $lookup: { from: 'origens', localField: '_id', foreignField: '_id', as: 'origemDetails' } },
                        { $unwind: "$origemDetails" },
                        { $project: { _id: 1, nome: "$origemDetails.nome", count: 1 } },
                        { $sort: { count: -1 } }
                    ],
                    // Contagem de leads por responsável
                    "leadsByResponsavel": [
                        { $group: { _id: "$responsavel", count: { $sum: 1 } } },
                        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userDetails' } },
                        { $unwind: "$userDetails" },
                        { $project: { _id: 1, nome: "$userDetails.nome", count: 1 } },
                        { $sort: { count: -1 } }
                    ],
                    // Lista de leads recentes
                    "leadsRecentes": [
                        { $sort: { createdAt: -1 } },
                        { $limit: 5 },
                        { $lookup: { from: 'users', localField: 'responsavel', foreignField: '_id', as: 'responsavelDetails' } },
                        { $unwind: { path: "$responsavelDetails", preserveNullAndEmptyArrays: true } },
                        { $project: { nome: 1, responsavelNome: "$responsavelDetails.nome", createdAt: 1 } }
                    ]
                }
            }
        ]);

        // Formata o resultado final
        const formattedSummary = {
            totalLeads: summary[0].totalLeads[0]?.count || 0,
            leadsByStage: summary[0].leadsByStage,
            leadsByOrigem: summary[0].leadsByOrigem,
            leadsByResponsavel: summary[0].leadsByResponsavel,
            leadsRecentes: summary[0].leadsRecentes
        };

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

module.exports = {
    getLeadSummary,
    getFinancialSummary
};