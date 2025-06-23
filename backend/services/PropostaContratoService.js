// backend/services/PropostaContratoService.js
const mongoose = require('mongoose');
const PropostaContrato = require('../models/PropostaContrato');
const Reserva = require('../models/Reserva');
const Lead = require('../models/Lead');
const Unidade = require('../models/Unidade');
const Empreendimento = require('../models/Empreendimento');
const Company = require('../models/Company'); 
const LeadStage = require('../models/LeadStage');
const { logHistory } = require('./LeadService');
const User = require('../models/User');
const ModeloContrato = require('../models/ModeloContrato');
const BrokerContact = require('../models/BrokerContact');
const puppeteer = require('puppeteer-core');
const DiscardReason = require('../models/DiscardReason');



 
/**
 * Monta um objeto com todos os dados necessários para substituir os placeholders de um template de contrato.
 * @param {object} propostaData - Os dados da proposta que vieram do formulário.
 * @param {object} leadDoc - O documento Mongoose do Lead principal (com coadquirentes).
 * @param {object} imovelDoc - O documento Mongoose do Imóvel (seja Unidade ou ImovelAvulso).
 * @param {object} empresaVendedora - O documento da Empresa vendedora.
 * @param {object} corretorPrincipalDoc - (Opcional) O documento do corretor principal.
 * @returns {object} Um objeto onde cada chave é um placeholder e cada valor é o dado correspondente.
 */
