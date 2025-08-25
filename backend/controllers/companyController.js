// controllers/companyController.js
const companyService = require('../services/companyService');
const asyncHandler = require("../middlewares/asyncHandler");

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


/**
 * Controller para buscar configuraçãoes da company
 */
const getCompanySettingsController = asyncHandler(async (req, res) => {
    const settings = await CompanyService.getCompanySettings(req.user.company);
    res.status(200).json({ success: true, data: settings });
});


/**
 * Controller para Atualizar configuraçãoes da company
 */
const updateCompanySettingsController = asyncHandler(async (req, res) => {
    const result = await CompanyService.updateCompanySettings(req.user.company, req.body);
    res.status(200).json({ success: true, data: result });
});



module.exports = {
    createCompany,
    getCompanySettingsController,
    updateCompanySettingsController
};