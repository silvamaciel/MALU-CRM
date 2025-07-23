const asyncHandler = require('../middlewares/asyncHandler');
const { processMessageUpsert, processConnectionUpdate } = require('../services/evolutionWebhookService');

const handleWebhook = asyncHandler(async (req, res, next) => {
    const payload = req.body;
    
    // Log para depuração. Mostra todo o corpo do webhook recebido.
    console.log(`[WebhookCtrl] Webhook da Evolution API recebido. Evento: ${payload.event}`);
    console.log(JSON.stringify(payload, null, 2));

    // Roteia o evento para a função de serviço correta
    switch (payload.event) {
        case 'messages.upsert':
            // Não precisamos esperar o processamento terminar para responder
            processMessageUpsert(payload);
            break;
        
        case 'connection.update':
            processConnectionUpdate(payload);
            break;
        
        // Adicione outros eventos aqui no futuro, se necessário
        // case 'outro.evento':
        //     processarOutroEvento(payload);
        //     break;
            
        default:
            console.log(`[WebhookCtrl] Evento '${payload.event}' recebido, mas não há um handler configurado para ele.`);
            break;
    }
    
    res.status(200).json({ success: true, message: "Webhook received." });
});

module.exports = {
    handleWebhook
};