const montarDadosParaTemplate = (propostaData, leadDoc, imovelDoc, empresaVendedora, corretorPrincipalDoc) => {
  // Funções auxiliares para formatação
  const formatCurrency = (value) => {
    const number = parseFloat(value);
    if (isNaN(number)) return 'R$ 0,00';
    return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const formatDate = (value) => {
    if (!value) return '';
    const date = (value instanceof Date) ? value : new Date(value);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pt-BR');
  };

  // Corrigida para aceitar Date ou string, com validação
  const formatDateExtenso = (value) => {
    if (!value) return '';
    const date = (value instanceof Date) ? value : new Date(value);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const dados = {};

  // --- 1. Dados do Vendedor (Sua Empresa) ---
  dados['vendedor_nome_fantasia'] = empresaVendedora?.nome || '';
  dados['vendedor_razao_social'] = empresaVendedora?.razaoSocial || empresaVendedora?.nome || '';
  dados['vendedor_cnpj'] = empresaVendedora?.cnpj || '';
  dados['vendedor_endereco_completo'] = `${empresaVendedora?.endereco?.logradouro || ''}, ${empresaVendedora?.endereco?.numero || ''} - ${empresaVendedora?.endereco?.bairro || ''}, ${empresaVendedora?.endereco?.cidade || ''}/${empresaVendedora?.endereco?.uf || ''}`;
  dados['vendedor_representante_nome'] = empresaVendedora?.representanteLegalNome || '';
  dados['vendedor_representante_cpf'] = empresaVendedora?.representanteLegalCPF || '';

  // --- 2. Dados dos Compradores (Principal + Coadquirentes) ---
  const todosAdquirentes = [
    { ...leadDoc },
    ...(leadDoc.coadquirentes || [])
  ];

  let blocoHtmlCoadquirentes = '';
  let blocoAssinaturasCompradores = '';

  todosAdquirentes.forEach((adq, index) => {
    const prefixo = index === 0 ? 'lead_principal' : `coadquirente${index}`;
    dados[`${prefixo}_nome`] = adq.nome || '';
    dados[`${prefixo}_cpf`] = adq.cpf || '';
    dados[`${prefixo}_rg`] = adq.rg || '';
    dados[`${prefixo}_nacionalidade`] = adq.nacionalidade || '';
    dados[`${prefixo}_estadoCivil`] = adq.estadoCivil || '';
    dados[`${prefixo}_profissao`] = adq.profissao || '';
    dados[`${prefixo}_email`] = adq.email || '';
    dados[`${prefixo}_contato`] = adq.contato || '';
    dados[`${prefixo}_endereco`] = adq.endereco || '';
    dados[`${prefixo}_nascimento`] = formatDate(adq.nascimento);

    if (index > 0) {
      blocoHtmlCoadquirentes += `<p><strong>Coadquirente ${index}:</strong> ${adq.nome || ''} (CPF: ${adq.cpf || 'N/A'})</p>`;
    }

    const tituloAssinatura = index === 0 ? '(COMPRADOR/A PRINCIPAL)' : `(COADQUIRENTE ${index})`;
    blocoAssinaturasCompradores += `<p style="text-align: center; margin-top: 40px;">_________________________<br><strong>${adq.nome || ''}</strong><br>${tituloAssinatura}</p>`;
  });

  dados['bloco_html_coadquirentes'] = blocoHtmlCoadquirentes || '<p>Não há coadquirentes.</p>';
  dados['bloco_assinaturas_compradores'] = blocoAssinaturasCompradores;

  // --- 3. Dados do Imóvel (Polimórfico) ---
  if (imovelDoc) {
    const tipo = imovelDoc.constructor?.modelName;
    const empreendimento = tipo === 'Unidade' ? imovelDoc.empreendimento : null;

    dados['imovel_descricao'] = tipo === 'Unidade' ? imovelDoc.tipologia : imovelDoc.descricao;
    dados['imovel_identificador'] = tipo === 'Unidade' ? imovelDoc.identificador : imovelDoc.titulo;
    dados['empreendimento_nome'] = tipo === 'Unidade'
      ? empreendimento?.nome || 'Empreendimento não identificado'
      : 'Imóvel Avulso';
    dados['imovel_endereco_completo'] = tipo === 'Unidade'
      ? `${empreendimento?.localizacao?.logradouro || ''}, ${empreendimento?.localizacao?.numero || ''}`
      : `${imovelDoc.endereco?.logradouro || ''}, ${imovelDoc.endereco?.numero || ''}`;
    dados['unidade_matricula'] = imovelDoc.matriculaImovel || '';
    dados['unidade_memorial_incorporacao'] = tipo === 'Unidade'
      ? (empreendimento?.memorialIncorporacao || '')
      : 'N/A';
  }

  // --- 4. Dados Financeiros e da Proposta ---
  dados['proposta_valor_total_formatado'] = formatCurrency(propostaData.valorPropostaContrato);
  dados['proposta_valor_entrada_formatado'] = propostaData.valorEntrada ? formatCurrency(propostaData.valorEntrada) : 'N/A';
  dados['proposta_condicoes_pagamento_gerais'] = propostaData.condicoesPagamentoGerais || '';
  dados['plano_pagamento_string_formatada'] = (propostaData.planoDePagamento || [])
    .map(p => `- ${p.quantidade || 1}x ${p.tipoParcela} de ${formatCurrency(p.valorUnitario)} (1º Venc: ${formatDate(p.vencimentoPrimeira)})`)
    .join('<br>');

  // --- 5. Dados da Corretagem ---
  dados['corretagem_valor_formatado'] = propostaData.corretagem?.valorCorretagem ? formatCurrency(propostaData.corretagem.valorCorretagem) : 'N/A';
  dados['corretagem_condicoes'] = propostaData.corretagem?.condicoesPagamentoCorretagem || '';
  dados['corretor_principal_nome'] = corretorPrincipalDoc?.nome || '';
  dados['corretor_principal_cpf_cnpj'] = corretorPrincipalDoc?.cpfCnpj || '';
  dados['corretor_principal_creci'] = corretorPrincipalDoc?.creci || '';

  // --- 6. Dados Gerais do Documento ---
  dados['data_proposta_extenso'] = formatDateExtenso(propostaData.dataProposta);
  dados['cidade_contrato'] = empresaVendedora.endereco?.cidade || '';

  return dados;
};





/**
 * Cria uma nova Proposta/Contrato a partir de uma Reserva ativa.
 * @param {string} reservaId - ID da Reserva ativa.
 * @param {object} propostaContratoData - Dados específicos da proposta/contrato (valor, condições, parcelas, corretagem, corpoHTML, etc.).
 * @param {string} companyId - ID da Empresa do usuário logado.
 * @param {string} creatingUserId - ID do Usuário do CRM que está criando.
 * @returns {Promise<PropostaContrato>} A Proposta/Contrato criada.
 */
const createPropostaContrato = async (reservaId, propostaData, companyId, creatingUserId) => {
    console.log('[PropostaContrato] Iniciando criação de proposta (apenas dados estruturados)...');

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // --- 1. Buscar a Reserva e dados essenciais ---
        const reserva = await Reserva.findById(reservaId)
            .populate('lead')
            .populate('imovel')
            .session(session);

        if (!reserva) {
            throw new Error("Reserva associada não encontrada.");
        }
        if (reserva.statusReserva !== 'Ativa') {
            throw new Error(`A reserva não está mais ativa. Status atual: ${reserva.statusReserva}`);
        }
        
        // --- 2. Construir o Snapshot dos Adquirentes a partir dos dados do Lead ---
        const adquirentesSnapshot = [
            { // Adquirente Principal
                nome: reserva.lead.nome,
                cpf: reserva.lead.cpf,
                rg: reserva.lead.rg,
                nacionalidade: reserva.lead.nacionalidade,
                estadoCivil: reserva.lead.estadoCivil,
                profissao: reserva.lead.profissao,
                email: reserva.lead.email,
                contato: reserva.lead.contato,
                endereco: reserva.lead.endereco,
                nascimento: reserva.lead.nascimento
            },
            ...(reserva.lead.coadquirentes || []).map(co => co.toObject())
        ];

        // --- Recalcular valor total da proposta com base na entrada + parcelas ---
        const entrada = parseFloat(propostaData.valorEntrada) || 0;
        const totalParcelas = (propostaData.planoDePagamento || []).reduce((acc, parcela) => {
        const valor = parseFloat(parcela.valorUnitario) || 0;
        const qtd = parseInt(parcela.quantidade) || 1;
        return acc + (valor * qtd);
        }, 0);

        const valorTotalProposta = entrada + totalParcelas;
        propostaData.valorPropostaContrato = valorTotalProposta;


        // --- 3. Montar o Objeto Final da Proposta para Salvar ---
        const dadosParaNovaProposta = {
            ...propostaData,
            lead: reserva.lead._id,
            reserva: reserva._id,
            imovel: reserva.imovel._id,
            tipoImovel: reserva.tipoImovel,
            company: companyId,
            createdBy: creatingUserId,
            adquirentesSnapshot: adquirentesSnapshot,
            empreendimentoNomeSnapshot: reserva.tipoImovel === 'Unidade' ? reserva.imovel.empreendimento?.nome : 'Imóvel Avulso',
            unidadeIdentificadorSnapshot: reserva.tipoImovel === 'Unidade' ? reserva.imovel.identificador : reserva.imovel.titulo,
            precoTabelaUnidadeNoMomento:
                reserva.tipoImovel === 'Unidade'
                ? reserva.imovel.precoTabela
                : reserva.imovel.preco,
            corpoContratoHTMLGerado: "<p><em>Documento ainda não foi gerado. Selecione um modelo de contrato na página de detalhes para gerá-lo.</em></p>",
            modeloContratoUtilizado: null
        };

        const proposta = new PropostaContrato(dadosParaNovaProposta);
        proposta.$ignoreValidacaoParcelas = true;
        const propostaSalva = await proposta.save({ session });
        console.log('[PropostaContrato] Proposta (dados) criada com ID:', propostaSalva._id);

        // --- 4. Atualizar Status das Entidades Relacionadas ---
        reserva.statusReserva = 'ConvertidaEmProposta';
        reserva.propostaId = propostaSalva._id;
        
        const imovelDoc = await mongoose.model(reserva.tipoImovel).findById(reserva.imovel._id).session(session);
        if (imovelDoc) {
            imovelDoc.status = 'Proposta';
            await imovelDoc.save({ session });
        }
        
        const nomeEstagio = 'Proposta Emitida';
        const leadStage = await LeadStage.findOneAndUpdate(
            { company: companyId, nome: { $regex: new RegExp(`^${nomeEstagio}$`, 'i') } },
            { $setOnInsert: { nome: nomeEstagio, company: companyId, ativo: true } },
            { new: true, upsert: true, runValidators: true, session: session }
        );
        reserva.lead.situacao = leadStage._id;

        await Promise.all([
            reserva.save({ session }),
            reserva.lead.save({ session })
        ]);

        await logHistory(
            reserva.lead._id,
            creatingUserId,
            'PROPOSTA_CONTRATO_CRIADA',
            `Proposta (dados) criada com ID ${propostaSalva._id}.`,
            { propostaContratoId: propostaSalva._id },
            null,
            'PropostaContrato',
            propostaSalva._id,
            session
        );

        await session.commitTransaction();
        console.log('[PropostaContrato] Processo de criação de proposta concluído com sucesso.');
        return propostaSalva;

    } catch (err) {
        await session.abortTransaction();
        console.error('[PropostaContrato][ERRO] Falha ao criar proposta:', err);
        throw new Error(err.message || 'Erro interno ao criar proposta.');
    } finally {
        session.endSession();
    }
};




const preencherTemplateContrato = (templateHtml = "", dados = {}) => {
  let corpoProcessado = templateHtml;
  for (const key in dados) {
    const placeholder = `{{${key}}}`;
    corpoProcessado = corpoProcessado.replace(
      new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),
      dados[key] !== null && dados[key] !== undefined ? dados[key] : ''
    );
  }
  return corpoProcessado;
};

