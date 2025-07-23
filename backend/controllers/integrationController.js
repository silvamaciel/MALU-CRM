// controllers/integrationController.js
const integrationService = require('../services/integrationService');
const mongoose = require('mongoose');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');


/**
 * Controller para finalizar a conexão da página do Facebook.
 */
const connectFacebookPage = async (req, res) => {
    console.log("[IntegCtrl] Recebido POST /api/integrations/facebook/connect-page");
    const { pageId, accessToken } = req.body; // Recebe Page ID e User Access Token do frontend
    const companyId = req.user?.company; // Pega do usuário logado pelo 'protect'
    const userId = req.user?._id;
    const connectingUserId = req.user?._id;

    if (!pageId || !accessToken || !companyId || !userId || !connectingUserId) {
        return res.status(400).json({ error: 'Dados insuficientes para conectar página (pageId, accessToken, companyId, connectingUserId).' });
    }

    try {
        const result = await integrationService.connectFacebookPageIntegration(
            pageId,
            accessToken,
            companyId,
            connectingUserId
            // userId é útil se o serviço precisar dele para algo, mas não diretamente aqui
        );
        res.status(200).json(result); // Retorna mensagem de sucesso do serviço
    } catch (error) {
        console.error("[IntegCtrl] Erro ao conectar página FB:", error.message);
        // Retorna erro 400 para erros esperados (ex: token inválido, falha na subscrição)
        // ou 500 para erros inesperados
        res.status(400).json({ error: error.message || 'Falha ao conectar página.' });
    }
};

const getFacebookStatus = async (req, res) => {
    console.log("[IntegCtrl] Recebido GET /api/integrations/facebook/status");
    const companyId = req.user?.company;

    if (!companyId) {
        return res.status(401).json({ error: 'Empresa do usuário não identificada.' });
    }
    try {
        const status = await integrationService.getFacebookIntegrationStatus(companyId);
        res.status(200).json(status);
    } catch (error) {
        console.error("[IntegCtrl] Erro ao buscar status da integração FB:", error.message);
        res.status(500).json({ error: error.message || 'Falha ao buscar status da integração.' });
    }
};


/**
 * Controller para desconectar a página do Facebook atualmente integrada à empresa.
 */
const disconnectFacebook = async (req, res) => {
    console.log("[IntegCtrl] Recebido POST /api/integrations/facebook/disconnect");
    const companyId = req.user?.company;

    if (!companyId) {
        return res.status(401).json({ error: 'Empresa do usuário não identificada.' });
    }

    try {
        const result = await integrationService.disconnectFacebookPageIntegration(companyId);
        res.status(200).json(result);
    } catch (error) {
        console.error("[IntegCtrl] Erro ao desconectar página FB:", error.message);
        res.status(400).json({ error: error.message || 'Falha ao desconectar página.' });
    }
};



/**
 * Controller para sincronizar contatos do Google
 */
const syncGoogleContacts = async (req, res) => {
    console.log("[IntegCtrl] Recebido POST /api/integrations/google/sync-contacts");
    const companyId = req.user?.company;
    const userId = req.user?._id;

    if (!companyId || !userId) {
        return res.status(401).json({ error: 'Usuário ou Empresa não identificada.' });
    }

    try {
        const result = await integrationService.importGoogleContactsAsLeads(userId, companyId);
        res.status(200).json({ message: "Sincronização de contatos do Google concluída.", summary: result });
    } catch (error) {
        console.error("[IntegCtrl] Erro ao sincronizar contatos Google:", error.message);
        const statusCode = error.message.includes("não conectado ao Google") || error.message.includes("Falha ao obter autorização") ? 401 : 400;
        res.status(statusCode).json({ error: error.message || 'Falha ao sincronizar contatos.' });
    }
};



/**
 * Controller para Listar contatos do Google
 */
const listGoogleContactsController = async (req, res) => {
    console.log("[IntegCtrl] Recebido GET /api/integrations/google/list-contacts");
    const userId = req.user?._id;         
    const companyId = req.user?.company; 

    if (!userId || !companyId) {
        return res.status(401).json({ error: 'Usuário ou Empresa não identificada.' });
    }
    try {
        const contacts = await integrationService.listGoogleContacts(userId, companyId);
        res.status(200).json(contacts);
    } catch (error) {
        console.error("[IntegCtrl] Erro ao listar contatos Google:", error.message);
        const statusCode = error.message.includes("não conectado ao Google") || error.message.includes("Falha ao obter autorização") ? 401 : 400;
        res.status(statusCode).json({ error: error.message || 'Falha ao listar contatos do Google.' });
    }
};


/**
 * Controller para PROCESSAR Contatos Google SELECIONADOS
 */
