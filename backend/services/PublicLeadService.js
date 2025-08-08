const BrokerContact = require('../models/BrokerContact');
const Lead = require('../models/Lead');
const LeadService = require('./LeadService'); // Reutilizaremos o createLead
const { cpf: cpfValidator } = require('cpf-cnpj-validator'); // Para validar CPF
const Company = require('../models/Company');

/**
 * Verifica se um corretor parceiro já existe com base no CPF ou CRECI.
 */
const checkBroker = async (identifier) => {
    if (!identifier) throw new Error("CPF ou CRECI é obrigatório para verificação.");

    const cleanedIdentifier = String(identifier).replace(/\D/g, ""); // Remove caracteres não numéricos

    console.log(`[PublicSvc] Verificando parceiro com identificador: ${cleanedIdentifier}`);

    // Procura por CPF (se for um CPF válido) ou por CRECI
    const query = cpfValidator.isValid(cleanedIdentifier)
        ? { cpfCnpj: cleanedIdentifier }
        : { creci: cleanedIdentifier };

    const broker = await BrokerContact.findOne(query).select('nome email publicSubmissionToken');

    if (broker) {
        console.log(`[PublicSvc] Parceiro encontrado: ${broker.nome}`);
        return { exists: true, broker };
    } else {
        console.log(`[PublicSvc] Nenhum parceiro encontrado.`);
        return { exists: false, broker: null };
    }
};

/**
 * Submete um novo lead a partir do portal público.
 */
const submitPublicLead = async (brokerToken, leadData) => {
    if (!brokerToken) throw new Error("Token do parceiro é inválido.");

    // 1. Encontra o corretor parceiro pelo token público
    const broker = await BrokerContact.findOne({ publicSubmissionToken: brokerToken });
    if (!broker) throw new Error("Parceiro não encontrado ou token inválido.");

    // 2. Prepara os dados do lead para a criação
    const dataForCreation = {
        ...leadData,
        company: broker.company,
        submittedByBroker: broker._id, // Associa o lead ao corretor
        approvalStatus: 'Pendente' // Define o status como pendente de aprovação
    };
    
    console.log(`[PublicSvc] Recebido lead de '${broker.nome}'. Aguardando aprovação.`);

    // 3. Reutiliza a sua função createLead, que já tem todas as validações
    const newLead = await LeadService.createLead(dataForCreation, broker.company, null);
    
    return newLead;
};


/**
 * Regista um novo corretor parceiro a partir do portal público.
 */
const registerBroker = async (companyToken, brokerData) => {
    const { nome, email, contato, cpfCnpj, creci } = brokerData;

    if (!nome || !contato) throw new Error("Nome e Contato são obrigatórios.");
    if (!companyToken) throw new Error("Token da empresa é inválido.");

    // 1. Encontra a empresa pelo token público
    const company = await Company.findOne({ publicBrokerToken: companyToken });
    if (!company) throw new Error("Empresa parceira não encontrada.");

    // 2. Valida e limpa os dados
    const cleanedCpfCnpj = cpfCnpj ? String(cpfCnpj).replace(/\D/g, "") : null;
    const cleanedCreci = creci ? String(creci).trim() : null;

    // 3. Verifica se já existe um corretor com estes dados para esta empresa
    const query = { company: company._id, $or: [] };
    if (cleanedCpfCnpj) query.$or.push({ cpfCnpj: cleanedCpfCnpj });
    if (cleanedCreci) query.$or.push({ creci: cleanedCreci });

    if (query.$or.length > 0) {
        const existingBroker = await BrokerContact.findOne(query);
        if (existingBroker) {
            throw new Error("Um corretor com este CPF/CNPJ ou CRECI já está registado para esta empresa.");
        }
    }

    // 4. Cria o novo BrokerContact
    const newBroker = new BrokerContact({
        nome,
        email,
        contato,
        cpfCnpj: cleanedCpfCnpj,
        creci: cleanedCreci,
        company: company._id,
        ativo: true // Novos parceiros são ativos por padrão
    });

    await newBroker.save();
    console.log(`[PublicSvc] Novo parceiro '${nome}' registado para a empresa '${company.nome}'`);
    
    // Retorna os dados necessários para o frontend continuar o fluxo
    return {
        _id: newBroker._id,
        nome: newBroker.nome,
        publicSubmissionToken: newBroker.publicSubmissionToken
    };
};



module.exports = { checkBroker, submitPublicLead, registerBroker };