/**
 * Busca uma Proposta/Contrato específica por seu ID, garantindo que pertence à empresa.
 * @param {string} propostaContratoId - ID da Proposta/Contrato.
 * @param {string} companyId - ID da Empresa.
 * @returns {Promise<PropostaContrato|null>} A Proposta/Contrato encontrada ou null.
 */
const getPropostaContratoById = async (propostaContratoId, companyId) => {
    if (!mongoose.Types.ObjectId.isValid(propostaContratoId) || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error("ID da Proposta/Contrato ou da Empresa inválido.");
    }

    console.log(`[PropContSvc] Buscando Proposta/Contrato ID: ${propostaContratoId} para Company: ${companyId}`);

    try {
        const propostaContrato = await PropostaContrato.findOne({ _id: propostaContratoId, company: companyId })
            .populate({ path: 'lead', select: 'nome email contato cpf rg estadoCivil profissao nacionalidade' })
            .populate({
                path: 'imovel',
                strictPopulate: false,
                select: 'identificador titulo tipologia areaUtil empreendimento preco precoTabela',
                populate: {
                    path: 'empreendimento',
                    select: 'nome localizacao memorialIncorporacao',
                    strictPopulate: false
                }
            })
            .populate({ path: 'reserva', select: 'dataReserva validadeReserva valorSinal' })
            .populate({ path: 'modeloContratoUtilizado', select: 'nomeModelo tipoDocumento' })
            .populate({ path: 'responsavelNegociacao', select: 'nome email' })
            .populate({ path: 'createdBy', select: 'nome email' })
            .populate({ path: 'corretagem.corretorPrincipal', model: 'BrokerContact', select: 'nome creci cpfCnpj contato email' })
            .lean();

        if (!propostaContrato) {
            console.log(`[PropContSvc] Proposta/Contrato ID: ${propostaContratoId} não encontrada para Company: ${companyId}.`);
            return null;
        }

        if (propostaContrato.company) {
            const empresaVendedora = await Company.findById(propostaContrato.company)
                .select('nome razaoSocial cnpj endereco representanteLegalNome representanteLegalCPF')
                .lean();
            propostaContrato.dadosEmpresaVendedora = empresaVendedora || {};
        }

        return propostaContrato;

    } catch (error) {
        console.error(`[PropContSvc] Erro ao buscar Proposta/Contrato ${propostaContratoId}:`, error);
        throw new Error("Erro ao buscar Proposta/Contrato por ID.");
    }
};


/**
 * Gera um PDF para uma Proposta/Contrato específica.
 * @param {string} propostaContratoId - ID da Proposta/Contrato.
 * @param {string} companyId - ID da Empresa (para verificação de propriedade).
 * @returns {Promise<Buffer>} Buffer do PDF gerado.
 * @throws {Error} Se a proposta não for encontrada ou falhar a geração do PDF.
 */
