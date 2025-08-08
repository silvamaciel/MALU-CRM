// backend/services/PublicLeadService.js
const Lead = require('../models/Lead');
const BrokerContact = require('../models/BrokerContact');
const LeadService = require('./LeadService'); // Reutilizaremos o createLead

const submitLeadByBroker = async (brokerToken, leadData) => {
    if (!brokerToken) throw new Error("Token do parceiro é inválido.");

    // 1. Encontra o corretor parceiro pelo token público
    const broker = await BrokerContact.findOne({ publicSubmissionToken: brokerToken });
    if (!broker) throw new Error("Parceiro não encontrado ou token inválido.");

    // 2. Prepara os dados do lead para a criação
    const dataForCreation = {
        ...leadData,
        company: broker.company, // O lead pertencerá à mesma empresa que o corretor
        submittedByBroker: broker._id, // Associa o lead ao corretor
        approvalStatus: 'Pendente' // Define o status como pendente de aprovação
        // A função createLead definirá a origem, situação e responsável padrão
    };
    
    console.log(`[PublicLeadSvc] Recebido lead de '${broker.nome}'. Aguardando aprovação.`);


    const newLead = await LeadService.createLead(dataForCreation, broker.company, null);
    
    return newLead;
};

module.exports = { submitLeadByBroker };