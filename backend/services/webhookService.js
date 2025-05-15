// services/webhookService.js
const LeadService = require('./LeadService');
const Company = require('../models/Company');
const User = require('../models/User');
const Origem = require('../models/origem');
const mongoose = require('mongoose'); 

/**
 * Processa o payload de um webhook de leadgen do Facebook,
 * verificando se o lead veio de um formulário vinculado pela empresa.
 * @param {object} leadPayloadValue - O objeto 'value' do webhook (contém leadgen_id, form_id, field_data, page_id).
 * @param {string} companyId - O ID da empresa CRM para associar o lead (já identificado pelo controller).
 */
const processFacebookLead = async (leadPayloadValue, companyId) => {
    console.log(`[WebhookSvc FBLead] Iniciando processamento de lead para Empresa ${companyId}`);
    if (!leadPayloadValue || !Array.isArray(leadPayloadValue.field_data) || !leadPayloadValue.form_id) {
        console.error("[WebhookSvc FBLead] Payload inválido, sem field_data ou form_id.");
        throw new Error("Payload de lead inválido do Facebook.");
    }
    if (!companyId) {
         console.error("[WebhookSvc FBLead] Company ID não fornecido.");
        throw new Error("Empresa não identificada para processar o lead.");
    }

    const formIdFromWebhook = String(leadPayloadValue.form_id); // Garante que é string

    // 1. Buscar a empresa e seus formulários vinculados
    const company = await Company.findById(companyId).select('nome linkedFacebookForms').lean();
    if (!company) {
        console.error(`[WebhookSvc FBLead] Empresa ${companyId} não encontrada no banco.`);
        throw new Error(`Empresa ${companyId} não encontrada.`);
    }

    // 2. Verificar se o form_id do lead recebido está na lista de formulários vinculados
    // Se a lista linkedFacebookForms existir e tiver itens, então SÓ processa se o form_id estiver lá.
    // Se a lista linkedFacebookForms NÃO existir ou estiver VAZIA, processa TODOS os leads (fallback).
    if (company.linkedFacebookForms && company.linkedFacebookForms.length > 0) {
        const isFormLinked = company.linkedFacebookForms.some(
            (linkedForm) => linkedForm.formId === formIdFromWebhook
        );
        if (!isFormLinked) {
            console.log(`[WebhookSvc FBLead] Lead do formulário ID ${formIdFromWebhook} ignorado para Empresa ${company.nome} (ID: ${companyId}) pois não está na lista de formulários vinculados.`);
            return null; // Retorna null ou uma mensagem indicando que foi pulado
        }
        console.log(`[WebhookSvc FBLead] Formulário ID ${formIdFromWebhook} está vinculado. Processando lead.`);
    } else {
        console.log(`[WebhookSvc FBLead] Nenhum formulário específico vinculado para Empresa ${company.nome} (ID: ${companyId}). Processando lead do formulário ${formIdFromWebhook} (comportamento padrão).`);
    }

    // 3. Extrair dados e criar o Lead (lógica como antes)
    const fields = {};
    for (const field of leadPayloadValue.field_data) {
        if (['full_name', 'nome_completo', 'name'].includes(field.name)) fields.nome = field.values[0];
        if (field.name === 'email') fields.email = field.values[0];
        if (['phone_number', 'telefone', 'contato'].includes(field.name)) fields.contato = field.values[0];
        if (['cpf_number', 'cpf'].includes(field.name)) fields.cpf = field.values[0];
    }
    console.log("[WebhookSvc FBLead] Dados extraídos do lead:", fields);
    if (!fields.nome || !fields.contato) { throw new Error("Dados insuficientes (nome/contato) no lead recebido."); }

    try {
        let formattedPhone;
        try {
            const phoneNumber = phoneUtil.parseAndKeepRawInput(fields.contato, 'BR');
            if (phoneUtil.isValidNumber(phoneNumber)) {
                formattedPhone = phoneUtil.format(phoneNumber, PNF.E164);
            } else { throw new Error('Número de telefone do lead inválido.'); }
        } catch (e) { throw new Error(`Erro ao formatar telefone do lead: ${fields.contato}. ${e.message}`); }

        // Verificar duplicidade pelo telefone formatado
        const existingLead = await Lead.findOne({ contato: formattedPhone, company: companyId }).lean();
        if (existingLead) {
            console.log(`[WebhookSvc FBLead] Lead duplicado (telefone ${formattedPhone}) para ${fields.nome}. Não será criado.`);
            return { message: "Lead duplicado, não importado.", lead: existingLead };
        }

        // Buscar/Criar Origem "Facebook Ads"
        const defaultOriginName = "Facebook Ads";
        let crmOrigin = await Origem.findOneAndUpdate(
            { company: companyId, nome: { $regex: new RegExp(`^${defaultOriginName}$`, 'i') } },
            { $setOnInsert: { nome: defaultOriginName, company: companyId, ativo: true, descricao: "Leads recebidos via Facebook Lead Ads." } },
            { new: true, upsert: true, runValidators: true }
        ).lean();
        if (!crmOrigin) throw new Error("Falha ao obter/criar origem 'Facebook Ads'.");

        // Encontrar um Responsável Padrão
        const defaultResponsible = await User.findOne({ company: companyId, perfil: 'admin', ativo: true }).lean();
        
        const leadData = {
            nome: fields.nome,
            contato: formattedPhone,
            email: fields.email || null,
            cpf: fields.cpf || null, // Se existir, usa; senão, null.
            origem: crmOrigin._id,
            responsavel: defaultResponsible?._id || null,
            // Comentário pode incluir o form_id e leadgen_id para referência
            comentario: `Lead do Facebook. PageID: ${leadPayloadValue.page_id}, FormID: ${formIdFromWebhook}, LeadgenID: ${leadPayloadValue.leadgen_id}`
        };

        const newLead = await LeadService.createLead(leadData, companyId, null); // null como userId (criador) pois veio do sistema
        console.log(`[WebhookSvc FBLead] Lead criado com sucesso via webhook: ${newLead._id}`);
        return newLead;

    } catch (error) {
        console.error(`[WebhookSvc FBLead] Erro ao processar/criar lead do webhook para ${companyId}:`, error);
        throw error; // Repassa o erro para o controller (que ainda responderá 200 OK ao FB)
    }
};


// Mantenha o module.exports
module.exports = { processFacebookLead };