const gerarPDFPropostaContrato = async (propostaContratoId, companyId) => {
    if (!mongoose.Types.ObjectId.isValid(propostaContratoId) || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error("ID da Proposta/Contrato ou da Empresa inválido para gerar PDF.");
    }
    console.log(`[PropContSvc PDF] Iniciando geração de PDF para Proposta/Contrato ID: ${propostaContratoId}, Company: ${companyId}`);

    let browser = null; // Define o browser fora do try para poder fechar no finally

    try {
        const propostaContrato = await PropostaContrato.findOne({ 
            _id: propostaContratoId, 
            company: companyId 
        })
        .select('corpoContratoHTMLGerado lead empreendimento unidade') // Campos para nome do arquivo, se desejar
        .populate({ path: 'lead', select: 'nome' })
        .lean();

        if (!propostaContrato || !propostaContrato.corpoContratoHTMLGerado) {
            throw new Error("Proposta/Contrato não encontrada ou sem conteúdo HTML para gerar PDF.");
        }
        console.log(`[PropContSvc PDF] Proposta/Contrato encontrada. Conteúdo HTML (início): ${propostaContrato.corpoContratoHTMLGerado.substring(0, 100)}...`);

        console.log("[PropContSvc PDF] Lançando Puppeteer...");
        browser = await puppeteer.launch({
            headless: true, // 'new' é o padrão mais recente para headless
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',     
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'         
            ],
        });
        console.log("[PropContSvc PDF] Navegador Puppeteer lançado.");

        const page = await browser.newPage();
        console.log("[PropContSvc PDF] Nova página Puppeteer criada.");

        const fullHtml = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>Proposta/Contrato</title>
                <style>
                    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 40px; line-height: 1.6; color: #333; }
                    h1, h2, h3, h4, h5, h6 { font-weight: normal; color: #111; }
                    /* Adicione aqui estilos CSS que você quer que sejam aplicados ao PDF */
                    /* Ex: table { width: 100%; border-collapse: collapse; } */
                    /* td, th { border: 1px solid #ccc; padding: 8px; } */
                    /* .assinatura { margin-top: 50px; border-top: 1px solid #000; width: 250px; text-align: center; } */
                </style>
            </head>
            <body>
                ${propostaContrato.corpoContratoHTMLGerado}
            </body>
            </html>
        `;

        console.log("[PropContSvc PDF] Definindo conteúdo da página...");
        await page.setContent(fullHtml, { waitUntil: 'networkidle0' }); // Espera a rede ficar ociosa
        console.log("[PropContSvc PDF] Conteúdo definido. Gerando PDF...");

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true, // Importante para imprimir cores e imagens de fundo do CSS
            margin: {
                top: '2.5cm',    // Ajuste conforme necessário
                right: '2cm',
                bottom: '2.5cm',
                left: '2cm'
            },
            displayHeaderFooter: true,
            footerTemplate: `<div style="font-size:8px; width:100%; text-align:center; padding:5px 0;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>`,
            headerTemplate: '<div></div>',
        });
        console.log("[PropContSvc PDF] Buffer do PDF gerado.");

        return pdfBuffer; // Retorna o buffer

    } catch (error) {
        console.error(`[PropContSvc PDF] ERRO DETALHADO ao gerar PDF para Proposta/Contrato ${propostaContratoId}:`, error);
        // Lança um erro mais genérico ou o erro original se preferir
        throw new Error(`Falha ao gerar o PDF da Proposta/Contrato. Detalhe: ${error.message}`);
    } finally {
        if (browser !== null) {
            console.log("[PropContSvc PDF] Fechando navegador Puppeteer...");
            await browser.close();
            console.log("[PropContSvc PDF] Navegador Puppeteer fechado.");
        }
    }
};

/**
 * Atualiza uma Proposta/Contrato existente.
 * @param {string} propostaContratoId - ID da Proposta/Contrato a ser atualizada.
 * @param {object} updateData - Dados para atualizar (não permite alterar vínculos como lead, unidade, etc.).
 * @param {string} companyId - ID da Empresa do usuário logado.
 * @param {string} actorUserId - ID do Usuário do CRM que está realizando a atualização.
 * @returns {Promise<PropostaContrato>} A Proposta/Contrato atualizada.
 */
