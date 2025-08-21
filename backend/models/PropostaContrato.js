// backend/models/PropostaContrato.js
const mongoose = require('mongoose');
const { Schema } = mongoose;


const regraReajusteSchema = new Schema({
    aplicaA: [{ // A quais tipos de parcela esta regra se aplica
        type: String,
        enum: ["PARCELA MENSAL", "INTERCALADA", "ENTREGA DE CHAVES"]
    }],
    indexadorReajuste: { // Qual indexador usar para a correção
        type: Schema.Types.ObjectId,
        ref: 'Indexador'
    },

    inicioReajuste: { // A partir de qual mês/ano o reajuste começa
        type: String, // Formato "YYYY-MM"
        required: true
    },
    periodicidade: { // De quanto em quanto tempo o reajuste é aplicado
        type: String,
        enum: ['Mensal', 'Anual'],
        default: 'Anual'
    },
    aplicaMultaAtraso: { type: Boolean, default: true },
    multaPercentual: { type: Number, default: 2 }, // 2%
    aplicaJurosAtraso: { type: Boolean, default: true },
    jurosMensalPercentual: { type: Number, default: 1 } // 1% ao mês (pro rata)
}, { _id: false });


// --- Parcelas ---
const parcelaSchema = new Schema({
  tipoParcela: {
    type: String,
    required: true,
    enum: [
      "ATO", "PARCELA MENSAL", "PARCELA BIMESTRAL",
      "PARCELA TRIMESTRAL", "PARCELA SEMESTRAL", "INTERCALADA",
      "ENTREGA DE CHAVES", "FINANCIAMENTO", "OUTRA"
    ]
  },
  quantidade: { type: Number, default: 1 },
  valorUnitario: { type: Number, required: true },
  vencimentoPrimeira: { type: Date, required: true },
  observacao: { type: String, trim: true }
}, { _id: false });

// --- Dados Bancários ---
const dadosBancariosSchema = new Schema({
  bancoNome: { type: String },
  agencia: { type: String },
  operacao: { type: String },
  contaCorrente: { type: String },
  cnpjPagamento: { type: String },
  pix: { type: String }
}, { _id: false });

// --- Corretagem ---
const corretagemSchema = new Schema({
  valorCorretagem: { type: Number, required: true },
  corretorPrincipal: {
    type: Schema.Types.ObjectId,
    ref: 'BrokerContact',
    required: false
  },
  corretoresEnvolvidos: [{
    brokerContactId: { type: Schema.Types.ObjectId, ref: 'BrokerContact' },
    percentualComissao: Number
  }],
  condicoesPagamentoCorretagem: { type: String, trim: true },
  observacoesCorretagem: { type: String, trim: true }
}, { _id: false });

// --- Adquirente (Snapshot) ---
const adquirenteSnapshotSchema = new Schema({
  nome: { type: String, required: true, trim: true },
  cpf: { type: String, trim: true },
  rg: { type: String, trim: true },
  nacionalidade: { type: String, trim: true },
  estadoCivil: { type: String, trim: true },
  profissao: { type: String, trim: true },
  email: {
    type: String,
    required: false,
    match: [/\S+@\S+\.\S+/, 'Email inválido.'],
    trim: true,
    lowercase: true
  },
  contato: {
    type: String,
    required: [true, "O contato do lead é obrigatório."]
  },
  endereco: { type: String, trim: true },
  nascimento: { type: Date }
}, { _id: false });

// --- PropostaContrato ---
const propostaContratoSchema = new Schema({
  lead: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
  reserva: { type: Schema.Types.ObjectId, ref: 'Reserva', required: true, unique: true, index: true },
  imovel: {
    type: Schema.Types.ObjectId,
    required: true,
    refPath: 'tipoImovel'
  },
  tipoImovel: {
    type: String,
    required: true,
    enum: ['Unidade', 'ImovelAvulso']
  },
  company: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  adquirentesSnapshot: {
    type: [adquirenteSnapshotSchema],
    required: true
  },
  modeloContratoUtilizado: {
    type: Schema.Types.ObjectId,
    ref: 'ModeloContrato',
    required: false
  },

  // --- Financeiro ---
  precoTabelaUnidadeNoMomento: { type: Number, required: true },
  valorPropostaContrato: { type: Number, required: true },
  valorDescontoConcedido: { type: Number, default: 0 },
  valorEntrada: { type: Number },
  condicoesPagamentoGerais: { type: String, trim: true },
  dadosBancariosParaPagamento: dadosBancariosSchema,
  planoDePagamento: [parcelaSchema],

  // --- Corretagem ---
  corretagem: corretagemSchema,

  regrasDeReajuste: [regraReajusteSchema],

  // --- Contrato ---
  corpoContratoHTMLGerado: { type: String, required: true },

  // --- Metadados ---
  dataProposta: { type: Date, default: Date.now },
  dataAssinaturaCliente: { type: Date },
  dataVendaEfetivada: { type: Date },
  statusPropostaContrato: {
    type: String,
    required: true,
    enum: [
      "Em Elaboração",
      "Aguardando Aprovações",
      "Aguardando Assinatura Cliente",
      "Assinado",
      "Vendido",
      "Recusado",
      "Cancelado",
      "Distrato Realizado"
    ],
    default: "Em Elaboração",
    index: true
  },
  responsavelNegociacao: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  observacoesInternasProposta: { type: String, trim: true },
  dataDistrato: { type: Date },
  motivoDistrato: { type: String, trim: true }
}, { timestamps: true });

// --- Hooks ---
// Desconto automático
propostaContratoSchema.pre('save', function (next) {
  if (this.isModified('precoTabelaUnidadeNoMomento') || this.isModified('valorPropostaContrato')) {
    this.valorDescontoConcedido = (this.precoTabelaUnidadeNoMomento || 0) - (this.valorPropostaContrato || 0);
  }
  next();
});

// Validação de somatório das parcelas
propostaContratoSchema.pre('save', function (next) {
  if (this.$ignoreValidacaoParcelas === true) return next(); // Bypass manual

  if (Array.isArray(this.planoDePagamento) && this.valorPropostaContrato) {
    const totalParcelas = this.planoDePagamento.reduce((acc, p) =>
      acc + (p.valorUnitario * (p.quantidade || 1)), 0);
    
    const total = totalParcelas + (this.valorEntrada || 0);

    const margemAceitavel = 5.00; // R$ 5,00 de tolerância

    if (Math.abs(total - this.valorPropostaContrato) > margemAceitavel) {
      return next(new Error(`O total das parcelas + entrada (R$ ${total.toFixed(2)}) não bate com o valor da proposta (R$ ${this.valorPropostaContrato.toFixed(2)}).`));
    }
  }
  next();
});

// Valida comissão dos corretores
corretagemSchema.pre('validate', function (next) {
  if (Array.isArray(this.corretoresEnvolvidos)) {
    const soma = this.corretoresEnvolvidos.reduce((acc, cur) => acc + (cur.percentualComissao || 0), 0);
    if (soma > 100) return next(new Error('Percentual total de comissão excede 100%.'));
  }
  next();
});

const PropostaContrato = mongoose.model('PropostaContrato', propostaContratoSchema);
module.exports = PropostaContrato;
