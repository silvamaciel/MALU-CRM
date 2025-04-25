// services/LeadService.js

const mongoose = require("mongoose");
const Lead = require("../models/Lead");
const Origem = require("../models/Origem"); // <<< Assumindo nome de arquivo Origem.js >>>
const LeadStage = require("../models/LeadStage");
const User = require("../models/User");
const DiscardReason = require('../models/DiscardReason'); // Necessário para descartarLead
const LeadHistory = require('../models/LeadHistory'); // Necessário para logHistory
const cpfcnpj = require("cpf-cnpj-validator");
const { PhoneNumberUtil, PhoneNumberFormat: PNF } = require('google-libphonenumber');
const phoneUtil = PhoneNumberUtil.getInstance();

const logHistory = async (leadId, userId, action, details) => {
    try {
        if (!leadId) {
             console.warn("[History] Tentativa de log sem leadId.");
             return;
        }
        const historyEntry = new LeadHistory({
            lead: leadId,
            user: userId || null, // Usa null se userId não for passado
            action: action,
            details: details || '',
        });
        await historyEntry.save();
        console.log(`[History] Logged: Lead ${leadId}, Action: ${action}, User: ${userId || 'System'}`);
    } catch (error) {
        console.error(`[History] FAILED to log: Lead ${leadId}, Action: ${action}`, error);
    }
};

const getLeads = async (queryParams = {}, companyId) => {
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
         throw new Error('ID da empresa inválido ou não fornecido para buscar leads.');
    }
    try {
        console.log(`[getLeads] Empresa: ${companyId}, Query Params:`, queryParams);
        let page = parseInt(queryParams.page, 10) || 1;
        let limit = parseInt(queryParams.limit, 10) || 10;
        limit = Math.min(Math.max(1, limit), 100);
        page = Math.max(1, page);
        const skip = (page - 1) * limit;

        const queryConditions = { company: companyId }; 
        const filters = queryParams;

        if (filters.nome) queryConditions.nome = { $regex: filters.nome, $options: 'i' };
        if (filters.email) queryConditions.email = { $regex: filters.email, $options: 'i' };
        if (filters.situacao && mongoose.Types.ObjectId.isValid(filters.situacao)) queryConditions.situacao = filters.situacao;
        if (filters.origem && mongoose.Types.ObjectId.isValid(filters.origem)) queryConditions.origem = filters.origem;
        if (filters.responsavel && mongoose.Types.ObjectId.isValid(filters.responsavel)) queryConditions.responsavel = filters.responsavel;

        const dateQuery = {};
        if (filters.dataInicio) { try { const d = new Date(filters.dataInicio); d.setUTCHours(0,0,0,0); if(!isNaN(d)) dateQuery.$gte = d; } catch(e){} }
        if (filters.dataFim) { try { const d = new Date(filters.dataFim); d.setUTCHours(23,59,59,999); if(!isNaN(d)) dateQuery.$lte = d; } catch(e){} }
        if (Object.keys(dateQuery).length > 0) queryConditions.createdAt = dateQuery;

        console.log("[getLeads] Condições Query MongoDB:", JSON.stringify(queryConditions, null, 2));

        const [totalLeads, leads] = await Promise.all([
            Lead.countDocuments(queryConditions), 
            Lead.find(queryConditions)          
                .populate("situacao", "nome ordem")
                .populate("origem", "nome")
                .populate("responsavel", "nome perfil")
                .populate("motivoDescarte", "nome")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
        ]);

        const totalPages = Math.ceil(totalLeads / limit);
        console.log(`[getLeads] Empresa ${companyId}: ${leads.length}/${totalLeads} leads (Pág ${page}/${totalPages})`);
        return { leads, totalLeads, currentPage: page, totalPages, limit };

    } catch (err) {
        console.error(`[getLeads] Erro para empresa ${companyId}:`, err);
        throw new Error("Erro ao buscar os leads.");
    }
};