const updatePropostaContrato = async (propostaContratoId, updateData, companyId, actorUserId) => {
    console.log(`[PropContSvc] Atualizando Proposta/Contrato ID: ${propostaContratoId} para Company: ${companyId} por User: ${actorUserId}`);

    if (
        !mongoose.Types.ObjectId.isValid(propostaContratoId) ||
        !mongoose.Types.ObjectId.isValid(companyId) ||
        !mongoose.Types.ObjectId.isValid(actorUserId)
    ) {
        throw new Error("IDs inválidos fornecidos (Proposta/Contrato, Empresa ou Usuário).");
    }

    const NaoAlterar = [
        'lead', 'reserva', 'imovel', 'tipoImovel', 'company', 'createdBy',
        '_id', 'createdAt', 'updatedAt', '__v', 'modeloContratoUtilizado',
        'precoTabelaUnidadeNoMomento'
    ];
    for (const key of NaoAlterar) {
        delete updateData[key];
    }

    // --- Recalcular valor da proposta (entrada + parcelas)
    const entrada = parseFloat(updateData.valorEntrada) || 0;
    const totalParcelas = (updateData.planoDePagamento || []).reduce((acc, parcela) => {
        const valor = parseFloat(parcela.valorUnitario) || 0;
        const qtd = parseInt(parcela.quantidade) || 1;
        return acc + (valor * qtd);
    }, 0);
    const valorTotalProposta = entrada + totalParcelas;
    updateData.valorPropostaContrato = valorTotalProposta;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const propostaContrato = await PropostaContrato.findOne({
            _id: propostaContratoId,
            company: companyId
        }).session(session);

        if (!propostaContrato) {
            throw new Error("Proposta/Contrato não encontrada ou não pertence a esta empresa.");
        }

        if (["Vendido", "Cancelado"].includes(propostaContrato.statusPropostaContrato)) {
            throw new Error(`Proposta/Contrato com status "${propostaContrato.statusPropostaContrato}" não pode ser editada.`);
        }

        // Buscar dados relacionados
        const [reserva, lead, imovel, modeloContrato, empresaVendedora, corretorPrincipalDoc] = await Promise.all([
            Reserva.findById(propostaContrato.reserva).session(session),
            Lead.findById(propostaContrato.lead).session(session),
            mongoose.model(propostaContrato.tipoImovel).findById(propostaContrato.imovel)
                .populate(propostaContrato.tipoImovel === 'Unidade' ? { path: 'empreendimento', model: 'Empreendimento' } : null)
                .session(session),
            ModeloContrato.findById(propostaContrato.modeloContratoUtilizado).lean().session(session),
            Company.findById(companyId).lean().session(session),
            updateData.corretagem?.corretorPrincipal
                ? BrokerContact.findById(updateData.corretagem.corretorPrincipal).lean().session(session)
                : Promise.resolve(null)
        ]);

        // Logs para identificar dados faltantes
        console.log("Dados relacionados carregados:");
        console.log("reserva:", reserva);
        console.log("lead:", lead);
        console.log("imovel:", imovel);
        console.log("modeloContrato:", modeloContrato);
        console.log("empresaVendedora:", empresaVendedora);
        console.log("corretorPrincipalDoc:", corretorPrincipalDoc);

        if (!reserva) throw new Error('Reserva não encontrada para a proposta.');
        if (!lead) throw new Error('Lead não encontrado para a proposta.');
        if (!imovel) throw new Error('Imóvel não encontrado para a proposta.');
        if (!modeloContrato) throw new Error('Modelo de contrato não encontrado para a proposta.');
        if (!empresaVendedora) throw new Error('Empresa vendedora não encontrada para a proposta.');

        const dadosTemplate = montarDadosParaTemplate(
            { ...propostaContrato.toObject(), ...updateData },
            lead,
            imovel,
            empresaVendedora,
            corretorPrincipalDoc
        );

        const corpoContratoProcessado = preencherTemplateContrato(
            modeloContrato.conteudoHTMLTemplate,
            dadosTemplate
        );

        const adquirentesSnapshot = [
            {
                nome: lead.nome,
                cpf: lead.cpf,
                rg: lead.rg,
                nacionalidade: lead.nacionalidade,
                estadoCivil: lead.estadoCivil,
                profissao: lead.profissao,
                email: lead.email,
                contato: lead.contato,
                endereco: lead.endereco,
                nascimento: lead.nascimento
            },
            ...(lead.coadquirentes || []).map(co => co.toObject())
        ];

        Object.assign(propostaContrato, updateData, {
            corpoContratoHTMLGerado: corpoContratoProcessado,
            adquirentesSnapshot,
            empreendimentoNomeSnapshot:
                propostaContrato.tipoImovel === 'Unidade'
                    ? imovel.empreendimento?.nome
                    : 'Imóvel Avulso',
            unidadeIdentificadorSnapshot:
                propostaContrato.tipoImovel === 'Unidade'
                    ? imovel.identificador
                    : imovel.titulo
        });

        propostaContrato.$ignoreValidacaoParcelas = true;

        const oldData = await PropostaContrato.findById(propostaContratoId).lean();
        const propostaAtualizada = await propostaContrato.save({ session });

        await logHistory(
            propostaAtualizada.lead,
            actorUserId,
            "PROPOSTA_CONTRATO_EDITADA",
            `Proposta/Contrato (ID: ${propostaAtualizada._id}) atualizada.`,
            { oldData },
            propostaAtualizada.toObject(),
            'PropostaContrato',
            propostaAtualizada._id,
            session
        );

        await session.commitTransaction();
        console.log(`[PropContSvc] Proposta/Contrato ${propostaAtualizada._id} atualizada com sucesso.`);
        return propostaAtualizada;

    } catch (error) {
        await session.abortTransaction();
        console.error("[PropContSvc] Erro ao atualizar Proposta/Contrato:", error);
        throw new Error(error.message || "Erro interno ao atualizar a Proposta/Contrato.");
    } finally {
        session.endSession();
    }
};







/**
 * Atualiza o status de uma Proposta/Contrato e os status relacionados de Lead, Unidade e Reserva.
 * @param {string} propostaContratoId - ID da Proposta/Contrato.
 * @param {string} novoStatus - O novo status para a Proposta/Contrato.
 * @param {object} dadosAdicionais - Dados extras, como dataAssinaturaCliente, dataVendaEfetivada.
 * @param {string} companyId - ID da Empresa.
 * @param {string} actorUserId - ID do Usuário que está realizando a ação.
 * @returns {Promise<PropostaContrato>} A Proposta/Contrato atualizada.
 */
