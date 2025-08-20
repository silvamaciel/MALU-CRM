const PropostaContrato = require('../models/PropostaContrato');
const Parcela = require('../models/Parcela');
const Transacao = require('../models/Transacao');
const Lead = require('../models/Lead');
const mongoose = require('mongoose');
const Credor = require('../models/Credor');
const Despesa = require('../models/Despesa');

/**
 * Gera o plano de pagamentos completo para um contrato, lendo
 * a estrutura detalhada do PropostaContrato.
 */
const gerarPlanoDePagamentos = async (contratoId) => {
    const contrato = await PropostaContrato.findById(contratoId).populate('lead');
    if (!contrato) throw new Error("Contrato não encontrado.");
    if (!contrato.planoDePagamento || contrato.planoDePagamento.length === 0) {
        throw new Error("O contrato não possui um plano de pagamento definido para gerar as parcelas.");
    }

    // Apaga parcelas antigas para evitar duplicados ao regerar
    await Parcela.deleteMany({ contrato: contratoId });

    const parcelasParaCriar = [];

    // Itera sobre cada LINHA do plano de pagamento do contrato
    contrato.planoDePagamento.forEach(itemPlano => {
        let dataVencimentoAtual = new Date(itemPlano.vencimentoPrimeira);

        // Cria todas as parcelas para aquela linha (ex: 36 parcelas mensais)
        for (let i = 0; i < itemPlano.quantidade; i++) {
            const novaParcela = {
                contrato: contratoId,
                sacado: contrato.lead._id,
                company: contrato.company,
                numeroParcela: i + 1,
                tipo: itemPlano.tipoParcela,
                valorPrevisto: itemPlano.valorUnitario,
                dataVencimento: new Date(dataVencimentoAtual),
                status: 'Pendente'
            };
            parcelasParaCriar.push(novaParcela);

            // Calcula o próximo vencimento com base no tipo de parcela
            switch (itemPlano.tipoParcela) {
                case 'PARCELA MENSAL':
                    dataVencimentoAtual.setMonth(dataVencimentoAtual.getMonth() + 1);
                    break;
                case 'PARCELA BIMESTRAL':
                    dataVencimentoAtual.setMonth(dataVencimentoAtual.getMonth() + 2);
                    break;
                case 'PARCELA TRIMESTRAL':
                    dataVencimentoAtual.setMonth(dataVencimentoAtual.getMonth() + 3);
                    break;
                case 'PARCELA SEMESTRAL':
                    dataVencimentoAtual.setMonth(dataVencimentoAtual.getMonth() + 6);
                    break;
                case 'INTERCALADA': // Geralmente anual
                    dataVencimentoAtual.setFullYear(dataVencimentoAtual.getFullYear() + 1);
                    break;
                // Outros tipos como ATO, FINANCIAMENTO têm quantidade 1, então o loop não se repete.
                default:
                    break;
            }
        }
    });

    if (parcelasParaCriar.length > 0) {
        await Parcela.insertMany(parcelasParaCriar);
    }

    console.log(`${parcelasParaCriar.length} parcelas geradas para o contrato ${contratoId}`);
    return { message: "Plano de pagamentos gerado com sucesso." };
};

/**
 * Regista uma baixa (pagamento) para uma parcela.
 */
const registrarBaixa = async (parcelaId, dadosBaixa, userId) => {
    const { valor, dataTransacao, metodoPagamento } = dadosBaixa;
    if (!valor || !dataTransacao || !metodoPagamento) {
        throw new Error("Valor, data da transação e método de pagamento são obrigatórios.");
    }

    // Busca a parcela e já popula o 'sacado' para termos acesso ao ID dele
    const parcela = await Parcela.findById(parcelaId).populate('sacado');
    if (!parcela) throw new Error("Parcela não encontrada.");
    if (!parcela.sacado) throw new Error("Erro de integridade: Parcela não está associada a um sacado.");

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        // 1. Cria a transação, agora incluindo o 'sacado'
        const novaTransacao = new Transacao({
            parcela: parcelaId,
            contrato: parcela.contrato,
            company: parcela.company,
            sacado: parcela.sacado._id, // <<< CORRIGE O ERRO VALIDATIONERROR
            valor,
            metodoPagamento,
            dataTransacao,
            registradoPor: userId
        });
        await novaTransacao.save({ session });

        // 2. Acumula o valor pago na parcela
        parcela.valorPago = (parcela.valorPago || 0) + valor;

        // 3. Verifica se a parcela foi totalmente paga
        if (parcela.valorPago >= parcela.valorPrevisto) {
            parcela.status = new Date(dataTransacao) > parcela.dataVencimento ? 'Pago com Atraso' : 'Pago';
            parcela.dataPagamento = dataTransacao; // Define a data de quitação
        } else {
            // Se for um pagamento parcial, o status continua como 'Pendente' ou 'Atrasado'
            // Não alteramos o status aqui.
        }

        await parcela.save({ session });

        await session.commitTransaction();
        console.log(`[FinanceiroSvc] Baixa de R$ ${valor} registada para a Parcela ID: ${parcelaId}`);
        return parcela;
    } catch (error) {
        await session.abortTransaction();
        console.error(`[FinanceiroSvc] Erro ao registar baixa para a Parcela ID: ${parcelaId}`, error);
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
                    $sum: { $cond: [{ $and: [{ $eq: ['$status', 'Pago'] }, { $gte: ['$dataPagamento', inicioDoMes] }] }, '$valorPago', 0] }
                },
                totalVencido: {
                    $sum: { $cond: [{ $eq: ['$status', 'Atrasado'] }, '$valorPrevisto', 0] }
                }
            }
        }
    ]);

    return kpis || { totalAReceber: 0, recebidoNoMes: 0, totalVencido: 0 };
};


