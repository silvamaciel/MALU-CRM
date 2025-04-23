// controllers/origemController.js
const origemService = require('../services/origemService'); // <<< Chama o Serviço
const mongoose = require('mongoose');

// Listar origens
const getOrigens = async (req, res) => {
    try {
        // Chama a função getAllOrigens do serviço
        const origens = await origemService.getAllOrigens();
        res.json(origens);
    } catch (error) {
        console.error("[Ctrl-Origem] Erro getAll:", error.message)
        res.status(500).json({ error: error.message });
    }
};

// Criar origem
const createOrigem = async (req, res) => {
    console.log("[Ctrl-Origem] Recebido POST /api/origens");
    try {
        const novaOrigem = await origemService.createOrigem(req.body);
        res.status(201).json(novaOrigem);
    } catch (error) {
        console.error("[Ctrl-Origem] Erro create:", error.message);
        const statusCode = error.message.includes("já existe") ? 409 : 400;
        res.status(statusCode).json({ error: error.message });
    }
};

// Atualizar origem
const updateOrigem = async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
       return res.status(400).json({ error: 'ID de origem inválido.' });
    }
    console.log(`[Ctrl-Origem] Recebido PUT /api/origens/${id}`);
    try {
        const atualizada = await origemService.updateOrigem(id, req.body);
        res.json(atualizada); // Serviço já lança erro 404 se não encontrar
    } catch (error) {
        console.error(`[Ctrl-Origem] Erro update ${id}:`, error.message);
        const statusCode = error.message.includes("não encontrada") ? 404 : (error.message.includes("já existe") ? 409 : 400);
        res.status(statusCode).json({ error: error.message });
    }
};

// Deletar origem
const deleteOrigem = async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
       return res.status(400).json({ error: 'ID de origem inválido.' });
    }
    console.log(`[Ctrl-Origem] Recebido DELETE /api/origens/${id}`);
    try {
        const result = await origemService.deleteOrigem(id);
        res.status(200).json(result); // Retorna a mensagem de sucesso do serviço
    } catch (error) {
        console.error(`[Ctrl-Origem] Erro delete ${id}:`, error.message);
        const statusCode = error.message.includes("não encontrada") ? 404 : (error.message.includes("sendo usada") ? 409 : 400);
        res.status(statusCode).json({ error: error.message });
    }
};

module.exports = {
    getOrigens, // Mantém o nome da função original do seu controller
    createOrigem,
    updateOrigem,
    deleteOrigem,
};