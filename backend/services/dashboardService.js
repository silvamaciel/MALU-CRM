// services/dashboardService.js
const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const LeadStage = require('../models/LeadStage');
const User = require('../models/User');
const Origem = require('../models/origem'); 



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
        const totalLeads = await Lead.countDocuments(matchConditions);

        const stages = await LeadStage.find({ company: companyId, ativo: true }).lean();
        const leadsByStagePromises = stages.map(stage => 
            Lead.countDocuments({ ...matchConditions, situacao: stage._id })
        );
        const leadsByStageCounts = await Promise.all(leadsByStagePromises);

        const leadsByStage = stages.map((stage, index) => ({
            _id: stage._id,
            nome: stage.nome,
            count: leadsByStageCounts[index]
        }));

        return { totalLeads, leadsByStage };
    } catch (error) {
        console.error(`[DashboardService] Erro ao gerar resumo de leads para empresa ${companyId}:`, error);
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