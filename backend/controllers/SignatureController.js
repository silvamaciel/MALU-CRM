const asyncHandler = require('../middlewares/asyncHandler');
const SignatureService = require('../services/SignatureService');
const IntegartionService = require('../services/integrationService');

/**
 * @desc    Envia um contrato para assinatura via Autentique.
 * @route   POST /api/assinaturas/contratos/:id/enviar
 * @access  Privado
 */
const enviarContratoController = asyncHandler(async (req, res, next) => {
    const { id: contratoId } = req.params;
    const companyId = req.user.company;

    const contratoAtualizado = await SignatureService.enviarParaAssinatura(contratoId, companyId);
    
    res.status(200).json({ 
        success: true, 
        message: "Contrato enviado para assinatura com sucesso!",
        data: contratoAtualizado 
    });
});

/**
 * @desc    Recebe webhooks do Autentique.
 * @route   POST /api/webhooks/autentique
 * @access  Público
 */
const webhookAutentiqueController = asyncHandler(async (req, res, next) => {
    const payload = req.body;
    console.log("[SignatureCtrl] Webhook do Autentique recebido.");
    
    // Delega o processamento para o serviço
    await SignatureService.handleAutentiqueWebhook(payload);

    // Responde imediatamente com 200 OK para o Autentique
    res.status(200).send('Webhook recebido.');
});


module.exports = {
    enviarContratoController,
    webhookAutentiqueController
};