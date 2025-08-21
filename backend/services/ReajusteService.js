const Indexador = require('../models/Indexador');
const PropostaContrato = require('../models/PropostaContrato');
const Parcela = require('../models/Parcela');

/**
 * Calcula o valor atualizado de uma única parcela.
 * @param {ObjectId | object} parcelaOuId - O ID da parcela ou o documento da parcela.
 * @returns {Promise<Number>} O valor da parcela com o reajuste aplicado.
 */
const calcularValorAtualizado = async (parcelaOuId) => {
    // 1. Encontra a parcela e o seu contrato com as regras de reajuste
    const parcela = await Parcela.findById(parcelaOuId).populate({
        path: 'contrato',
        select: 'regrasDeReajuste',
        populate: { path: 'regrasDeReajuste.indexador' }
    });

    if (!parcela || !parcela.contrato) return parcela.valorPrevisto;

    // 2. Encontra a regra de reajuste para este tipo de parcela
    const regra = parcela.contrato.regrasDeReajuste.find(r => r.aplicaA.includes(parcela.tipo));
    if (!regra || !regra.indexador) {
        return parcela.valorPrevisto; // Sem regra, retorna o valor original
    }
    
    // 3. Verifica se a data de vencimento da parcela está dentro do período de reajuste
    const dataVencimentoStr = parcela.dataVencimento.toISOString().substring(0, 7); // "YYYY-MM"
    if (dataVencimentoStr < regra.inicioReajuste) {
        return parcela.valorPrevisto; // Vence antes do início do reajuste
    }

    // 4. Lógica de Cálculo (exemplo para reajuste anual)
    // Busca os valores do indexador (ex: INCC) para o período relevante
    const valoresIndexador = regra.indexador.valores;
    
    // A lógica real de cálculo de juros compostos com base nos valores mensais seria implementada aqui.
    // Exemplo simplificado:
    let valorReajustado = parcela.valorPrevisto;
    // ... loop para acumular os índices do período ...
    
    // Exemplo: valorReajustado = valorPrevisto * (1 + indice1) * (1 + indice2) ...

    return valorReajustado; // Retorna o valor calculado
};

module.exports = { calcularValorAtualizado };