const updateStatusPropostaContrato = async (propostaContratoId, novoStatus, dadosAdicionais = {}, companyId, actorUserId) => {
    console.log(`[PropContSvc Status] Atualizando status da Proposta/Contrato ID: ${propostaContratoId} para '${novoStatus}' por User: ${actorUserId}`);

    if (!mongoose.Types.ObjectId.isValid(propostaContratoId) ||
        !mongoose.Types.ObjectId.isValid(companyId) ||
        !mongoose.Types.ObjectId.isValid(actorUserId)) {
        throw new Error("IDs inválidos fornecidos (Proposta/Contrato, Empresa ou Usuário).");
    }

    const statusPermitidos = PropostaContrato.schema.path('statusPropostaContrato').enumValues;
    if (!statusPermitidos.includes(novoStatus)) {
        throw new Error(`Status '${novoStatus}' é inválido para Proposta/Contrato.`);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const propostaContrato = await PropostaContrato.findOne({ _id: propostaContratoId, company: companyId })
            .populate('lead')
            .populate('unidade')
            .populate('reserva')
            .session(session);

        if (!propostaContrato) {
            throw new Error("Proposta/Contrato não encontrada ou não pertence a esta empresa.");
        }
        if (!propostaContrato.lead || !propostaContrato.unidade || !propostaContrato.reserva) {
            throw new Error("Dados vinculados (Lead, Unidade ou Reserva) não encontrados para esta Proposta/Contrato.");
        }

        const statusAntigoProposta = propostaContrato.statusPropostaContrato;
        if (statusAntigoProposta === novoStatus) {
            // Nenhuma mudança de status, talvez apenas atualizando outros campos como dataAssinatura
            if (novoStatus === "Assinado" && dadosAdicionais.dataAssinaturaCliente) {
                propostaContrato.dataAssinaturaCliente = new Date(dadosAdicionais.dataAssinaturaCliente);
            }
             // Poderia adicionar lógica para atualizar outros campos se não houver mudança de status
            await propostaContrato.save({ session });
            await session.commitTransaction();
            console.log(`[PropContSvc Status] Proposta/Contrato ${propostaContratoId} já estava com status '${novoStatus}'. Outros dados podem ter sido atualizados.`);
            return propostaContrato;
        }
        
        // TODO: Adicionar lógica de transição de status permitida (ex: de "Em Elaboração" só pode ir para "Aguardando Aprovação", etc.)

        propostaContrato.statusPropostaContrato = novoStatus;
        let leadStatusNomeAlvo = null; // Nome do novo estágio do lead
        let logAction = `PROPOSTA_STATUS_${novoStatus.toUpperCase().replace(/\s+/g, '_')}`;
        let logDetails = `Status da Proposta/Contrato (ID: ${propostaContrato._id}) alterado de "${statusAntigoProposta}" para "${novoStatus}".`;

        // Lógica específica baseada no NOVO status
        if (novoStatus === "Assinado") {
            propostaContrato.dataAssinaturaCliente = dadosAdicionais.dataAssinaturaCliente ? new Date(dadosAdicionais.dataAssinaturaCliente) : new Date();
            leadStatusNomeAlvo = "Em Reserva"; // Ou o nome do seu estágio
        } else if (novoStatus === "Vendido") {
            propostaContrato.dataVendaEfetivada = dadosAdicionais.dataVendaEfetivada ? new Date(dadosAdicionais.dataVendaEfetivada) : new Date();
            propostaContrato.dataAssinaturaCliente = propostaContrato.dataAssinaturaCliente || new Date(); // Garante data de assinatura se não houver
            
            // Atualiza Unidade
            propostaContrato.unidade.statusUnidade = "Vendido";
            // currentLeadId e currentReservaId já devem estar corretos na unidade desde a reserva

            // Atualiza Reserva
            propostaContrato.reserva.statusReserva = "ConvertidaEmVenda";
            
            leadStatusNomeAlvo = "Venda Realizada";
        } else if (novoStatus === "Recusado" || novoStatus === "Cancelado") {
            // Atualiza Reserva
            propostaContrato.reserva.statusReserva = novoStatus === "Recusado" ? "RecusadaPelaProposta" : "CanceladaPelaProposta";

            // Libera a Unidade
            if (propostaContrato.unidade.statusUnidade !== "Disponível" && 
                propostaContrato.unidade.currentReservaId && 
                propostaContrato.unidade.currentReservaId.equals(propostaContrato.reserva._id)) 
            {
                propostaContrato.unidade.statusUnidade = "Disponível";
                propostaContrato.unidade.currentLeadId = null;
                propostaContrato.unidade.currentReservaId = null;
            }
            leadStatusNomeAlvo = novoStatus === "Recusado" ? "Proposta Recusada" : "Negociação Perdida"; // Ou um estágio genérico
        }
        // Adicione mais 'else if' para outros status que alteram Lead/Unidade

        // Salva Unidade e Reserva se foram modificadas
        if (propostaContrato.unidade.isModified()) await propostaContrato.unidade.save({ session });
        if (propostaContrato.reserva.isModified()) await propostaContrato.reserva.save({ session });

        // Atualiza Status do Lead se um leadStatusNomeAlvo foi definido
        if (leadStatusNomeAlvo) {
            const novoLeadStage = await LeadStage.findOneAndUpdate(
                { company: companyId, nome: { $regex: new RegExp(`^${leadStatusNomeAlvo}$`, "i") } },
                { $setOnInsert: { nome: leadStatusNomeAlvo, company: companyId, ativo: true, descricao: `Status automático via Proposta/Contrato.` } },
                { new: true, upsert: true, runValidators: true, session: session }
            );
            if (!novoLeadStage) throw new Error (`Estágio de Lead '${leadStatusNomeAlvo}' não pôde ser encontrado ou criado.`);
            
            if (!propostaContrato.lead.situacao.equals(novoLeadStage._id)) {
                const oldLeadStageDoc = await LeadStage.findById(propostaContrato.lead.situacao).lean();
                logDetails += ` Lead movido de "${oldLeadStageDoc?.nome || 'N/A'}" para "${novoLeadStage.nome}".`;
                propostaContrato.lead.situacao = novoLeadStage._id;
            }
        }
        if (propostaContrato.lead.isModified()) await propostaContrato.lead.save({ session });
        
        const propostaAtualizada = await propostaContrato.save({ session });

        await logHistory(
            propostaAtualizada.lead._id, actorUserId, logAction, logDetails,
            { oldStatus: statusAntigoProposta }, { newStatus: novoStatus },
            'PropostaContrato', propostaAtualizada._id, session
        );

        await session.commitTransaction();
        console.log(`[PropContSvc Status] Status da Proposta/Contrato ${propostaAtualizada._id} atualizado para '${novoStatus}'. Entidades relacionadas atualizadas.`);
        return propostaAtualizada;

    } catch (error) {
        await session.abortTransaction();
        console.error("[PropContSvc Status] Erro ao atualizar status da Proposta/Contrato:", error);
        throw new Error(error.message || "Erro interno ao atualizar status da Proposta/Contrato.");
    } finally {
        session.endSession();
    }
};


