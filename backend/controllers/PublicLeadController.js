backend/controllers/PublicLeadController.js
const asyncHandler = require('../middlewares/asyncHandler');
const PublicLeadService = require('../services/PublicLeadService');

const submitLead = asyncHandler(async (req, res, next) => {
    const { brokerToken } = req.params;
    const leadData = req.body;
    const newLead = await PublicLeadService.submitLeadByBroker(brokerToken, leadData);
    res.status(201).json({ success: true, message: "Lead submetido com sucesso e aguardando aprovação.", leadId: newLead._id });
});

module.exports = { submitLead };