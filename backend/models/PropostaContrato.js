// backend/models/PropostaContrato.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const parcelaSchema = new Schema({
    tipoParcela: { // Do seu enum
        type: String,
        required: true,
        enum: ["ATO", "PARCELA MENSAL", "PARCELA BIMESTRAL", "PARCELA TRIMESTRAL", "PARCELA SEMESTRAL", "INTERCALADA", "ENTREGA DE CHAVES", "FINANCIAMENTO", "OUTRA"],
    },
    quantidade: { type: Number, default: 1 },
    valorUnitario: { type: Number, required: true },
    vencimentoPrimeira: { type: Date, required: true },
    observacao: { type: String, trim: true }
}, { _id: false });

const dadosBancariosSchema = new Schema({
    bancoNome: { type: String },
    agencia: { type: String },
    operacao: { type: String },
    contaCorrente: { type: String },
    cnpjPagamento: { type: String },
    pix: { type: String }
}, { _id: false });

const corretagemSchema = new Schema({
    valorCorretagem: { type: Number, required: true },
    corretorPrincipal: {
        type: Schema.Types.ObjectId,
        ref: 'BrokerContact',
        required: false
    },
    // Se múltiplos corretores podem estar envolvidos na mesma comissão:
    corretoresEnvolvidos: [{
        brokerContactId: { type: Schema.Types.ObjectId, ref: 'BrokerContact' },
        percentualComissao: Number 
     }],
    condicoesPagamentoCorretagem: { type: String, trim: true },
    observacoesCorretagem: { type: String, trim: true }
}, { _id: false });


const propostaContratoSchema = new Schema({
    // --- Vínculos ---
    lead: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    reserva: { type: Schema.Types.ObjectId, ref: 'Reserva', required: true, unique: true, index: true },
    unidade: { type: Schema.Types.ObjectId, ref: 'Unidade', required: true, index: true },
    empreendimento: { type: Schema.Types.ObjectId, ref: 'Empreendimento', required: true, index: true },
    company: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    modeloContratoUsado: { type: Schema.Types.ObjectId, ref: 'ModeloContrato', required: false }, // O template que foi usado como base

    // --- Dados Financeiros e Condições ---
    precoTabelaUnidadeNoMomento: { type: Number, required: true },
    valorPropostaContrato: { type: Number, required: true },
    valorDescontoConcedido: { type: Number, default: 0 },
    valorEntrada: { type: Number, required: false },
    condicoesPagamentoGerais: { type: String, trim: true }, // Resumo ou observações
    dadosBancariosParaPagamento: dadosBancariosSchema,
    planoDePagamento: [parcelaSchema],

    // --- Corretagem ---
    corretagem: corretagemSchema,

    // --- Conteúdo do Contrato ---
    corpoContratoHTMLGerado: { type: String, required: true }, // HTML final, após substituição de variáveis e edição do usuário

    // --- Metadados ---
    dataProposta: { type: Date, default: Date.now },
    dataAssinaturaCliente: { type: Date },
    dataVendaEfetivada: { type: Date },
    statusPropostaContrato: {
        type: String,
        required: true,
        enum: ["Em Elaboração", "Aguardando Aprovações", "Aguardando Assinatura Cliente", "Assinado", "Vendido", "Recusado", "Cancelado"],
        default: "Em Elaboração",
        index: true
    },
    responsavelNegociacao: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    observacoesInternasProposta: { type: String, trim: true }
}, { timestamps: true });

// Hook para calcular o desconto
propostaContratoSchema.pre('save', function(next) {
    if (this.isModified('precoTabelaUnidadeNoMomento') || this.isModified('valorPropostaContrato')) {
        this.valorDescontoConcedido = (this.precoTabelaUnidadeNoMomento || 0) - (this.valorPropostaContrato || 0);
    }
    next();
});

const PropostaContrato = mongoose.model('PropostaContrato', propostaContratoSchema);
module.exports = PropostaContrato;