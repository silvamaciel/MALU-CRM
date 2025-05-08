// services/webhookService.js
const LeadService = require('./LeadService');
const Company = require('../models/Company');
const User = require('../models/User');
const Origem = require('../models/origem');
const mongoose = require('mongoose'); 

/**
 * Processa o payload de um webhook de leadgen do Facebook.
 * @param {object} leadDataPayload - O objeto 'value' do webhook (contém field_data).
 * @param {string} companyId - O ID da empresa CRM para associar o lead.
 */
const processFacebookLead = async (leadDataPayload, companyId) => {
    console.log(`[WebhookSvc] Processando lead para Empresa ${companyId}`);
    if (!leadDataPayload || !Array.isArray(leadDataPayload.field_data)) {
        throw new Error("Payload de lead inválido.");
    }
    if (!companyId) { throw new Error("Empresa não identificada."); }

    const fields = {};
    for (const field of leadDataPayload.field_data) {
        if (['full_name', 'nome_completo', 'name'].includes(field.name)) fields.nome = field.values[0];
        if (field.name === 'email') fields.email = field.values[0];
        if (['phone_number', 'telefone', 'contato'].includes(field.name)) fields.contato = field.values[0];
        if (['cpf_number', 'cpf'].includes(field.name)) fields.cpf = field.values[0];
    }
    console.log("[WebhookSvc] Dados extraídos:", fields);
    if (!fields.nome || !fields.contato) { throw new Error("Dados insuficientes (nome/contato) no lead recebido."); }

    try {
        const origemNomePadrao = "Facebook Ads";
        let facebookOrigin = null;
        try {
             facebookOrigin = await Origem.findOneAndUpdate(
                {
                    company: companyId,
                    nome: { $regex: new RegExp(`^<span class="math-inline">\{origemNomePadrao\}</span>`, 'i') } // Busca case-insensitive
                },
                {
                    $setOnInsert: {
                        nome: origemNomePadrao, 
                        company: companyId,
                        ativo: true,
                        descricao: "Origem automática via integração Facebook Lead Ads"
                    }
                },
                {
                    new: true, 
                    upsert: true,
                    runValidators: true 
                }
            );
            console.log(`[WebhookSvc] Origem '${origemNomePadrao}' encontrada ou criada para ${companyId}: ${facebookOrigin._id}`);
            fields.origem = facebookOrigin._id; 

        } catch (originError) {
             console.error(`[WebhookSvc] Falha ao buscar/criar origem '${origemNomePadrao}' para ${companyId}:`, originError);
             fields.origem = null;
            
        }
        // <<< FIM LÓGICA ORIGEM >>>


        // Encontrar um Responsável Padrão (igual antes)
        const defaultResponsible = await User.findOne({ company: companyId, perfil: 'admin', ativo: true }).lean();
        fields.responsavel = defaultResponsible?._id || null;
        if (!fields.responsavel) { console.warn(`[WebhookSvc] Nenhum responsável padrão encontrado para ${companyId}.`); }

        // Situação padrão será definida pelo createLead

        console.log(`[WebhookSvc] Chamando createLead para empresa ${companyId} com dados finais:`, fields);
        const newLead = await LeadService.createLead(fields, companyId, null); // null como userId
        console.log(`[WebhookSvc] Lead criado com sucesso via webhook: ${newLead._id}`);
        return newLead;

    } catch (error) {
        console.error(`[WebhookSvc] Erro ao processar/criar lead do webhook para ${companyId}:`, error);
        throw error; // Repassa o erro
    }
};

// Mantenha o module.exports
module.exports = { processFacebookLead };