/**
 * Cria uma nova parcela avulsa (não vinculada a um contrato).
 * Útil para cobranças de serviços, taxas, etc.
 */
const gerarParcelaAvulsa = async (dadosParcela, companyId) => {
    const { sacado, tipo, valorPrevisto, dataVencimento, observacoes } = dadosParcela;

    // Validação dos dados essenciais
    if (!sacado || !valorPrevisto || !dataVencimento) {
        throw new Error("Cliente (Sacado), Valor e Data de Vencimento são obrigatórios.");
    }

    // Verifica se o lead (sacado) pertence à empresa
    const leadDoc = await Lead.findOne({ _id: sacado, company: companyId });
    if (!leadDoc) {
        throw new Error("Cliente não encontrado ou não pertence a esta empresa.");
    }

    const novaParcela = new Parcela({
        sacado,
        company: companyId,
        tipo: tipo || 'Outra', // Define um tipo padrão se não for especificado
        valorPrevisto,
        dataVencimento,
        observacoes,
        status: 'Pendente',
        contrato: null // Garante que não há vínculo com contrato
    });

    await novaParcela.save();
    console.log(`[FinanceiroSvc] Parcela avulsa criada com sucesso para o lead ${leadDoc.nome}`);
    return novaParcela;
};


// --- Funções para Credores ---

const criarCredor = async (dadosCredor, companyId) => {
    // Adicione validações aqui (ex: verificar se CPF/CNPJ já existe)
    const novoCredor = new Credor({ ...dadosCredor, company: companyId });
    await novoCredor.save();
    return novoCredor;
};

const listarCredores = async (companyId) => {
    return Credor.find({ company: companyId }).sort({ nome: 1 });
};

// --- Funções para Despesas (Contas a Pagar) ---

const criarDespesa = async (dadosDespesa, companyId, userId) => {
    const { descricao, credor, valor, dataVencimento } = dadosDespesa;
    if (!descricao || !credor || !valor || !dataVencimento) {
        throw new Error("Descrição, credor, valor e data de vencimento são obrigatórios.");
    }

    const novaDespesa = new Despesa({
        ...dadosDespesa,
        company: companyId,
        registradoPor: userId
    });
    await novaDespesa.save();
    return novaDespesa;
};

const listarDespesas = async (companyId, queryParams) => {
    const { status, page = 1, limit = 10, sort = 'dataVencimento' } = queryParams;
    const skip = (page - 1) * limit;

    const queryConditions = { company: companyId };
    if (status) {
        queryConditions.status = status;
    }

    const [despesas, total] = await Promise.all([
        Despesa.find(queryConditions)
            .populate('credor', 'nome')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        Despesa.countDocuments(queryConditions)
    ]);

    const totalPages = Math.ceil(total / limit);
    return { despesas, total, totalPages, currentPage: parseInt(page) };
};

const registrarPagamentoDespesa = async (despesaId, dadosPagamento, userId) => {
    const { valorPago, dataPagamento } = dadosPagamento;
    const despesa = await Despesa.findById(despesaId);
    if (!despesa) throw new Error("Despesa não encontrada.");

    // Lógica para criar uma "TransacaoDeSaida" pode ser adicionada aqui no futuro
    despesa.status = 'Paga';
    despesa.dataPagamento = dataPagamento;
    // Lógica para pagamentos parciais pode ser adicionada aqui

    await despesa.save();
    return despesa;
};


module.exports = {
    gerarPlanoDePagamentos,
    registrarBaixa,
    getDashboardData,
    listarParcelas,
    gerarParcelaAvulsa,
    criarCredor,
    listarCredores,
    criarDespesa,
    listarDespesas,
    registrarPagamentoDespesa
};