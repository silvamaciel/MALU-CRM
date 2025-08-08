const BrokerContact = require('../models/BrokerContact');
const Lead = require('../models/Lead');
const LeadService = require('./LeadService'); // Reutilizaremos o createLead
const { cpf: cpfValidator } = require('cpf-cnpj-validator'); // Para validar CPF
const Company = require('../models/Company');


/**
 * Verifica se um corretor parceiro já existe PARA UMA EMPRESA ESPECÍFICA.
 */
const checkBroker = async (identifier, companyId) => {
    if (!identifier) throw new Error("CPF ou CRECI é obrigatório.");
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error("ID da empresa inválido.");
    }

    const cleanedIdentifier = String(identifier).replace(/\D/g, "");
    console.log(`[PublicSvc] Verificando parceiro '${cleanedIdentifier}' para a Empresa: ${companyId}`);

    const query = { 
        company: companyId, // <<< ADICIONA O FILTRO DE EMPRESA
        $or: [
            { cpfCnpj: cleanedIdentifier },
            { creci: cleanedIdentifier }
        ]
    };
    
    // Remove a verificação por CPF se não for um CPF válido para não dar erro com CRECI
    if (!cpfValidator.isValid(cleanedIdentifier)) {
        query.$or.shift(); // Remove a condição do cpfCnpj
    }

    const broker = await BrokerContact.findOne(query).select('nome email publicSubmissionToken');

    if (broker) {
        return { exists: true, broker };
    } else {
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
 * Regista um novo corretor parceiro a partir do portal público,
 * associando-o a uma empresa específica pelo seu ID.
 * @param {string} companyId - O ObjectId da empresa parceira.
 * @param {object} brokerData - Os dados do corretor a ser registado (nome, email, etc.).
 * @returns {Promise<object>} Os dados essenciais do corretor recém-criado.
 */
const registerBroker = async (companyId, brokerData) => {
    const { nome, email, contato, cpfCnpj, creci } = brokerData;

    // --- 1. Validação dos Dados de Entrada ---
    if (!nome || !contato) {
        throw new Error("Nome e Contato são obrigatórios para o registo.");
    }
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error("ID da empresa é inválido ou não foi fornecido.");
    }

    // --- 2. Encontrar a Empresa Parceira ---
    const company = await Company.findById(companyId);
    if (!company) {
        throw new Error("Empresa parceira não encontrada. O link de registo pode estar incorreto.");
    }

    // --- 3. Limpeza e Validação dos Identificadores ---
    const cleanedCpfCnpj = cpfCnpj ? String(cpfCnpj).replace(/\D/g, "") : null;
    const cleanedCreci = creci ? String(creci).trim() : null;

    // --- 4. Verificação de Duplicados ---
    // Verifica se já existe um corretor com o mesmo CPF/CNPJ ou CRECI *para esta empresa*.
    const query = { company: company._id, $or: [] };
    if (cleanedCpfCnpj) query.$or.push({ cpfCnpj: cleanedCpfCnpj });
    if (cleanedCreci) query.$or.push({ creci: cleanedCreci });

    if (query.$or.length > 0) {
        const existingBroker = await BrokerContact.findOne(query);
        if (existingBroker) {
            throw new Error("Um corretor com este CPF/CNPJ ou CRECI já está registado para esta empresa.");
        }
    }

    // --- 5. Criação do Novo BrokerContact ---
    const newBroker = new BrokerContact({
        nome,
        email,
        contato,
        cpfCnpj: cleanedCpfCnpj,
        creci: cleanedCreci,
        company: company._id, // Associa o novo corretor à empresa encontrada
        ativo: true // Novos parceiros são ativos por padrão
    });

    await newBroker.save();
    console.log(`[PublicSvc] Novo parceiro '${nome}' registado com sucesso para a empresa '${company.nome}'`);
    
    // --- 6. Retorno dos Dados para o Frontend ---
    // Retorna os dados essenciais para o frontend poder continuar o fluxo (submeter o lead)
    return {
        _id: newBroker._id,
        nome: newBroker.nome,
        publicSubmissionToken: newBroker.publicSubmissionToken
    };
};



module.exports = { checkBroker, submitPublicLead, registerBroker };