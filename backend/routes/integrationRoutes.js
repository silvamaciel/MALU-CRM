// routes/integrationRoutes.js
const express = require('express');
const router = express.Router();
const integrationController = require('../controllers/integrationController');
const { protect } = require('../middlewares/authMiddleware'); // Apenas protect é necessário aqui

// POST /api/integrations/facebook/connect-page
// Recebe o ID da página selecionada e o User Access Token do frontend
// para finalizar a conexão e configurar o webhook. Rota protegida.
router.post('/facebook/connect-page', protect, integrationController.connectFacebookPage);

router.get('/facebook/status', protect, integrationController.getFacebookStatus);

router.post('/facebook/disconnect', protect, integrationController.disconnectFacebook);

router.post('/google/sync-contacts', protect, integrationController.syncGoogleContacts);

router.get('/google/list-contacts', protect, integrationController.listGoogleContactsController);

router.post('/google/import-selected-contacts', protect, integrationController.importSelectedGoogleContactsController);

router.get('/facebook/pages/:pageId/forms', protect, integrationController.listPageFormsController);

router.post('/facebook/pages/:pageId/linked-forms', protect, integrationController.saveLinkedFormsController);

router.post('/evolution/create-instance', protect, authorize(['admin']), integrationController.createEvolutionInstanceController);

router.get('/evolution/instance/:instanceId/status', protect, authorize(['admin']), integrationController.getEvolutionInstanceStatusController);

router.get('/evolution/instances', protect, authorize(['admin']), IntegrationsController.listEvolutionInstancesController);



module.exports = router;