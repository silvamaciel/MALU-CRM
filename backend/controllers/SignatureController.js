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
    const { signers } = req.body; 
    const companyId = req.user.company;

    const contratoAtualizado = await SignatureService.enviarParaAssinatura(contratoId, companyId, signers);
    
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
    
    await SignatureService.handleAutentiqueWebhook(payload);

    res.status(200).send('Webhook recebido.');
});


module.exports = {
    enviarContratoController,
    webhookAutentiqueController
};