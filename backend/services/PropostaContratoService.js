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
 * Cria uma nova Proposta/Contrato a partir de uma Reserva ativa.
 * @param {string} reservaId - ID da Reserva ativa.
 * @param {object} propostaContratoData - Dados específicos da proposta/contrato (valor, condições, parcelas, corretagem, corpoHTML, etc.).
 * @param {string} companyId - ID da Empresa do usuário logado.
 * @param {string} creatingUserId - ID do Usuário do CRM que está criando.
 * @returns {Promise<PropostaContrato>} A Proposta/Contrato criada.
 */
const createPropostaContrato = async (reservaId, propostaContratoData, companyId, creatingUserId) => {
    console.log(`[PropContSvc] Criando Proposta/Contrato da Reserva ${reservaId} usando Modelo ID ${propostaContratoData.modeloContratoUtilizado}`);

    console.log(`[PropContSvc] Iniciando createPropostaContrato.`);
    console.log(`[PropContSvc] Reserva ID: ${reservaId}`);
    // VVVVV LOG IMPORTANTE AQUI VVVVV
    console.log("[PropContSvc] propostaContratoData RECEBIDO PELO SERVIÇO:", JSON.stringify(propostaContratoData, null, 2));
    // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    console.log(`[PropContSvc] Company ID: ${companyId}, Creating User ID: ${creatingUserId}`);

    // Validações básicas
    if (!mongoose.Types.ObjectId.isValid(reservaId) ||
        !mongoose.Types.ObjectId.isValid(companyId) ||
        !mongoose.Types.ObjectId.isValid(creatingUserId)) {
        throw new Error("IDs inválidos fornecidos (Reserva, Empresa ou Usuário Criador).");
    }
    if (!propostaContratoData || typeof propostaContratoData !== 'object') {
        throw new Error("Dados da proposta/contrato são obrigatórios.");
    }
    if (!propostaContratoData.valorPropostaContrato || typeof propostaContratoData.valorPropostaContrato !== 'number') {
        throw new Error("Valor da Proposta/Contrato é obrigatório e deve ser um número.");
    }
     if (!propostaContratoData.responsavelNegociacao || !mongoose.Types.ObjectId.isValid(propostaContratoData.responsavelNegociacao)) {
        throw new Error("Responsável pela Negociação (ID de Usuário válido) é obrigatório.");
    }


    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Buscar a Reserva e seus dados populados
        console.log("[PropContSvc] Buscando Reserva, Lead, Unidade, Empreendimento...");
        const reserva = await Reserva.findOne({ _id: reservaId, company: companyId, statusReserva: "Ativa" })
            .populate('lead')
            .populate('unidade')
            .populate('empreendimento')
            .session(session);

        if (!reserva) {
            throw new Error(`Reserva ativa com ID ${reservaId} não encontrada para esta empresa.`);
        }
        if (!reserva.lead || !reserva.unidade || !reserva.empreendimento) {
            throw new Error("Dados da reserva (Lead, Unidade ou Empreendimento) estão incompletos.");
        }
        console.log("[PropContSvc] Reserva e dados associados encontrados.");

        // 2. Buscar dados da Empresa Vendedora (Company logada)
        const empresaVendedora = await Company.findById(companyId).lean().session(session);
        if (!empresaVendedora) {
            throw new Error("Empresa vendedora não encontrada.");
        }
        console.log("[PropContSvc] Empresa vendedora encontrada.");


        // 3. Buscar o Modelo de Contrato selecionado
        if (!propostaContratoData.modeloContratoUtilizado || !mongoose.Types.ObjectId.isValid(propostaContratoData.modeloContratoUtilizado)) {
            throw new Error("ID do Modelo de Contrato válido é obrigatório.");
        }
        console.log("[PropContSvc] Nenhuma proposta existente para esta reserva.");

        const modeloContrato = await ModeloContrato.findOne({ 
            _id: propostaContratoData.modeloContratoUtilizado, // <<< USE O NOME CORRETO AQUI
            company: companyId, 
            ativo: true 
        }).lean();
        if (!modeloContrato) {
            throw new Error("Modelo de Contrato selecionado não encontrado, inativo ou não pertence a esta empresa.");
        }

        console.log(`[PropContSvc] Modelo de Contrato '${modeloContrato.nomeModelo}' encontrado.`);

        // 4. Montar o objeto de dados para substituir os placeholders no template
        // Este objeto precisa conter todas as chaves que seus placeholders esperam (ex: {{lead_nome}})
        const dadosParaTemplate = {
            // Dados do Vendedor (Empresa do CRM)
            vendedor_nome_fantasia: empresaVendedora.nome,
            vendedor_razao_social: empresaVendedora.razaoSocial || empresaVendedora.nome,
            vendedor_cnpj: empresaVendedora.cnpj, // Adicionar formatação se necessário
            vendedor_endereco_completo: `${empresaVendedora.endereco?.logradouro || ''}, ${empresaVendedora.endereco?.numero || ''} - ${empresaVendedora.endereco?.bairro || ''}, ${empresaVendedora.endereco?.cidade || ''}/${empresaVendedora.endereco?.uf || ''} - CEP: ${empresaVendedora.endereco?.cep || ''}`,
            vendedor_representante_nome: empresaVendedora.representanteLegalNome || '', // Adicionar ao Company Model
            vendedor_representante_cpf: empresaVendedora.representanteLegalCPF || '',   // Adicionar ao Company Model

            // Dados do Comprador (Lead)
            lead_nome: reserva.lead.nome,
            lead_cpf: reserva.lead.cpf || '', // Adicionar formatação se necessário
            lead_rg: reserva.lead.rg || '', // Adicionar 'rg' ao Lead Model
            lead_endereco_completo: reserva.lead.endereco || '',
            lead_estado_civil: reserva.lead.estadoCivil || '', // Adicionar 'estadoCivil' ao Lead Model
            lead_profissao: reserva.lead.profissao || '',     // Adicionar 'profissao' ao Lead Model
            lead_nacionalidade: reserva.lead.nacionalidade || 'Brasileiro(a)', // Adicionar 'nacionalidade' ao Lead Model
            lead_email: reserva.lead.email || '',
            lead_telefone: reserva.lead.contato || '', // Já formatado

            // Dados do Imóvel (Empreendimento e Unidade)
            empreendimento_nome: reserva.empreendimento.nome,
            unidade_identificador: reserva.unidade.identificador,
            unidade_tipologia: reserva.unidade.tipologia,
            unidade_area_privativa: reserva.unidade.areaUtil ? `${reserva.unidade.areaUtil}m²` : '_m²',
            empreendimento_endereco_completo: `${reserva.empreendimento.localizacao?.logradouro || ''}, ${reserva.empreendimento.localizacao?.numero || ''} - ${reserva.empreendimento.localizacao?.bairro || ''}, ${reserva.empreendimento.localizacao?.cidade || ''}/${reserva.empreendimento.localizacao?.uf || ''}`,
            unidade_memorial_incorporacao: reserva.empreendimento.memorialIncorporacao || 'Não Registrado', // Adicionar ao Empreendimento Model
            unidade_matricula: reserva.unidade.matriculaImovel || 'Não Registrado', // Adicionar ao Unidade Model

            // Dados da Transação (da propostaContratoData)
            proposta_valor_total_formatado: `R$ ${propostaContratoData.valorPropostaContrato.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            proposta_valor_entrada_formatado: propostaContratoData.valorEntrada ? `R$ ${propostaContratoData.valorEntrada.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A',
            proposta_condicoes_pagamento_gerais: propostaContratoData.condicoesPagamentoGerais || '',
            
            // Dados Bancários para Pagamento (do propostaContratoData)
            pagamento_banco_nome: propostaContratoData.dadosBancariosParaPagamento?.bancoNome || '_',
            pagamento_agencia: propostaContratoData.dadosBancariosParaPagamento?.agencia || '_',
            pagamento_conta_corrente: propostaContratoData.dadosBancariosParaPagamento?.contaCorrente || '_',
            pagamento_cnpj_favorecido: propostaContratoData.dadosBancariosParaPagamento?.cnpjPagamento || '_',
            pagamento_pix: propostaContratoData.dadosBancariosParaPagamento?.pix || '_',

            // Plano de Pagamento (transformar em uma tabela HTML ou string formatada)
            plano_pagamento_string_formatada: (propostaContratoData.planoDePagamento || [])
                .map(p => `${p.quantidade}x ${p.tipoParcela} de R$ ${p.valorUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (1º Venc: ${new Date(p.vencimentoPrimeira).toLocaleDateString('pt-BR')}) ${p.observacao || ''}`)
                .join('\n'),
            
            // Corretagem
            corretagem_valor_formatado: propostaContratoData.corretagem?.valorCorretagem ? `R$ ${propostaContratoData.corretagem.valorCorretagem.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A',
            // Para corretor_nome, etc., precisaria buscar o BrokerContact
            corretagem_condicoes: propostaContratoData.corretagem?.condicoesPagamentoCorretagem || '_',

            // Outros
            data_proposta_extenso: new Date(propostaContratoData.dataProposta || Date.now()).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' }),
            cidade_contrato: empresaVendedora.endereco?.cidade || '_',
        };

        console.log("[PropContSvc] Corpo do contrato HTML preparado/processado.");

        // Se precisar de dados do BrokerContact, buscar aqui:
        if (propostaContratoData.corretagem?.corretorPrincipal) {
            const BrokerContactModel = mongoose.model('BrokerContact'); // Assumindo que o modelo é 'BrokerContact'
            const corretor = await BrokerContactModel.findById(propostaContratoData.corretagem.corretorPrincipal).lean();
            if (corretor) {
                dadosParaTemplate.corretor_principal_nome = corretor.nome;
                dadosParaTemplate.corretor_principal_cpf_cnpj = corretor.cpfCnpj; // Assumindo campo
                dadosParaTemplate.corretor_principal_creci = corretor.registroProfissional; // Assumindo campo
            }
            console.log(`[PropContSvc] Corretor Principal ${corretor.nome} validado.`);

        }

        // 5
        let corpoContratoProcessado = modeloContrato.conteudoHTMLTemplate;
        for (const key in dadosParaTemplate) {
            const placeholder = `{{${key}}}`;
            // Use uma regex global para substituir todas as ocorrências
            corpoContratoProcessado = corpoContratoProcessado.replace(new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), dadosParaTemplate[key] || '');
        }

        

        //6. Preparar dados para o novo PropostaContrato
        const dadosParaNovaProposta = {
            ...propostaContratoData,
            lead: reserva.lead._id,
            reserva: reserva._id,
            unidade: reserva.unidade._id,
            empreendimento: reserva.empreendimento._id,
            company: companyId,
            createdBy: creatingUserId,
            modeloContratoUtilizado: propostaContratoData.modeloContratoUtilizado,
            corpoContratoHTMLGerado: corpoContratoProcessado, // <<< HTML COM DADOS PREENCHIDOS

            empreendimentoNomeSnapshot: reserva.empreendimento.nome,
            unidadeIdentificadorSnapshot: reserva.unidade.identificador,
            unidadeTipologiaSnapshot: reserva.unidade.tipologia,
            unidadeAreaUtilSnapshot: reserva.unidade.areaUtil,
            precoTabelaUnidadeNoMomento: reserva.unidade.precoTabela,
            
            vendedorNomeFantasia: empresaVendedora.nome,
            vendedorRazaoSocial: empresaVendedora.razaoSocial || empresaVendedora.nome,
            vendedorCnpj: empresaVendedora.cnpj,
            vendedorEndereco: `${empresaVendedora.endereco?.logradouro || ''}, ${empresaVendedora.endereco?.numero || ''} - ${empresaVendedora.endereco?.bairro || ''}, ${empresaVendedora.endereco?.cidade || ''}/${empresaVendedora.endereco?.uf || ''}`,
            vendedorRepresentanteNome: empresaVendedora.representanteLegalNome || null,
            vendedorRepresentanteCpf: empresaVendedora.representanteLegalCPF || null,

            statusPropostaContrato: propostaContratoData.statusPropostaContrato || "Em Elaboração",
            dataProposta: propostaContratoData.dataProposta || new Date(),
        };

       console.log("[PropContSvc DEBUG] Objeto dadosParaNovaProposta montado:", JSON.stringify(dadosParaNovaProposta, null, 2));


        const novaPropostaContrato = new PropostaContrato(dadosParaNovaProposta);
                console.log("[PropContSvc DEBUG] Tentando salvar nova PropostaContrato...");

        const propostaSalva = await novaPropostaContrato.save({ session });
                console.log("[PropContSvc DEBUG] Tentando salvar nova PropostaContrato...");

        // 7. Atualizar Status da Reserva
        console.log(`[PropContSvc] Atualizando Reserva ${reserva._id}...`);
        reserva.statusReserva = "ConvertidaEmProposta";
        reserva.propostaId = propostaSalva._id;
        await reserva.save({ session });

        // 8. Atualizar Status do Lead
        console.log(`[PropContSvc] Atualizando Lead ${reserva.lead._id}...`);

        const nomeEstagioProposta = "Proposta Emitida"; // Ou o nome que você definiu
        let situacaoProposta = await LeadStage.findOne(
            { company: companyId, nome: { $regex: new RegExp(`^${nomeEstagioProposta}$`, "i") } }
        ).session(session).lean(); // Busca primeiro, usando a sessão e .lean() para performance

        if (!situacaoProposta) {
            console.log(`[PropContSvc] Estágio '${nomeEstagioProposta}' não encontrado para Company ${companyId}. Criando...`);
            try {
                const novoEstagioProposta = new LeadStage({
                    nome: nomeEstagioProposta,
                    company: companyId,
                    ativo: true,
                    descricao: "Proposta comercial/contrato gerado para o lead."
                });
                situacaoProposta = await novoEstagioProposta.save({ session });
                console.log(`[PropContSvc] Estágio '${nomeEstagioProposta}' criado com ID: ${situacaoProposta._id}`);
            } catch (creationError) {
                
                console.error(`[PropContSvc] Falha ao tentar criar estágio padrão '${nomeEstagioProposta}':`, creationError);
        
                throw new Error(`Falha ao criar/encontrar estágio de lead '${nomeEstagioProposta}'. ${creationError.message}`);
            }
        }
        
        if (!situacaoProposta || !situacaoProposta._id) { // Checagem extra de segurança
            throw new Error (`Estágio '${nomeEstagioProposta}' não pôde ser encontrado ou criado para a empresa.`);
        }
        
        console.log(`[PropContSvc] Usando Estágio '${nomeEstagioProposta}' (ID: ${situacaoProposta._id}) para o Lead.`);

        const oldLeadStatusId = reserva.lead.situacao; // Supondo que reserva.lead foi populado
        
        if (reserva.lead && typeof reserva.lead.save === 'function') {
             reserva.lead.situacao = situacaoProposta._id;
             await reserva.lead.save({session});
        } else { // Se reserva.lead é um objeto lean, ou para garantir, buscamos e salvamos
            const leadDocParaAtualizar = await Lead.findById(reserva.lead._id || reserva.lead).session(session);
            if(leadDocParaAtualizar){
                leadDocParaAtualizar.situacao = situacaoProposta._id;
                await leadDocParaAtualizar.save({session});
                console.log(`[PropContSvc] Lead ${leadDocParaAtualizar._id} atualizado para status ${situacaoProposta.nome}.`);

            } else {
                throw new Error("Lead da reserva não encontrado para atualização de status.");
            }
        }



        // 9. Atualizar Status da Unidade (opcional, pode manter "Reservada" ou mudar para "Com Proposta")
        reserva.unidade.statusUnidade = "Proposta"; // Exemplo
         await reserva.unidade.save({ session }); 
        // ^^^ Se unidade foi populada e não lean, senão:
        const unidadeDoc = await Unidade.findById(reserva.unidade._id).session(session);
        if (unidadeDoc) {
            unidadeDoc.statusUnidade = "Proposta";
            await unidadeDoc.save({session});
        }


        // 10. Registrar no Histórico do Lead
        const leadStatusAntigoNome = await LeadStage.findById(oldLeadStatusId).select('nome').lean();
        await logHistory(
            reserva.lead._id,
            creatingUserId,
            "PROPOSTA_CONTRATO_CRIADA",
            `Proposta/Contrato (ID: ${propostaSalva._id}) criada para unidade ${reserva.unidade.identificador}. Lead movido de "${leadStatusAntigoNome?.nome || 'N/A'}" para "${situacaoProposta.nome}".`,
            { propostaContratoId: propostaSalva._id, reservaId: reserva._id },
            null, // newValue
            'PropostaContrato', // entityType
            propostaSalva._id,  // entityId
            session
        );
            console.log("[PropContSvc] Histórico registrado.");

        await session.commitTransaction();
        console.log(`[PropContSvc] Proposta/Contrato ${propostaSalva._id} criada com sucesso.`);
        return propostaSalva;

    } catch (error) {
        await session.abortTransaction();
        console.error("[PropContSvc] Erro ao criar Proposta/Contrato:", error);
        // Tratar erro de índice único para reserva._id em PropostaContrato se já existir
        if (error.code === 11000 && error.message.includes("reserva_1")) { // Assumindo que 'reserva' é unique
            throw new Error(`Já existe uma proposta/contrato vinculada a esta reserva.`);
        }
        throw new Error(error.message || "Erro interno ao criar a Proposta/Contrato.");
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
            .populate({ path: 'unidade', select: 'identificador tipologia areaUtil empreendimento', populate: { path: 'empreendimento', select: 'nome localizacao memorialIncorporacao'} })
            .populate({ path: 'empreendimento', select: 'nome localizacao memorialIncorporacao' }) // Pode já vir pelo populate da unidade
            .populate({ path: 'reserva', select: 'dataReserva validadeReserva valorSinal' })
            .populate({ path: 'modeloContratoUtilizado', select: 'nomeModelo tipoDocumento' })
            .populate({ path: 'responsavelNegociacao', select: 'nome email' })
            .populate({ path: 'createdBy', select: 'nome email' })
            .populate({ path: 'corretagem.corretorPrincipal', model: 'BrokerContact', select: 'nome creci cpfCnpj contato email' }) // Populando corretor principal
            .lean(); // Retorna objeto JS puro

        if (!propostaContrato) {
            console.log(`[PropContSvc] Proposta/Contrato ID: ${propostaContratoId} não encontrada para Company: ${companyId}.`);
            return null;
        }
        // Adicionar dados da empresa vendedora explicitamente se não estiverem no snapshot ou se quiser sempre os mais atuais
        if (propostaContrato.company) {
             const empresaVendedora = await Company.findById(propostaContrato.company).select('nome razaoSocial cnpj endereco representanteLegalNome representanteLegalCPF').lean();
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
    
    if (!mongoose.Types.ObjectId.isValid(propostaContratoId) || 
        !mongoose.Types.ObjectId.isValid(companyId) ||
        !mongoose.Types.ObjectId.isValid(actorUserId) ) {
        throw new Error("IDs inválidos fornecidos (Proposta/Contrato, Empresa ou Usuário).");
    }

    // Campos que não devem ser alterados via update genérico
    const NaoAlterar = ['lead', 'reserva', 'unidade', 'empreendimento', 'company', 'createdBy', '_id', 'createdAt', 'updatedAt', '__v', 'modeloContratoUtilizado', 'precoTabelaUnidadeNoMomento'];
    for (const key of NaoAlterar) {
        delete updateData[key];
    }


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

        // Não permitir edição se já estiver "Vendido" ou "Cancelado" (Exemplo de regra de negócio)
        if (["Vendido", "Cancelado"].includes(propostaContrato.statusPropostaContrato)) {
            throw new Error(`Proposta/Contrato com status "${propostaContrato.statusPropostaContrato}" não pode ser editada.`);
        }
        
        // Atualiza os campos
        Object.assign(propostaContrato, updateData);

       
        const propostaAtualizada = await propostaContrato.save({ session });

    
        const oldData = await PropostaContrato.findById(propostaContratoId).lean(); // Pega o estado anterior para o log
        await logHistory(
            propostaAtualizada.lead,
            actorUserId,
            "PROPOSTA_CONTRATO_EDITADA",
            `Proposta/Contrato (ID: ${propostaAtualizada._id}) atualizada.`,
            { oldData: oldData }, // Salvar o objeto antigo pode ser muito grande, talvez campos específicos
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
            leadStatusNomeAlvo = "Contrato Assinado"; // Ou o nome do seu estágio
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

module.exports = {
    createPropostaContrato,
    preencherTemplateContrato,
    getPropostaContratoById,
    gerarPDFPropostaContrato,
    updatePropostaContrato,
    updateStatusPropostaContrato,
    registrarDistratoPropostaContrato
};