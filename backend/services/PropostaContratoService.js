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
 const todosAdquirentes = propostaData.adquirentesSnapshot || [];

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
        blocoHtmlCoadquirentes += `
        <p>
            <strong>Coadquirente ${index}</strong><br>
            Nome: ${adq.nome || ''}<br>
            CPF: ${adq.cpf || ''}<br>
            RG: ${adq.rg || ''}<br>
            Estado Civil: ${adq.estadoCivil || ''}<br>
            Nacionalidade: ${adq.nacionalidade || ''}<br>
            Profissão: ${adq.profissao || ''}<br>
            E-mail: ${adq.email || ''}<br>
            Telefone: ${adq.contato || ''}<br>
            Data de Nascimento: ${formatDate(adq.nascimento)}<br>
            Endereço: ${adq.endereco || ''}
        </p>
        `;
    }

    const tituloAssinatura = index === 0 ? '(COMPRADOR/A PRINCIPAL)' : `(COADQUIRENTE ${index})`;
    blocoAssinaturasCompradores += `
        <p style="text-align: center;  margin-top: 80px; margin-bottom: 60px">
        _________________________<br>
        <strong>${adq.nome || ''}</strong><br>
        ${tituloAssinatura}
        <br>
        <br>
        <br>
        <br>
        <br>
        </p>
    `;
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

  console.log('[DEBUG CONTRATO] Placeholders disponíveis para o modelo:', JSON.stringify(dados, null, 2));

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
    const reserva = await Reserva.findById(reservaId)
      .populate('lead')
      .populate('imovel')
      .session(session);

    if (!reserva) throw new Error("Reserva associada não encontrada.");
    if (reserva.statusReserva !== 'Ativa') throw new Error(`A reserva não está mais ativa. Status atual: ${reserva.statusReserva}`);

    // Atualizar dados do lead com base no primeiro adquirente
    if (propostaData.adquirentes?.length > 0) {
      const principal = propostaData.adquirentes[0];
      Object.assign(reserva.lead, {
        nome: principal.nome,
        cpf: principal.cpf,
        rg: principal.rg,
        nacionalidade: principal.nacionalidade,
        estadoCivil: principal.estadoCivil,
        profissao: principal.profissao,
        email: principal.email,
        contato: principal.contato,
        endereco: principal.endereco,
        nascimento: principal.nascimento,
      });
    }

    const adquirentesSnapshot = propostaData.adquirentes || [];

    const entrada = parseFloat(propostaData.valorEntrada) || 0;
    const totalParcelas = (propostaData.planoDePagamento || []).reduce((acc, parcela) => {
      const valor = parseFloat(parcela.valorUnitario) || 0;
      const qtd = parseInt(parcela.quantidade) || 1;
      return acc + (valor * qtd);
    }, 0);

    const valorTotalProposta = entrada + totalParcelas;
    propostaData.valorPropostaContrato = valorTotalProposta;

    const dadosParaNovaProposta = {
      ...propostaData,
      lead: reserva.lead._id,
      reserva: reserva._id,
      imovel: reserva.imovel._id,
      tipoImovel: reserva.tipoImovel,
      company: companyId,
      createdBy: creatingUserId,
      adquirentesSnapshot,
      empreendimentoNomeSnapshot: reserva.tipoImovel === 'Unidade' ? reserva.imovel.empreendimento?.nome : 'Imóvel Avulso',
      unidadeIdentificadorSnapshot: reserva.tipoImovel === 'Unidade' ? reserva.imovel.identificador : reserva.imovel.titulo,
      precoTabelaUnidadeNoMomento: reserva.tipoImovel === 'Unidade' ? reserva.imovel.precoTabela : reserva.imovel.preco,
      corpoContratoHTMLGerado: "<p><em>Documento ainda não foi gerado. Selecione um modelo de contrato na página de detalhes para gerá-lo.</em></p>",
      modeloContratoUtilizado: null,
    };

    const proposta = new PropostaContrato(dadosParaNovaProposta);
    proposta.$ignoreValidacaoParcelas = true;
    const propostaSalva = await proposta.save({ session });

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
      { new: true, upsert: true, runValidators: true, session }
    );
    reserva.lead.situacao = leadStage._id;

    await Promise.all([
      reserva.save({ session }),
      reserva.lead.save({ session }),
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
                  body {
                        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                        margin: 40px;
                        line-height: 1.6;
                        color: #333;
                      }
                      h1, h2, h3, h4, h5, h6 {
                        font-weight: normal;
                        color: #111;
                      }

                      .ql-align-center {
                        text-align: center;
                      }
                      .ql-align-right {
                        text-align: right;
                      }
                      .ql-align-justify {
                        text-align: justify;
                      }

                      .ql-font-sans-serif {
                        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                      }
                      .ql-font-serif {
                        font-family: Georgia, 'Times New Roman', serif;
                      }
                      .ql-font-monospace {
                        font-family: 'Courier New', Courier, monospace;
                      }
                      .ql-font-arial {
                        font-family: Arial, sans-serif;
                      }
                      .ql-font-times-new-roman {
                        font-family: "Times New Roman", Times, serif;
                      }
                      .ql-font-comic-sans {
                        font-family: "Comic Sans MS", cursive, sans-serif;
                      }
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
                top: '1.5cm',    // Ajuste conforme necessário
                right: '0.5cm',
                bottom: '1.5cm',
                left: '0.5cm'
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

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const proposta = await PropostaContrato.findOne({ _id: propostaContratoId, company: companyId }).session(session);
    if (!proposta) throw new Error('Proposta/Contrato não encontrada.');

    // Atualizar corpoContrato apenas se veio no updateData
    const corpoContratoAtual = proposta.corpoContratoHTMLGerado;
    if (!updateData.corpoContratoHTMLGerado) {
      updateData.corpoContratoHTMLGerado = corpoContratoAtual;
    }

    // Atualiza o snapshot
    if (updateData.adquirentes) {
      proposta.adquirentesSnapshot = updateData.adquirentes;
    }

    // Atualizar dados do lead principal
    if (updateData.adquirentes?.length > 0) {
      const principal = updateData.adquirentes[0];
      const leadDoc = await Lead.findById(proposta.lead).session(session);
      if (leadDoc) {
        Object.assign(leadDoc, {
          nome: principal.nome,
          cpf: principal.cpf,
          rg: principal.rg,
          nacionalidade: principal.nacionalidade,
          estadoCivil: principal.estadoCivil,
          profissao: principal.profissao,
          email: principal.email,
          contato: principal.contato,
          endereco: principal.endereco,
          nascimento: principal.nascimento,
        });
        await leadDoc.save({ session });
      }
    }

    // Atualizar proposta com os dados restantes
    Object.assign(proposta, updateData);
    proposta.updatedAt = new Date();
    await proposta.save({ session });

    await session.commitTransaction();
    return proposta;

  } catch (error) {
    await session.abortTransaction();
    console.error('[PropContSvc] Erro ao atualizar Proposta/Contrato:', error);
    throw error;
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
const updateStatusPropostaContrato = async (
  propostaContratoId,
  novoStatus,
  dadosAdicionais = {},
  companyId,
  actorUserId
) => {
  console.log(`[PropContSvc Status] Atualizando status da Proposta/Contrato ID: ${propostaContratoId} para '${novoStatus}' por User: ${actorUserId}`);

  if (
    !mongoose.Types.ObjectId.isValid(propostaContratoId) ||
    !mongoose.Types.ObjectId.isValid(companyId) ||
    !mongoose.Types.ObjectId.isValid(actorUserId)
  ) {
    throw new Error("IDs inválidos fornecidos (Proposta/Contrato, Empresa ou Usuário).");
  }

  const statusPermitidos = PropostaContrato.schema.path('statusPropostaContrato').enumValues;
  if (!statusPermitidos.includes(novoStatus)) {
    throw new Error(`Status '${novoStatus}' é inválido para Proposta/Contrato.`);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const propostaContrato = await PropostaContrato.findOne({
      _id: propostaContratoId,
      company: companyId
    })
      .populate('lead')
      .populate('reserva')
      .populate('imovel')
      .session(session);

    if (!propostaContrato) {
      throw new Error("Proposta/Contrato não encontrada ou não pertence a esta empresa.");
    }

    if (!propostaContrato.lead || !propostaContrato.reserva || !propostaContrato.imovel) {
      throw new Error("Dados vinculados (Lead, Imóvel ou Reserva) não encontrados para esta Proposta/Contrato.");
    }

    // Define o alias 'unidade' apenas se for do tipo 'Unidade'
    if (propostaContrato.tipoImovel === 'Unidade') {
      propostaContrato.unidade = propostaContrato.imovel;
    } else {
      propostaContrato.unidade = null;
    }

    const statusAntigoProposta = propostaContrato.statusPropostaContrato;

    // Caso já esteja no status solicitado, apenas atualiza dados adicionais (como datas)
    if (statusAntigoProposta === novoStatus) {
      if (novoStatus === "Assinado" && dadosAdicionais.dataAssinaturaCliente) {
        propostaContrato.dataAssinaturaCliente = new Date(dadosAdicionais.dataAssinaturaCliente);
      }

      await propostaContrato.save({ session });
      await session.commitTransaction();
      console.log(`[PropContSvc Status] Proposta/Contrato ${propostaContratoId} já estava com status '${novoStatus}'. Outros dados podem ter sido atualizados.`);
      return propostaContrato;
    }

    // Atualização do status
    propostaContrato.statusPropostaContrato = novoStatus;
    let leadStatusNomeAlvo = null;
    let logAction = `PROPOSTA_STATUS_${novoStatus.toUpperCase().replace(/\s+/g, '_')}`;
    let logDetails = `Status da Proposta/Contrato (ID: ${propostaContrato._id}) alterado de "${statusAntigoProposta}" para "${novoStatus}".`;

    // Regras por tipo de status
    if (novoStatus === "Assinado") {
      propostaContrato.dataAssinaturaCliente = dadosAdicionais.dataAssinaturaCliente
        ? new Date(dadosAdicionais.dataAssinaturaCliente)
        : new Date();
      leadStatusNomeAlvo = "Em Reserva";
    } else if (novoStatus === "Vendido") {
      propostaContrato.dataVendaEfetivada = dadosAdicionais.dataVendaEfetivada
        ? new Date(dadosAdicionais.dataVendaEfetivada)
        : new Date();
      propostaContrato.dataAssinaturaCliente = propostaContrato.dataAssinaturaCliente || new Date();

      if (propostaContrato.unidade) {
        propostaContrato.unidade.statusUnidade = "Vendido";
      }

      propostaContrato.reserva.statusReserva = "ConvertidaEmVenda";
      leadStatusNomeAlvo = "Venda Realizada";
    } else if (novoStatus === "Recusado" || novoStatus === "Cancelado") {
      propostaContrato.reserva.statusReserva =
        novoStatus === "Recusado" ? "RecusadaPelaProposta" : "CanceladaPelaProposta";

      if (
        propostaContrato.unidade &&
        propostaContrato.unidade.statusUnidade !== "Disponível" &&
        propostaContrato.unidade.currentReservaId &&
        propostaContrato.unidade.currentReservaId.equals(propostaContrato.reserva._id)
      ) {
        propostaContrato.unidade.statusUnidade = "Disponível";
        propostaContrato.unidade.currentLeadId = null;
        propostaContrato.unidade.currentReservaId = null;
      }

      leadStatusNomeAlvo = novoStatus === "Recusado" ? "Proposta Recusada" : "Negociação Perdida";
    }

    // Salva modificações em unidade e reserva
    if (propostaContrato.unidade?.isModified()) {
      await propostaContrato.unidade.save({ session });
    }

    if (propostaContrato.reserva.isModified()) {
      await propostaContrato.reserva.save({ session });
    }

    // Atualiza estágio do Lead se necessário
    if (leadStatusNomeAlvo) {
      const novoLeadStage = await LeadStage.findOneAndUpdate(
        { company: companyId, nome: new RegExp(`^${leadStatusNomeAlvo}$`, "i") },
        {
          $setOnInsert: {
            nome: leadStatusNomeAlvo,
            company: companyId,
            ativo: true,
            descricao: "Status automático via Proposta/Contrato."
          }
        },
        { new: true, upsert: true, runValidators: true, session }
      );

      if (!novoLeadStage) {
        throw new Error(`Estágio de Lead '${leadStatusNomeAlvo}' não pôde ser encontrado ou criado.`);
      }

      if (!propostaContrato.lead.situacao.equals(novoLeadStage._id)) {
        const oldLeadStageDoc = await LeadStage.findById(propostaContrato.lead.situacao).lean();
        logDetails += ` Lead movido de "${oldLeadStageDoc?.nome || 'N/A'}" para "${novoLeadStage.nome}".`;
        propostaContrato.lead.situacao = novoLeadStage._id;
      }
    }

    if (propostaContrato.lead.isModified()) {
      await propostaContrato.lead.save({ session });
    }

    const propostaAtualizada = await propostaContrato.save({ session });

    await logHistory(
      propostaAtualizada.lead._id,
      actorUserId,
      logAction,
      logDetails,
      { oldStatus: statusAntigoProposta },
      { newStatus: novoStatus },
      'PropostaContrato',
      propostaAtualizada._id,
      session
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
      .populate('reserva')
      .populate('imovel') // populate básico do campo polimórfico
      .session(session);

    if (!propostaContrato) {
      throw new Error("Proposta/Contrato não encontrada ou não pertence a esta empresa.");
    }

    if (!propostaContrato.lead || !propostaContrato.reserva || !propostaContrato.imovel) {
      throw new Error("Dados vinculados (Lead, Imóvel ou Reserva) não encontrados ou incompletos.");
    }

    const statusAntigoProposta = propostaContrato.statusPropostaContrato;
    if (statusAntigoProposta !== "Vendido") {
      throw new Error(`Apenas Propostas/Contratos com status "Vendido" podem ser distratadas. Status atual: "${statusAntigoProposta}".`);
    }

    // Atualiza status da proposta
    propostaContrato.statusPropostaContrato = "Distrato Realizado";
    propostaContrato.motivoDistrato = dadosDistrato.motivoDistrato;
    propostaContrato.dataDistrato = dadosDistrato.dataDistrato ? new Date(dadosDistrato.dataDistrato) : new Date();

    // Atualiza reserva
    propostaContrato.reserva.statusReserva = "Distratada";

    // Se for unidade, libera a unidade
    let unidadeDoc = null;
    let nomeEmpreendimento = 'N/A';
    let identificadorUnidade = 'N/A';

    if (propostaContrato.tipoImovel === 'Unidade') {
      unidadeDoc = propostaContrato.imovel;
      unidadeDoc.statusUnidade = "Disponível";
      unidadeDoc.currentLeadId = null;
      unidadeDoc.currentReservaId = null;

      // Safe populate manual do empreendimento
      await unidadeDoc.populate({
        path: 'empreendimento',
        select: 'nome',
        strictPopulate: false,
      });

      nomeEmpreendimento = unidadeDoc.empreendimento?.nome || 'N/A';
      identificadorUnidade = unidadeDoc.identificador || 'N/A';

      await unidadeDoc.save({ session });
    }

    // Atualiza lead
    const nomeEstagioDescartado = "Descartado";
    const situacaoDescartado = await LeadStage.findOneAndUpdate(
      { company: companyId, nome: new RegExp(`^${nomeEstagioDescartado}$`, "i") },
      { $setOnInsert: { nome: nomeEstagioDescartado, company: companyId, ativo: true, descricao: "Lead descartado devido a distrato de contrato." } },
      { new: true, upsert: true, runValidators: true, session }
    );

    const leadDoc = propostaContrato.lead;
    const oldLeadStatusId = leadDoc.situacao;
    leadDoc.situacao = situacaoDescartado._id;

    const comentarioDistrato = `Distrato da Proposta/Contrato ID ${propostaContrato._id} (Unidade: ${identificadorUnidade} do Empr.: ${nomeEmpreendimento}). Motivo original fornecido: ${dadosDistrato.motivoDistrato}.`;
    leadDoc.comentario = leadDoc.comentario
      ? `${leadDoc.comentario}\n\n--- DISTRATO ---\n${comentarioDistrato}`
      : `--- DISTRATO ---\n${comentarioDistrato}`;

    // Motivo de descarte estruturado
    if (dadosDistrato.leadMotivoDescarteId && mongoose.Types.ObjectId.isValid(dadosDistrato.leadMotivoDescarteId)) {
      const motivoDoc = await DiscardReason.findOne({ _id: dadosDistrato.leadMotivoDescarteId, company: companyId }).session(session);
      if (motivoDoc) {
        leadDoc.motivoDescarte = motivoDoc._id;
      }
    }

    if (!leadDoc.motivoDescarte) {
      const motivoDistratoDefault = await DiscardReason.findOneAndUpdate(
        { company: companyId, nome: "Distrato Contratual" },
        { $setOnInsert: { nome: "Distrato Contratual", company: companyId, ativo: true, descricao: "Venda cancelada via distrato." } },
        { new: true, upsert: true, runValidators: true, session }
      );
      if (motivoDistratoDefault) leadDoc.motivoDescarte = motivoDistratoDefault._id;
    }

    // Save tudo
    await propostaContrato.reserva.save({ session });
    await leadDoc.save({ session });
    const propostaAtualizada = await propostaContrato.save({ session });

    const leadStatusAntigoNomeDoc = await LeadStage.findById(oldLeadStatusId).select('nome').lean();
    const logDetails = `Distrato registrado. Motivo: ${dadosDistrato.motivoDistrato}. Unidade liberada. Lead movido de "${leadStatusAntigoNomeDoc?.nome || 'N/A'}" para "${situacaoDescartado.nome}".`;

    await logHistory(
      leadDoc._id,
      actorUserId,
      "DISTRATO_REALIZADO",
      logDetails,
      { oldStatusProposta: statusAntigoProposta },
      { newStatusProposta: "Distrato Realizado" },
      'PropostaContrato',
      propostaAtualizada._id,
      session
    );

    await session.commitTransaction();
    console.log(`[PropContSvc Distrato] Distrato para Proposta/Contrato ${propostaAtualizada._id} registrado com sucesso.`);
    return propostaAtualizada;
  } catch (error) {
    await session.abortTransaction();
    console.error("[PropContSvc Distrato] Erro ao registrar distrato:", error);
    throw new Error(error.message || "Erro interno ao registrar o distrato.");
  } finally {
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