/**
 * Registra o distrato de uma Proposta/Contrato que estava Vendida.
 * Libera a unidade e atualiza o status do Lead.
 * @param {string} propostaContratoId - ID da Proposta/Contrato.
 * @param {object} dadosDistrato - { motivoDistrato: string, dataDistrato?: date }
 * @param {string} companyId - ID da Empresa.
 * @param {string} actorUserId - ID do Usuário que está realizando a ação.
 * @returns {Promise<PropostaContrato>} A Proposta/Contrato atualizada.
 */
const registrarDistratoPropostaContrato = async (propostaContratoId, dadosDistrato, companyId, actorUserId) => {
    console.log(`[PropContSvc Distrato] Registrando distrato para Proposta/Contrato ID: ${propostaContratoId} por User: ${actorUserId}`);

    if (!mongoose.Types.ObjectId.isValid(propostaContratoId) || !mongoose.Types.ObjectId.isValid(companyId) || !mongoose.Types.ObjectId.isValid(actorUserId)) {
        throw new Error("IDs inválidos fornecidos (Proposta/Contrato, Empresa ou Usuário).");
    }
    if (!dadosDistrato || !dadosDistrato.motivoDistrato) {
        throw new Error("Motivo do distrato é obrigatório.");
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const propostaContrato = await PropostaContrato.findOne({ _id: propostaContratoId, company: companyId })
            .populate('lead')
            .populate({ // Garante que o empreendimento da unidade seja populado para o nome no comentário
                path: 'unidade',
                populate: {
                    path: 'empreendimento',
                    select: 'nome _id' // Seleciona nome e ID do empreendimento da unidade
                }
            })
            .populate('reserva')
            // Popula o empreendimento principal da proposta também, caso necessário separadamente
            .populate({ path: 'empreendimento', select: 'nome _id'}) 
            .session(session);

        if (!propostaContrato) {
            throw new Error("Proposta/Contrato não encontrada ou não pertence a esta empresa.");
        }
        if (propostaContrato.statusPropostaContrato !== "Vendido") {
            throw new Error(`Apenas Propostas/Contratos com status "Vendido" podem ser distratadas. Status atual: "${propostaContrato.statusPropostaContrato}".`);
        }
        if (!propostaContrato.lead || !propostaContrato.unidade || !propostaContrato.reserva || !propostaContrato.empreendimento) { // Adicionado !propostaContrato.empreendimento
            throw new Error("Dados vinculados (Lead, Unidade, Empreendimento ou Reserva) não encontrados ou incompletos.");
        }

        const statusAntigoProposta = propostaContrato.statusPropostaContrato;

        // 1. Atualizar Proposta/Contrato
        propostaContrato.statusPropostaContrato = "Distrato Realizado";
        propostaContrato.motivoDistrato = dadosDistrato.motivoDistrato;
        propostaContrato.dataDistrato = dadosDistrato.dataDistrato ? new Date(dadosDistrato.dataDistrato) : new Date();

        // 2. Atualizar Reserva associada
        const reservaDoc = propostaContrato.reserva; // Referência ao documento populado
        reservaDoc.statusReserva = "Distratada";

        // 3. Liberar Unidade
        const unidadeDoc = propostaContrato.unidade; // Referência ao documento populado
        unidadeDoc.statusUnidade = "Disponível";
        unidadeDoc.currentLeadId = null;
        unidadeDoc.currentReservaId = null;

        // 4. Atualizar Lead
        const nomeEstagioDescartado = "Descartado"; 
        const situacaoDescartado = await LeadStage.findOneAndUpdate(
            { company: companyId, nome: { $regex: new RegExp(`^${nomeEstagioDescartado}$`, "i") } },
            { $setOnInsert: { nome: nomeEstagioDescartado, company: companyId, ativo: true, descricao: "Lead descartado devido a distrato de contrato." } },
            { new: true, upsert: true, runValidators: true, session: session }
        );
        if (!situacaoDescartado) throw new Error (`Estágio de Lead '${nomeEstagioDescartado}' não pôde ser encontrado ou criado.`);
        
        const leadDoc = propostaContrato.lead; // Referência ao documento populado
        const oldLeadStatusId = leadDoc.situacao;
        leadDoc.situacao = situacaoDescartado._id;

        // Monta o comentário detalhado do distrato
        // Usa unidadeDoc.empreendimento.nome se disponível, senão propostaContrato.empreendimento.nome
        const nomeEmpreendimentoParaComentario = unidadeDoc.empreendimento?.nome || propostaContrato.empreendimento?.nome || 'N/A';
        const comentarioDistrato = `Distrato da Proposta/Contrato ID ${propostaContrato._id} (Unidade: ${unidadeDoc.identificador} do Empr.: ${nomeEmpreendimentoParaComentario}). Motivo original fornecido: ${dadosDistrato.motivoDistrato}.`;
        leadDoc.comentario = leadDoc.comentario 
            ? `${leadDoc.comentario}\n\n--- DISTRATO ---\n${comentarioDistrato}` 
            : `--- DISTRATO ---\n${comentarioDistrato}`;

        // Lida com o motivoDeDescarte estruturado
        if (dadosDistrato.leadMotivoDescarteId && mongoose.Types.ObjectId.isValid(dadosDistrato.leadMotivoDescarteId)) {
            const motivoDoc = await DiscardReason.findOne({_id: dadosDistrato.leadMotivoDescarteId, company: companyId}).session(session);
            if (motivoDoc) {
                leadDoc.motivoDescarte = dadosDistrato.leadMotivoDescarteId;
                console.log(`[PropContSvc Distrato] Motivo de Descarte ID ${dadosDistrato.leadMotivoDescarteId} definido para o Lead.`);
            } else {
                console.warn(`[PropContSvc Distrato] Motivo de Descarte ID ${dadosDistrato.leadMotivoDescarteId} fornecido não encontrado ou não pertence à empresa. Usando/Criando default.`);
                const motivoDistratoDefault = await DiscardReason.findOneAndUpdate(
                { company: companyId, nome: "Distrato Contratual" }, // Nome padrão para motivo de distrato
                { $setOnInsert: { nome: "Distrato Contratual", company: companyId, ativo: true, descricao: "Venda cancelada via distrato." } },
                { new: true, upsert: true, runValidators: true, session: session }
            );
                if (motivoDistratoDefault) leadDoc.motivoDescarte = motivoDistratoDefault._id;
            }
        } else {
            console.log(`[PropContSvc Distrato] Nenhum ID de Motivo de Descarte específico fornecido. Usando/Criando default "Distrato Contratual".`);
            const motivoDistratoDefault = await DiscardReason.findOneAndUpdate(
                { company: companyId, nome: "Distrato Contratual" }, // Nome padrão para motivo de distrato
                { $setOnInsert: { nome: "Distrato Contratual", company: companyId, ativo: true, descricao: "Venda cancelada via distrato." } },
                { new: true, upsert: true, runValidators: true, session: session }
            );
            if (motivoDistratoDefault) leadDoc.motivoDescarte = motivoDistratoDefault._id;
        }
        
        // Salvar todas as entidades MODIFICADAS

        console.log('[DEBUG] Unidade:', unidadeDoc.statusUnidade);
        console.log('[DEBUG] Lead:', leadDoc.situacao);
        console.log('[DEBUG] Reserva:', reservaDoc.statusReserva);
        await unidadeDoc.save({ session });       // Salva as alterações na unidade
        await reservaDoc.save({ session });       // Salva as alterações na reserva
        await leadDoc.save({ session });          // Salva as alterações no lead
        const propostaAtualizada = await propostaContrato.save({ session }); // Salva as alterações na proposta

        // 5. Log de Histórico
        const leadStatusAntigoNomeDoc = await LeadStage.findById(oldLeadStatusId).select('nome').lean(); // Fora da session, é uma leitura
        const logDetails = `Distrato registrado. Motivo: ${dadosDistrato.motivoDistrato}. Unidade ${unidadeDoc.identificador} liberada. Lead movido para "${situacaoDescartado.nome}".`;
        await logHistory(
            leadDoc._id, actorUserId, "DISTRATO_REALIZADO", logDetails,
            { oldStatusProposta: statusAntigoProposta, oldStatusUnidade: "Vendido" }, 
            { newStatusProposta: "Distrato Realizado", newStatusUnidade: "Disponível" },
            'PropostaContrato', propostaAtualizada._id, session
        );

        await session.commitTransaction();
        console.log(`[PropContSvc Distrato] Distrato para Proposta/Contrato ${propostaAtualizada._id} registrado com sucesso.`);
        return propostaAtualizada;

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        console.error("[PropContSvc Distrato] Erro ao registrar distrato:", error);
        throw new Error(error.message || "Erro interno ao registrar o distrato.");
    } finally {
        if (session.inTransaction()) { // Garante que aborta se não foi commitado
            await session.abortTransaction();
        }
        session.endSession();
    }
};


