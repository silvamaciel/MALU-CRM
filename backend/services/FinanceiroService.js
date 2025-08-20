const PropostaContrato = require('../models/PropostaContrato');
const Parcela = require('../models/Parcela');
const Transacao = require('../models/Transacao');
const mongoose = require('mongoose');

/**
 * Gera o plano de pagamentos completo para um contrato.
 */
const gerarPlanoDePagamentos = async (contratoId) => {
    // Busca o contrato e já popula o campo 'lead' para termos acesso ao ID
    const contrato = await PropostaContrato.findById(contratoId).populate('lead');
    if (!contrato) throw new Error("Contrato não encontrado.");
    if (!contrato.lead) throw new Error("O contrato não está associado a nenhum lead.");

    await Parcela.deleteMany({ contrato: contratoId });

    const parcelas = [];
    const valorParcela = (contrato.valorTotal - contrato.valorSinal) / contrato.numeroParcelas;
    let dataVencimento = new Date(contrato.dataInicio);

    for (let i = 1; i <= contrato.numeroParcelas; i++) {
        dataVencimento.setMonth(dataVencimento.getMonth() + 1);
        parcelas.push({
            contrato: contratoId,
            // VVVVV LÓGICA ATUALIZADA AQUI VVVVV
            sacado: contrato.lead._id, // Pega o ID do lead a partir do contrato
            // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
            company: contrato.company,
            numeroParcela: i,
            tipo: 'Parcela Mensal',
            valorPrevisto: valorParcela,
            dataVencimento: new Date(dataVencimento),
            status: 'Pendente'
        });
    }

    if (parcelas.length > 0) {
        await Parcela.insertMany(parcelas);
    }
    
    console.log(`${parcelas.length} parcelas geradas para o contrato ${contratoId}`);
    return { message: "Plano de pagamentos gerado com sucesso." };
};

/**
 * Regista uma baixa (pagamento) para uma parcela.
 */
const registrarBaixa = async (parcelaId, dadosBaixa, userId) => {
    const { valor, dataTransacao, metodoPagamento } = dadosBaixa;
    const parcela = await Parcela.findById(parcelaId);
    if (!parcela) throw new Error("Parcela não encontrada.");

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        // 1. Cria a transação
        const novaTransacao = new Transacao({
            parcela: parcelaId,
            contrato: parcela.contrato,
            company: parcela.company,
            valor,
            metodoPagamento,
            dataTransacao,
            registradoPor: userId
        });
        await novaTransacao.save({ session });

        // 2. Atualiza a parcela
        parcela.valorPago += valor;
        parcela.dataPagamento = dataTransacao;
        if (parcela.valorPago >= parcela.valorPrevisto) {
            parcela.status = new Date(dataTransacao) > parcela.dataVencimento ? 'Pago com Atraso' : 'Pago';
        }
        await parcela.save({ session });

        await session.commitTransaction();
        return parcela;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};



/**
 * Lista parcelas com filtros, ordenação e paginação.
 */
const listarParcelas = async (companyId, queryParams) => {
    const { status, page = 1, limit = 10, sort = 'dataVencimento' } = queryParams;
    const skip = (page - 1) * limit;
    
    const queryConditions = { company: companyId };
    if (status) {
        queryConditions.status = status;
    }
    
    const [parcelas, total] = await Promise.all([
        Parcela.find(queryConditions)
            .populate({
                path: 'sacado',
                select: 'nome'
            })
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        Parcela.countDocuments(queryConditions)
    ]);
    
    const totalPages = Math.ceil(total / limit);
    return { parcelas, total, totalPages, currentPage: parseInt(page) };
};

/**
 * Calcula os KPIs para o dashboard financeiro.
 */
const getDashboardData = async (companyId) => {
    const hoje = new Date();
    const inicioDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    const [kpis] = await Parcela.aggregate([
        { $match: { company: new mongoose.Types.ObjectId(companyId) } },
        {
            $group: {
                _id: null,
                totalAReceber: {
                    $sum: { $cond: [{ $in: ['$status', ['Pendente', 'Atrasado']] }, '$valorPrevisto', 0] }
                },
                recebidoNoMes: {
                    $sum: { $cond: [{ $and: [ { $eq: ['$status', 'Pago'] }, { $gte: ['$dataPagamento', inicioDoMes] } ] }, '$valorPago', 0] }
                },
                totalVencido: {
                    $sum: { $cond: [{ $eq: ['$status', 'Atrasado'] }, '$valorPrevisto', 0] }
                }
            }
        }
    ]);
    
    return kpis || { totalAReceber: 0, recebidoNoMes: 0, totalVencido: 0 };
};


module.exports = { gerarPlanoDePagamentos, registrarBaixa, getDashboardData, listarParcelas };