const getLeadById = async (id, companyId) => {
    if (!mongoose.Types.ObjectId.isValid(id)) { throw new Error("ID de Lead inválido."); }
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) { throw new Error('ID da empresa inválido.'); }

    try {
        const lead = await Lead.findOne({ _id: id, company: companyId })
            .populate("situacao", "nome ordem")
            .populate("origem", "nome")
            .populate("responsavel", "nome perfil")
            .populate("motivoDescarte", "nome");

        if (!lead) throw new Error("Lead não encontrado nesta empresa.");
        return lead;
    } catch(error) {
        console.error(`[getLeadById] Erro para lead ${id} / empresa ${companyId}:`, error);
        throw new Error("Erro ao buscar detalhes do lead.");
    }
};


const createLead = async (leadData, companyId, userId) => {
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) { throw new Error('ID da Empresa inválido.'); }
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) { throw new Error('ID do Usuário inválido.'); }

    const {
        nome, contato,
        email, nascimento, endereco, cpf,
        situacao, 
        origem,   
        responsavel,
        comentario
    } = leadData;

    // 1. Validação Campos Mínimos
    if (!nome || !contato) { throw new Error("Nome e Contato são obrigatórios."); }

    // 2. Validação/Formatação Contato
    let formattedPhoneNumber = null;
    try {
        const phoneNumber = phoneUtil.parseAndKeepRawInput(contato, 'BR');
        if (phoneUtil.isValidNumber(phoneNumber)) { formattedPhoneNumber = phoneUtil.format(phoneNumber, PNF.E164); }
        else { throw new Error(`Número de contato inválido: ${contato}`); }
    } catch (e) { throw new Error(`Formato de contato não reconhecido: ${contato}`); }

    // 3. Validação CPF (se fornecido)
    let cpfLimpo = null;
    if (cpf) {
        cpfLimpo = cpf.replace(/\D/g, '');
        if (!cpfcnpj.cpf.isValid(cpfLimpo)) { throw new Error(`CPF inválido: ${cpf}`); }
    }

    // --- 4. Determinar/Validar IDs de Referência ---
    let situacaoIdFinal = null;
    let origemIdFinal = null;
    let responsavelIdFinal = null;

    // Responsável: Usa o fornecido (se válido e da mesma empresa) ou o usuário logado
    if (responsavel && mongoose.Types.ObjectId.isValid(responsavel)) {
        const responsavelDoc = await User.findOne({ _id: responsavel, company: companyId }).lean(); // <<< Valida na empresa
        if (!responsavelDoc) throw new Error(`Responsável fornecido (ID: ${responsavel}) inválido ou não pertence a esta empresa.`);
        responsavelIdFinal = responsavelDoc._id;
        console.log(`[createLead] Usando Responsável fornecido: ${responsavelIdFinal}`);
    } else {
        // Se não veio ou inválido, usa o usuário logado
        const currentUser = await User.findById(userId).lean(); // Usuário logado já deve ser da empresa
        if (!currentUser) throw new Error("Usuário logado não encontrado."); // Segurança
        responsavelIdFinal = currentUser._id;
        console.log(`[createLead] Usando Responsável padrão (usuário logado): ${responsavelIdFinal}`);
    }

    // Situação: Usa a fornecida (se válida e da mesma empresa) ou busca a primeira por ordem da empresa
    if (situacao && mongoose.Types.ObjectId.isValid(situacao)) {
        const situacaoDoc = await LeadStage.findOne({ _id: situacao, company: companyId }).lean(); // <<< Valida na empresa
        if (!situacaoDoc) throw new Error(`Situação fornecida (ID: ${situacao}) inválida ou não pertence a esta empresa.`);
        situacaoIdFinal = situacaoDoc._id;
        console.log(`[createLead] Usando Situação fornecida: ${situacaoIdFinal}`);
    } else {
        const situacaoDefault = await LeadStage.findOne({ company: companyId, nome: { $ne: "Descartado" } }) // <<< Busca na empresa
                                           .sort({ ordem: 1 }).lean();
        if (!situacaoDefault) throw new Error(`Nenhuma situação padrão ativa encontrada para a empresa ${companyId}. Cadastre uma situação.`);
        situacaoIdFinal = situacaoDefault._id;
        console.log(`[createLead] Usando Situação padrão: ${situacaoIdFinal} (${situacaoDefault.nome})`);
    }

    // Origem: Usa a fornecida (se válida e da mesma empresa) ou null
    if (origem && mongoose.Types.ObjectId.isValid(origem)) {
        const origemDoc = await Origem.findOne({ _id: origem, company: companyId }).lean(); // <<< Valida na empresa
        if (!origemDoc) throw new Error(`Origem fornecida (ID: ${origem}) inválida ou não pertence a esta empresa.`);
        origemIdFinal = origemDoc._id;
        console.log(`[createLead] Usando Origem fornecida: ${origemIdFinal}`);
    } else {
        origemIdFinal = null; // Campo é opcional
        console.log(`[createLead] Origem não fornecida ou inválida, usando null.`);
    }

    // --- 5. Criação do Novo Lead ---
    const novoLead = new Lead({
        nome: nome.trim(), // Adiciona trim
        contato: formattedPhoneNumber,
        email: email ? email.trim().toLowerCase() : null,
        nascimento: nascimento || null,
        endereco: endereco || null,
        cpf: cpfLimpo,
        situacao: situacaoIdFinal,
        motivoDescarte: null,
        comentario: comentario || null,
        origem: origemIdFinal,
        responsavel: responsavelIdFinal,
        company: companyId 
    });

    // --- 6. Salvar ---
    try {
        const leadSalvo = await novoLead.save();
        console.log("[createLead] Lead salvo com sucesso:", leadSalvo._id);
        await logHistory(leadSalvo._id, userId, 'CRIACAO', 'Lead criado.'); 
        return leadSalvo;
    } catch (error) {
        console.error("[createLead] Erro ao salvar lead:", error);
        throw new Error(error.message || "Erro interno ao salvar lead.");
    }
};