const importSelectedGoogleContactsController = async (req, res) => {
    console.log("[IntegCtrl] Recebido POST /api/integrations/google/import-selected-contacts");
    const userId = req.user?._id;
    const companyId = req.user?.company;
    const { selectedContacts } = req.body; // Espera um array de contatos no corpo

    if (!userId || !companyId) {
        return res.status(401).json({ error: 'Usuário ou Empresa não identificada.' });
    }
    if (!Array.isArray(selectedContacts) || selectedContacts.length === 0) {
        return res.status(400).json({ error: 'Nenhum contato selecionado para importação.' });
    }

    try {
        const summary = await integrationService.processSelectedGoogleContacts(userId, companyId, selectedContacts);
        res.status(200).json({ message: "Importação de contatos do Google processada.", summary });
    } catch (error) {
        console.error("[IntegCtrl] Erro ao processar contatos Google selecionados:", error.message);
        const statusCode = error.message.includes("não conectado ao Google") || error.message.includes("Falha ao obter autorização") ? 401 : 400;
        res.status(statusCode).json({ error: error.message || 'Falha ao processar contatos selecionados.' });
    }
};



/**
 * Controller para Listar Formulários do Facebook Ads
 */
const listPageFormsController = async (req, res) => {
    const { pageId } = req.params; // Pega o pageId da URL
    const companyId = req.user?.company;
    console.log(`[IntegCtrl ListForms] Recebido GET /api/integrations/facebook/pages/${pageId}/forms para Company ${companyId}`);

    if (!companyId) {
        return res.status(401).json({ error: 'Empresa do usuário não identificada.' });
    }
    if (!pageId) {
        return res.status(400).json({ error: 'ID da Página do Facebook é obrigatório.' });
    }

    try {
        const forms = await integrationService.listFormsForFacebookPage(companyId, pageId);
        res.status(200).json(forms);
    } catch (error) {
        console.error(`[IntegCtrl ListForms] Erro ao listar formulários para Page ${pageId}:`, error.message);
        const statusCode = error.message.includes("Página não conectada") ? 404 : 400;
        res.status(statusCode).json({ error: error.message || 'Falha ao listar formulários da página.' });
    }
};


/**
 * Controller para SALVAR Formulários FB Selecionados
 */
const saveLinkedFormsController = async (req, res) => {
    const { pageId } = req.params; // ID da Página do Facebook da URL
    const companyId = req.user?.company;
    // Esperamos um array de objetos {formId, formName} no corpo da requisição
    const { linkedForms } = req.body; 

    console.log(`[IntegCtrl SaveForms] Recebido POST /api/integrations/facebook/pages/${pageId}/linked-forms para Company ${companyId}`);

    if (!companyId) {
        return res.status(401).json({ error: 'Empresa do usuário não identificada.' });
    }
    if (!pageId) {
        return res.status(400).json({ error: 'ID da Página do Facebook é obrigatório na URL.' });
    }
    if (!Array.isArray(linkedForms)) { // Validação básica do payload
        return res.status(400).json({ error: 'Payload inválido: linkedForms deve ser um array.' });
    }

    try {
        const result = await integrationService.saveLinkedFacebookForms(companyId, pageId, linkedForms);
        res.status(200).json(result);
    } catch (error) {
        console.error(`[IntegCtrl SaveForms] Erro ao salvar formulários para Page ${pageId}:`, error.message);
        // O serviço pode lançar erros com mensagens específicas
        res.status(400).json({ error: error.message || 'Falha ao salvar seleção de formulários.' });
    }
};


const createEvolutionInstanceController = asyncHandler(async (req, res, next) => {
    const { instanceName } = req.body;
    if (!instanceName) {
        return next(new ErrorResponse('O nome da instância é obrigatório.', 400));
    }
    const companyId = req.user.company;
    const creatingUserId = req.user._id;

    const newInstance = await integrationService.createEvolutionInstance(instanceName, companyId, creatingUserId);
    
    res.status(201).json({ success: true, data: newInstance });
});

const getEvolutionInstanceStatusController = asyncHandler(async (req, res, next) => {
    const { instanceId } = req.params;
    const companyId = req.user.company;

    const state = await integrationService.getEvolutionInstanceConnectionState(instanceId, companyId);
    
    res.status(200).json({ success: true, data: state });
});

const listEvolutionInstancesController = asyncHandler(async (req, res, next) => {
    const companyId = req.user.company;
    const instances = await integrationService.listEvolutionInstances(companyId);
    res.status(200).json({ success: true, data: instances });
});


const updateInstanceSettingsController = asyncHandler(async (req, res, next) => {
    const { instanceId } = req.params;
    const companyId = req.user.company;
    const settings = req.body;

    const updatedInstance = await integrationService.updateInstanceSettings(instanceId, companyId, settings);
    res.status(200).json({ success: true, data: updatedInstance });
});


const deleteEvolutionInstanceController = asyncHandler(async (req, res, next) => {
    const { instanceId } = req.params;
    const companyId = req.user.company;
    const result = await IntegrationService.deleteEvolutionInstance(instanceId, companyId);
    res.status(200).json({ success: true, data: result });
});




module.exports = {
    connectFacebookPage,
    getFacebookStatus,
    disconnectFacebook,
    syncGoogleContacts,
    listGoogleContactsController,
    importSelectedGoogleContactsController,
    listPageFormsController,
    saveLinkedFormsController,
    createEvolutionInstanceController,
    getEvolutionInstanceStatusController,
    listEvolutionInstancesController,
    updateInstanceSettingsController,
    deleteEvolutionInstanceController
};