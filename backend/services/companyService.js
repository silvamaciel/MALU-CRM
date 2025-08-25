// services/companyService.js
const company = require('../models/Company');
const { cnpj } = require('cpf-cnpj-validator'); // Importa validador

/**
 * Cria uma nova empresa no banco de dados.
 * @param {object} companyData - Dados da empresa (nome, cnpj, etc.).
 * @returns {Promise<object>} - O documento da empresa criada.
 */
const createCompany = async (companyData) => {
    const { nome, cnpj: cnpjInput, ...outrosCampos } = companyData; // Pega nome, cnpj e outros campos

    if (!nome || !cnpjInput) {
        throw new Error("Nome e CNPJ são obrigatórios para criar a empresa.");
    }

    // Valida e limpa CNPJ (embora o Model também valide/limpe com 'set' e 'validate')
    const cleanedCNPJ = String(cnpjInput).replace(/\D/g, '');
    if (!cnpj.isValid(cleanedCNPJ)) {
         throw new Error(`CNPJ inválido fornecido: ${cnpjInput}`);
    }

    try {
        const newCompany = new Company({
            nome: nome,
            cnpj: cleanedCNPJ, // Envia CNPJ limpo para o Model
            ...outrosCampos // Adiciona outros campos se houver
        });
        await newCompany.save(); // O save vai validar unique e outros do schema
        console.log("[CompanyService] Empresa criada com sucesso:", newCompany._id);
        return newCompany;
    } catch (error) {
        console.error("[CompanyService] Erro ao criar empresa:", error);
        // Repassa o erro (pode ser de validação, CNPJ duplicado do hook, etc.)
        throw new Error(error.message || "Falha ao criar empresa.");
    }
};

/**
 * Busca as configurações de uma empresa (apenas campos seguros).
 * @param {string} companyId - ID da empresa.
 */
const getCompanySettings = async (companyId) => {
    const company = await Company.findById(companyId).select('nome autentiqueApiToken'); // Adicione outros campos de config aqui
    if (!company) throw new Error("Empresa não encontrada.");
    return company;
};

/**
 * Atualiza as configurações de integração de uma empresa.
 * @param {string} companyId - ID da empresa.
 * @param {object} settings - Objeto com as configurações a serem atualizadas.
 */
const updateCompanySettings = async (companyId, settings) => {
    const { autentiqueApiToken } = settings;
    
    const updateData = {};
    if (autentiqueApiToken !== undefined) { // Permite guardar um token vazio para desativar
        updateData.autentiqueApiToken = autentiqueApiToken;
    }
    
    const company = await Company.findByIdAndUpdate(companyId, { $set: updateData }, { new: true });
    if (!company) throw new Error("Empresa não encontrada.");

    return { message: "Configurações da empresa atualizadas com sucesso." };
};

module.exports = {
    createCompany,
    getCompanySettings,
    updateCompanySettings
};