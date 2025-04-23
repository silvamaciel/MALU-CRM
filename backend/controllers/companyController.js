// controllers/companyController.js
const companyService = require('../services/companyService');

/**
 * Controller para criar uma nova empresa.
 */
const createCompany = async (req, res) => {
    console.log("[CompanyController] Recebido POST /api/companies");
    try {
        const newCompany = await companyService.createCompany(req.body);
        res.status(201).json(newCompany); // Retorna 201 Created com a nova empresa
    } catch (error) {
        console.error("[CompanyController] Erro ao criar empresa:", error.message);
        // Retorna erro 400 (Bad Request) ou 409 (Conflict) se for duplicado
        const statusCode = error.message.includes("já está cadastrado") ? 409 : 400;
        res.status(statusCode).json({ error: error.message });
    }
};

// Adicione outros controllers (getAll, getById, update, delete) aqui depois
// const getAllCompanies = async (req, res) => { ... };

module.exports = {
    createCompany,
    // getAllCompanies,
};