const updateLead = async (id, leadData, companyId, userId) => {
    console.log(`[updateLead] ID: ${id}, Empresa: ${companyId}, User: ${userId}`);
    console.log("[updateLead] leadData:", JSON.stringify(leadData, null, 2));

    if (!mongoose.Types.ObjectId.isValid(id)) { throw new Error("ID de Lead inválido."); }
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) { throw new Error('ID da empresa inválido.'); }
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) { throw new Error('ID do usuário inválido.'); }

    const {
        nome, contato, email, nascimento, endereco, cpf,
        responsavel, situacao, motivoDescarte,
        comentario, origem
    } = leadData;

    const updateFields = {};

    // Campos simples
    if (nome !== undefined) updateFields.nome = nome.trim();
    if (email !== undefined) updateFields.email = email ? email.trim().toLowerCase() : null;
    if (nascimento !== undefined) updateFields.nascimento = nascimento || null;
    if (endereco !== undefined) updateFields.endereco = endereco;
    if (comentario !== undefined) updateFields.comentario = comentario;

    // Contato (com validação/formatação)
    if (contato !== undefined) {
        if (contato === null || String(contato).trim() === '') { updateFields.contato = null; }
        else {
            try {
                const phoneNumber = phoneUtil.parseAndKeepRawInput(contato, 'BR');
                if (phoneUtil.isValidNumber(phoneNumber)) { updateFields.contato = phoneUtil.format(phoneNumber, PNF.E164); }
                else { throw new Error(`Número de contato inválido: ${contato}`); }
            } catch (e) { throw new Error(`Formato de contato não reconhecido: ${contato}`); }
        }
    }

    // CPF (com validação)
    if (cpf !== undefined) {
        if (cpf === null || cpf === '') { updateFields.cpf = null; }
        else {
            const cpfLimpo = cpf.replace(/\D/g, '');
            if (!cpfcnpj.cpf.isValid(cpfLimpo)) { throw new Error(`CPF inválido: ${cpf}`); }
            updateFields.cpf = cpfLimpo;
        }
    }

    try {
        if (situacao !== undefined) {
            if (!mongoose.Types.ObjectId.isValid(situacao)) throw new Error("ID Situação inválido.");
            const situacaoDoc = await LeadStage.findOne({ _id: situacao, company: companyId });
            if (!situacaoDoc) throw new Error("Situação inválida ou não pertence a esta empresa.");
            updateFields.situacao = situacaoDoc._id;
            console.log(`[updateLead] Nova situação: ${situacaoDoc.nome}`);

            if (situacaoDoc.nome !== "Descartado") { // <-- Nome Exato!
                console.log("[updateLead] Limpando campos de descarte.");
                updateFields.motivoDescarte = null;
                updateFields.comentario = comentario === undefined ? null : comentario;
            } else {
                if (motivoDescarte !== undefined) {
                    if (!motivoDescarte || !mongoose.Types.ObjectId.isValid(motivoDescarte)) throw new Error("ID de Motivo de Descarte inválido.");
                    const reasonExists = await DiscardReason.findById(motivoDescarte).lean(); 
                    if (!reasonExists) throw new Error(`Motivo de Descarte ID ${motivoDescarte} inválido.`);
                    updateFields.motivoDescarte = reasonExists._id; 
                } else {
                     throw new Error("Motivo do descarte é obrigatório ao mover para 'Descartado'.");
                }
                if (comentario !== undefined) updateFields.comentario = comentario;
            }
        } else {
           
            if (motivoDescarte !== undefined) {
                 if (!motivoDescarte || !mongoose.Types.ObjectId.isValid(motivoDescarte)) throw new Error("ID de Motivo de Descarte inválido.");
                 const reasonExists = await DiscardReason.findById(motivoDescarte).lean();
                 if (!reasonExists) throw new Error(`Motivo de Descarte ID ${motivoDescarte} inválido.`);
                 updateFields.motivoDescarte = reasonExists._id;
            }
             if (comentario !== undefined) updateFields.comentario = comentario;
        }

        // Origem
        if (origem !== undefined) {
            if (!mongoose.Types.ObjectId.isValid(origem)) throw new Error("ID Origem inválido.");
            const origemDoc = await Origem.findOne({ _id: origem, company: companyId }).lean(); // <<< Valida na empresa
            if (!origemDoc) throw new Error("Origem inválida ou não pertence a esta empresa.");
            updateFields.origem = origemDoc._id;
            console.log(`[updateLead] OK - Add origem=${updateFields.origem}`);
        }

        // Responsável
        if (responsavel !== undefined) {
            if (!mongoose.Types.ObjectId.isValid(responsavel)) throw new Error("ID Responsável inválido.");
            const responsavelDoc = await User.findOne({ _id: responsavel, company: companyId }).lean(); // <<< Valida na empresa
            if (!responsavelDoc) throw new Error("Responsável inválido ou não pertence a esta empresa.");
            updateFields.responsavel = responsavelDoc._id;
            console.log(`[updateLead] OK - Add responsavel=${updateFields.responsavel}`);
        }

    } catch (validationError) { throw validationError; }

    // Executa Update
    if (Object.keys(updateFields).length === 0) {
        console.warn(`[updateLead] Nenhum campo para atualizar ID: ${id}`);
        return await getLeadById(id, companyId); // Passa companyId
    }

    console.log("[updateLead] Final updateFields:", JSON.stringify(updateFields, null, 2));
    try {
        const updatedLead = await Lead.findOneAndUpdate(
            { _id: id, company: companyId }, 
            { new: true, runValidators: true }
        );
        if (!updatedLead) { throw new Error("Lead não encontrado nesta empresa (update falhou)."); }
        console.log("[updateLead] Raw updated doc:", JSON.stringify(updatedLead, null, 2));

        // Re-populate
        await updatedLead.populate([
            { path: "situacao", select: "nome ordem" },
            { path: "origem", select: "nome" },
            { path: "responsavel", select: "nome perfil" },
            { path: "motivoDescarte", select: "nome" } // Popula motivo descarte (ID)
        ]);

        // Log Histórico
        const changedFields = Object.keys(updateFields).join(', ');
        let actionType = 'ATUALIZACAO';
        // Lógica para detectar reativação (pode ser aprimorada)
        if (updateFields.situacao && updateFields.motivoDescarte === null && updateFields.comentario === null) {
            const situacaoDoc = await LeadStage.findById(updateFields.situacao).lean();
            if (situacaoDoc && situacaoDoc.nome !== "Descartado") {
                actionType = 'REATIVACAO';
                await logHistory(updatedLead._id, userId, actionType, `Lead reativado para "${situacaoDoc.nome}".`);
            }
        }
        if (actionType === 'ATUALIZACAO') {
            await logHistory(updatedLead._id, userId, actionType, `Campos alterados: ${changedFields}`);
        }

        return updatedLead;

    } catch (error) {
        console.error("[updateLead] Erro durante update:", error);
        throw new Error(error.message || "Erro interno ao atualizar.");
    }
};



