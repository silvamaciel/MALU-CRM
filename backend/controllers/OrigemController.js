// controllers/origemController.js
const origemService = require('../services/origemService'); // <<< Chama o Serviço
const mongoose = require('mongoose');

// (Poderia importar e usar o checkCompanyId daqui também, se quisesse)

// Listar origens DA EMPRESA LOGADA
const getOrigens = async (req, res) => {
    try {
        const companyId = req.user.company; // Pega companyId do usuário logado
        if (!companyId) throw new Error("Empresa não identificada para o usuário."); // Segurança extra
        const origens = await origemService.getAllOrigens(companyId); // Passa para o serviço
        res.json(origens);
    } catch (error) {
        console.error("[Ctrl-Origem] Erro getAll:", error.message)
        res.status(500).json({ error: error.message });
    }
};

// Criar origem PARA A EMPRESA LOGADA
const createOrigem = async (req, res) => {
    console.log("[Ctrl-Origem] Recebido POST /api/origens");
    try {
        const companyId = req.user.company; // Pega companyId
        if (!companyId) throw new Error("Empresa não identificada para o usuário.");
        // Passa os dados do body E o companyId para o serviço
        const novaOrigem = await origemService.createOrigem(req.body, companyId);
        res.status(201).json(novaOrigem);
    } catch (error) {
        console.error("[Ctrl-Origem] Erro create:", error.message);
        const statusCode = error.message.includes("já existe") ? 409 : 400;
        res.status(statusCode).json({ error: error.message });
    }
};

// Atualizar origem DA EMPRESA LOGADA
const updateOrigem = async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
       return res.status(400).json({ error: 'ID de origem inválido.' });
    }
    console.log(`[Ctrl-Origem] Recebido PUT /api/origens/${id}`);
    try {
        const companyId = req.user.company; // Pega companyId
        if (!companyId) throw new Error("Empresa não identificada para o usuário.");
         // Passa id, companyId e dados do body para o serviço
        const atualizada = await origemService.updateOrigem(id, companyId, req.body);
        res.json(atualizada);
    } catch (error) {
        console.error(`[Ctrl-Origem] Erro update ${id}:`, error.message);
        const statusCode = error.message.includes("não encontrada") ? 404 : (error.message.includes("já existe") ? 409 : 400);
        res.status(statusCode).json({ error: error.message });
    }
};

// Deletar origem DA EMPRESA LOGADA
const deleteOrigem = async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
       return res.status(400).json({ error: 'ID de origem inválido.' });
    }
    console.log(`[Ctrl-Origem] Recebido DELETE /api/origens/${id}`);
    try {
        const companyId = req.user.company; // Pega companyId
        if (!companyId) throw new Error("Empresa não identificada para o usuário.");
        // Passa id e companyId para o serviço
        const result = await origemService.deleteOrigem(id, companyId);
        res.status(200).json(result);
    } catch (error) {
        console.error(`[Ctrl-Origem] Erro delete ${id}:`, error.message);
        const statusCode = error.message.includes("não encontrada") ? 404 : (error.message.includes("sendo usada") ? 409 : 400);
        res.status(statusCode).json({ error: error.message });
    }
};

ensureOrigem = async (req, res, next) => {
  try {
    const { nome, descricao, companyId: companyIdBody } = req.body;
    const companyId = req.user?.company || companyIdBody; // <- pega do token ou do body
    if (!nome) return res.status(400).json({ error: 'nome é obrigatório' });
    if (!companyId) return res.status(400).json({ error: 'companyId ausente' });
    const origem = await findOrCreateOrigem({ nome, descricao }, companyId);
    res.json({ success: true, data: origem });
  } catch (err) { next(err); }
};

module.exports = {
    ensureOrigem,
    getOrigens, 
    createOrigem,
    updateOrigem,
    deleteOrigem,
};