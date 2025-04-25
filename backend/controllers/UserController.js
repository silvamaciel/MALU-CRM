// controllers/UserController.js
const UserService = require('../services/UserService');
const mongoose = require('mongoose');

/**
 * Controller para listar usuários da empresa do usuário logado.
 */
const getCompanyUsers = async (req, res) => {
    try {
        const companyId = req.user?.company;
        if (!companyId) {
            return res.status(401).json({ error: 'Empresa do usuário não identificada.' });
        }
        const users = await UserService.getUsersByCompany(companyId);
        res.json(users);
    } catch (error) {
        console.error("[Ctrl-User] Erro getCompanyUsers:", error.message);
        res.status(500).json({ error: error.message || 'Erro ao buscar usuários.' });
    }
};

/**
 * Controller para buscar um usuário por ID (dentro da empresa do requisitante).
 */
const getUserById = async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
       return res.status(400).json({ error: 'ID de usuário inválido.' });
    }
    try {
        const companyId = req.user?.company;
        if (!companyId) {
            return res.status(401).json({ error: 'Empresa do usuário não identificada.' });
        }
        const user = await UserService.getUserById(id, companyId);
        res.json(user); 
    } catch (error) {
        console.error(`[Ctrl-User] Erro getUserById ${id}:`, error.message);
        const statusCode = error.message.toLowerCase().includes("não encontrado") ? 404 : 500;
        res.status(statusCode).json({ error: error.message });
    }
};


/**
 * Controller para criar um novo usuário (para a empresa do requisitante).
 * Assume que apenas admins podem fazer isso (verificar rota).
 */
const createUser = async (req, res) => {
    console.log("[Ctrl-User] Recebido POST /api/users");
    try {
        const companyId = req.user?.company; 
        if (!companyId) {
            return res.status(401).json({ error: 'Empresa do usuário não identificada.' });
        }
        const novoUsuario = await UserService.createUser(req.body, companyId);
        res.status(201).json(novoUsuario);
    } catch (error) {
        console.error("[Ctrl-User] Erro create:", error.message);
        const statusCode = error.message.includes("já está em uso") ? 409 : 400;
        res.status(statusCode).json({ error: error.message });
    }
};

/**
 * Controller para atualizar um usuário (da empresa do requisitante).
 * Assume que apenas admins podem fazer isso (verificar rota).
 */
const updateUser = async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
       return res.status(400).json({ error: 'ID de usuário inválido.' });
    }
    console.log(`[Ctrl-User] Recebido PUT /api/users/${id}`);
    try {
        const companyId = req.user?.company; 
        const userId = req.user?._id; 
        if (!companyId || !userId) {
            return res.status(401).json({ error: 'Empresa ou Usuário não identificado.' });
        }
        const usuarioAtualizado = await UserService.updateUser(id, companyId, req.body);
        res.json(usuarioAtualizado); 
    } catch (error) {
        console.error(`[Ctrl-User] Erro update ${id}:`, error.message);
        const statusCode = error.message.includes("não encontrada") ? 404 : (error.message.includes("já está em uso") ? 409 : 400);
        res.status(statusCode).json({ error: error.message });
    }
};

/**
 * Controller para deletar um usuário (da empresa do requisitante).
 * Assume que apenas admins podem fazer isso (verificar rota).
 */
const deleteUser = async (req, res) => {
    const { id } = req.params;
     if (!mongoose.Types.ObjectId.isValid(id)) {
       return res.status(400).json({ error: 'ID de usuário inválido.' });
    }
    console.log(`[Ctrl-User] Recebido DELETE /api/users/${id}`);
    try {
        const companyId = req.user?.company; 
         if (!companyId) {
            return res.status(401).json({ error: 'Empresa do usuário não identificada.' });
        }
        const result = await UserService.deleteUser(id, companyId);
        res.status(200).json(result);
    } catch (error) {
        console.error(`[Ctrl-User] Erro delete ${id}:`, error.message);
        const statusCode = error.message.includes("não encontrada") ? 404 : (error.message.includes("não é possível excluir") ? 400 : 500);
        res.status(statusCode).json({ error: error.message });
    }
};

module.exports = {
    getCompanyUsers, // Renomeado
    getUserById,
    createUser,
    updateUser,
    deleteUser,
};