const deleteLead = async (id, companyId, userId) => {
    if (!mongoose.Types.ObjectId.isValid(id)) { throw new Error("ID inválido."); }
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) { throw new Error('ID da empresa inválido.'); }
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) { throw new Error('ID do usuário inválido.'); }

    try {
        const deleted = await Lead.findOneAndDelete({ _id: id, company: companyId });
        if (!deleted) throw new Error("Lead não encontrado nesta empresa.");

        console.log(`[deleteLead] Lead ${id} da empresa ${companyId} excluído por usuário ${userId}`);
        
        await logHistory(id, userId, 'EXCLUSAO', `Lead ${deleted.nome} excluído.`);

        return { message: "Lead deletado com sucesso" };
    } catch (error) {
        console.error(`[deleteLead] Erro para lead ${id} / empresa ${companyId}:`, error);
        throw new Error("Erro ao excluir lead.");
    }
};


const descartarLead = async (id, dados, companyId, userId) => {
     if (!mongoose.Types.ObjectId.isValid(id)) { throw new Error("ID de Lead inválido."); }
     if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) { throw new Error('ID da empresa inválido.'); }
     if (!userId || !mongoose.Types.ObjectId.isValid(userId)) { throw new Error('ID do usuário inválido.'); }

     const { motivoDescarte, comentario } = dados; 

     if (!motivoDescarte || !mongoose.Types.ObjectId.isValid(motivoDescarte)) {
       throw new Error("ID do motivo de descarte inválido ou não fornecido.");
     }

     const [reasonExists, situacaoDescartado] = await Promise.all([
        DiscardReason.findById(motivoDescarte).lean(),
        LeadStage.findOne({ nome: "Descartado", company: companyId }).lean()
     ]).catch(err => { throw new Error("Erro ao buscar referências para descarte."); });

     if (!reasonExists) throw new Error(`Motivo de descarte ID ${motivoDescarte} não encontrado.`);
     if (!situacaoDescartado) throw new Error(`Configuração: Situação 'Descartado' não encontrada para a empresa ${companyId}.`);

     const lead = await Lead.findOneAndUpdate(
        { _id: id, company: companyId }, 
        {
          situacao: situacaoDescartado._id,
          motivoDescarte: reasonExists._id,
          comentario: comentario || null,
        },
        { new: true }
     ).populate("situacao", "nome").populate("motivoDescarte", "nome");

     if (!lead) throw new Error("Lead não encontrado nesta empresa (descarte falhou).");

     const details = `Motivo: ${reasonExists.nome}${comentario ? ` | Comentário: ${comentario}` : ''}`;
     await logHistory(lead._id, userId, 'DESCARTE', details); 

     return lead;
};

module.exports = {
  getLeads, getLeadById, createLead, updateLead, deleteLead, descartarLead, logHistory
};