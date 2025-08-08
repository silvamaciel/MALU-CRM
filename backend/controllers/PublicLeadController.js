const asyncHandler = require('../middlewares/asyncHandler');
const PublicService = require('../services/PublicService');

const checkBrokerController = asyncHandler(async (req, res, next) => {
    const { identifier } = req.body;
    const result = await PublicService.checkBroker(identifier);
    res.status(200).json({ success: true, data: result });
});

const submitLeadController = asyncHandler(async (req, res, next) => {
    const { brokerToken } = req.params;
    const leadData = req.body;
    const newLead = await PublicService.submitPublicLead(brokerToken, leadData);
    res.status(201).json({ success: true, message: "Lead submetido com sucesso e aguardando aprovação." });
});

const registerBrokerController = asyncHandler(async (req, res, next) => {
    const { companyToken } = req.params;
    const brokerData = req.body;
    const newBroker = await PublicService.registerBroker(companyToken, brokerData);
    res.status(201).json({ success: true, data: newBroker });
});


module.exports = { checkBrokerController, submitLeadController, registerBrokerController};