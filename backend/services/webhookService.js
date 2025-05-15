// services/webhookService.js
const LeadService = require('./LeadService');
const Company = require('../models/Company');
const User = require('../models/User');
const Origem = require('../models/origem');
const mongoose = require('mongoose'); 

/**
 * Processa o payload de um webhook de leadgen do Facebook,
 * verificando se o lead veio de um formulário vinculado pela empresa.
 * Adiciona campos extras ao comentário do lead.
 * @param {object} leadPayloadValue - O objeto 'value' do webhook (contém leadgen_id, form_id, field_data, page_id).
 * @param {string} companyId - O ID da empresa CRM para associar o lead (já identificado pelo controller).
 */
const processFacebookLead = async (leadPayloadValue, companyId) => {
    console.log(`[WebhookSvc FBLead] Iniciando processamento de lead para Empresa ${companyId}`);

    // === [1] Validações Iniciais ===
    if (!leadPayloadValue || !Array.isArray(leadPayloadValue.field_data) || !leadPayloadValue.form_id) {
        console.error("[WebhookSvc FBLead] Payload inválido, sem field_data ou form_id.");
        throw new Error("Payload de lead inválido do Facebook.");
    }

    if (!companyId) {
        console.error("[WebhookSvc FBLead] Company ID não fornecido.");
        throw new Error("Empresa não identificada para processar o lead.");
    }

    const formIdFromWebhook = String(leadPayloadValue.form_id); // Garantia defensiva

    // === [2] Buscar Empresa e Verificar Formulário ===
    const company = await Company.findById(companyId).select('nome linkedFacebookForms').lean();
    if (!company) {
        console.error(`[WebhookSvc FBLead] Empresa ${companyId} não encontrada no banco.`);
        throw new Error(`Empresa ${companyId} não encontrada.`);
    }

    if (company.linkedFacebookForms && company.linkedFacebookForms.length > 0) {
        const isFormLinked = company.linkedFacebookForms.some(lf => lf.formId === formIdFromWebhook);
        if (!isFormLinked) {
            console.log(`[WebhookSvc FBLead] Lead do form ID ${formIdFromWebhook} ignorado para ${company.nome} (não vinculado).`);
            return null;
        }
        console.log(`[WebhookSvc FBLead] Form ID ${formIdFromWebhook} vinculado. Processando.`);
    } else {
        console.log(`[WebhookSvc FBLead] Nenhum form específico vinculado para ${company.nome}. Processando lead do form ${formIdFromWebhook}.`);
    }

    // === [3] Extração de Dados do Payload ===
    const leadDataFromForm = {};
    const extraFieldsForComment = [];
    const camposPrincipaisConhecidos = [
        'full_name', 'nome_completo', 'first_name', 'last_name', 'name',
        'email',
        'phone_number', 'telefone', 'contato',
        'cpf_number', 'cpf'
    ];

    for (const field of leadPayloadValue.field_data) {
        const fieldNameLower = field.name.toLowerCase();
        const fieldValue = field.values?.[0]?.trim() || null;

        if (!fieldValue) continue;

        if (['full_name', 'nome_completo', 'name'].includes(fieldNameLower) && !leadDataFromForm.nome) {
            leadDataFromForm.nome = fieldValue;
        } else if (fieldNameLower === 'first_name' && !leadDataFromForm.nome) {
            leadDataFromForm.nome = fieldValue;
        } else if (fieldNameLower === 'last_name' && leadDataFromForm.nome && !leadDataFromForm.nome.includes(fieldValue)) {
            leadDataFromForm.nome += ` ${fieldValue}`;
        } else if (fieldNameLower === 'email' && !leadDataFromForm.email) {
            leadDataFromForm.email = fieldValue;
        } else if (['phone_number', 'telefone', 'contato'].includes(fieldNameLower) && !leadDataFromForm.contato) {
            leadDataFromForm.contato = fieldValue;
        } else if (['cpf_number', 'cpf'].includes(fieldNameLower) && !leadDataFromForm.cpf) {
            leadDataFromForm.cpf = fieldValue;
        } else if (!camposPrincipaisConhecidos.includes(fieldNameLower)) {
            extraFieldsForComment.push(`${field.name}: ${fieldValue}`);
        }
    }

    if (!leadDataFromForm.nome || !leadDataFromForm.contato) {
        throw new Error("Dados essenciais (nome/contato) não encontrados no payload do formulário.");
    }

    console.log("[WebhookSvc FBLead] Dados principais extraídos:", leadDataFromForm);
    console.log("[WebhookSvc FBLead] Campos extras para comentário:", extraFieldsForComment);

    // === [4] Formatar Telefone e Verificar Duplicidade ===
    let formattedPhone;
    try {
        const phoneNumber = phoneUtil.parseAndKeepRawInput(leadDataFromForm.contato, 'BR');
        if (phoneUtil.isValidNumber(phoneNumber)) {
            formattedPhone = phoneUtil.format(phoneNumber, PNF.E164);
        } else {
            throw new Error('Número de telefone do lead inválido.');
        }
    } catch (e) {
        throw new Error(`Erro ao formatar telefone do lead: ${leadDataFromForm.contato}. ${e.message}`);
    }

    const existingLead = await Lead.findOne({ contato: formattedPhone, company: companyId }).lean();
    if (existingLead) {
        console.log(`[WebhookSvc FBLead] Lead duplicado (telefone ${formattedPhone}) para ${leadDataFromForm.nome}. Não será criado.`);
        return { message: "Lead duplicado, não importado.", lead: existingLead };
    }

    // === [5] Obter/Criar Origem e Responsável ===
    const defaultOriginName = "Facebook Ads";
    let crmOrigin = await Origem.findOneAndUpdate(
        { company: companyId, nome: { $regex: new RegExp(`^${defaultOriginName}$`, 'i') } },
        { $setOnInsert: { nome: defaultOriginName, company: companyId, ativo: true, descricao: "Leads recebidos via Facebook Lead Ads." } },
        { new: true, upsert: true, runValidators: true }
    ).lean();
    if (!crmOrigin) {
        throw new Error("Falha ao obter/criar origem 'Facebook Ads'.");
    }

    const defaultResponsible = await User.findOne({ company: companyId, perfil: 'admin', ativo: true }).lean();

    // === [6] Montar Lead e Criar ===
    let comentarioFinal = `Lead do Facebook. PageID: ${leadPayloadValue.page_id}, FormID: ${formIdFromWebhook}, LeadgenID: ${leadPayloadValue.leadgen_id}`;
    if (extraFieldsForComment.length > 0) {
        comentarioFinal += "\n\nCampos Adicionais do Formulário:\n" + extraFieldsForComment.join("\n");
    }

    const leadParaSalvar = {
        nome: leadDataFromForm.nome,
        contato: formattedPhone,
        email: leadDataFromForm.email || null,
        cpf: leadDataFromForm.cpf || null,
        origem: crmOrigin._id,
        responsavel: defaultResponsible?._id || null,
        comentario: comentarioFinal.trim()
    };

    try {
        const newLead = await LeadService.createLead(leadParaSalvar, companyId, null);
        console.log(`[WebhookSvc FBLead] Lead criado com sucesso via webhook: ${newLead._id}`);
        return newLead;
    } catch (createError) {
        console.error(`[WebhookSvc FBLead] Erro final ao criar Lead para ${leadDataFromForm.nome}:`, createError);
        throw createError;
    }
};



module.exports = { processFacebookLead };