/**
 * Gera o HTML de um contrato sob demanda, usando um modelo e os dados de uma proposta existente.
 * @param {string} propostaId - ID da Proposta/Contrato.
 * @param {string} modeloId - ID do Modelo de Contrato a ser usado.
 * @param {string} companyId - ID da empresa.
 * @returns {Promise<string>} A string de HTML com os placeholders preenchidos.
 */
const gerarDocumentoHTML = async (propostaId, modeloId, companyId) => {
  console.log(`[PropContSvc] Gerando documento para Proposta ${propostaId} usando Modelo ${modeloId}`);

  const proposta = await PropostaContrato.findById(propostaId)
    .populate({ path: 'lead', model: 'Lead' })
    .populate({ path: 'imovel' }) // populate básico
    .lean();

  if (!proposta) throw new Error("Proposta não encontrada.");

  // Se for unidade, popula empreendimento manualmente
  if (proposta.tipoImovel === 'Unidade' && proposta.imovel?.empreendimento) {
    const empreendimento = await mongoose.model('Empreendimento')
      .findById(proposta.imovel.empreendimento)
      .lean();

    proposta.imovel.empreendimento = empreendimento; // injeta o objeto populado
  }

  const [modelo, empresaVendedora] = await Promise.all([
    ModeloContrato.findOne({ _id: modeloId, company: companyId, ativo: true }).lean(),
    Company.findById(companyId).lean()
  ]);

  if (!modelo) throw new Error("Modelo de contrato não encontrado ou inativo.");
  if (!empresaVendedora) throw new Error("Empresa não encontrada.");

  const corretorDoc = proposta.corretagem?.corretorPrincipal
    ? await BrokerContact.findById(proposta.corretagem.corretorPrincipal).lean()
    : null;

  const dadosParaTemplate = montarDadosParaTemplate(proposta, proposta.lead, proposta.imovel, empresaVendedora, corretorDoc);
  const corpoProcessado = preencherTemplateContrato(modelo.conteudoHTMLTemplate, dadosParaTemplate);

  return corpoProcessado;
};

module.exports = {
    createPropostaContrato,
    preencherTemplateContrato,
    getPropostaContratoById,
    gerarPDFPropostaContrato,
    updatePropostaContrato,
    updateStatusPropostaContrato,
    registrarDistratoPropostaContrato,
    gerarDocumentoHTML
};