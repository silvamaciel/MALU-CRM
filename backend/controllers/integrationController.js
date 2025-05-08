// controllers/integrationController.js
const integrationService = require('../services/integrationService');

/**
 * Controller para finalizar a conexão da página do Facebook.
 */
const connectFacebookPage = async (req, res) => {
    console.log("[IntegCtrl] Recebido POST /api/integrations/facebook/connect-page");
    const { pageId, accessToken } = req.body; // Recebe Page ID e User Access Token do frontend
    const companyId = req.user?.company; // Pega do usuário logado pelo 'protect'
    const userId = req.user?._id;

    if (!pageId || !accessToken || !companyId || !userId) {
        return res.status(400).json({ error: 'Dados insuficientes para conectar página.' });
    }

    try {
        const result = await integrationService.connectFacebookPageIntegration(
            pageId,
            accessToken,
            companyId,
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

module.exports = {
    connectFacebookPage,
};