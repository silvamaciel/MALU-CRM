// services/UserService.js
const mongoose = require('mongoose');
const User = require('../models/User');
const Lead = require('../models/Lead'); 
const bcrypt = require('bcryptjs'); 

/**
 * Lista todos os usuários ATIVOS de uma empresa específica.
 * @param {string} companyId - ID da empresa.
 * @returns {Promise<Array>} - Array de usuários (sem senha).
 */
const getUsersByCompany = async (companyId) => {
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error('ID da empresa inválido ou não fornecido.');
    }
    try {
        // Busca usuários da empresa, sem a senha, ordenados por nome
        const users = await User.find({ company: companyId, ativo: true }, "-senha")
                                .sort({ nome: 1 });
        console.log(`[UserService] Encontrados ${users.length} usuários para empresa ${companyId}`);
        return users;
    } catch (error) {
        console.error(`[UserService] Erro ao buscar usuários para empresa ${companyId}:`, error);
        throw new Error('Erro ao buscar usuários.');
    }
};

/**
 * Busca um usuário específico pelo ID, DENTRO de uma empresa específica.
 * @param {string} id - ID do usuário.
 * @param {string} companyId - ID da empresa.
 * @returns {Promise<object|null>} - Documento do usuário (sem senha) ou null.
 */
const getUserById = async (id, companyId) => {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("ID de usuário inválido.");
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) throw new Error('ID da empresa inválido.');

    try {
        const user = await User.findOne({ _id: id, company: companyId }, '-senha'); // Filtra por ID e Empresa
        if (!user) {
            throw new Error('Usuário não encontrado nesta empresa.');
        }
        return user;
    } catch (error) {
        console.error(`[UserService] Erro ao buscar usuário ${id} para empresa ${companyId}:`, error);
        throw new Error('Erro ao buscar usuário.');
    }
};


/**
 * Cria um novo usuário para uma empresa específica.
 * Assume que a senha NÃO é definida aqui (usuário criado por admin ou via Google).
 * @param {object} userData - Dados do usuário (nome, email, perfil).
 * @param {string} companyId - ID da empresa.
 * @returns {Promise<object>} - O documento do usuário criado (sem senha).
 */
const createUser = async (userData, companyId) => {
    const { nome, email, perfil } = userData; // Não pega senha aqui

    if (!nome || !email || !perfil) {
        throw new Error("Nome, Email e Perfil são obrigatórios para criar usuário.");
    }
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error('ID da empresa inválido ou não fornecido.');
    }

    const emailLower = email.toLowerCase();

    try {
        const existingEmail = await User.findOne({ email: emailLower });
        if (existingEmail) {
            throw new Error(`O email '${emailLower}' já está em uso.`);
        }

        const newUser = new User({
            nome,
            email: emailLower,
            perfil,
            company: companyId,
        });

        const savedUser = await newUser.save();
        console.log(`[UserService] Usuário criado para empresa ${companyId}:`, savedUser._id);
        // Retorna sem a senha
        const userToReturn = savedUser.toObject();
        delete userToReturn.senha;
        return userToReturn;

    } catch (error) {
        if (error.message.includes("já está em uso")) throw error;
        console.error(`[UserService] Erro ao criar usuário para empresa ${companyId}:`, error);
        throw new Error(error.message || "Erro ao criar usuário.");
    }
};

/**
 * Atualiza um usuário existente de uma empresa específica.
 * @param {string} id - ID do usuário a atualizar.
 * @param {string} companyId - ID da empresa do usuário logado (para segurança).
 * @param {object} updateData - Dados a serem atualizados (nome, email, perfil, ativo, senha?).
 * @returns {Promise<object|null>} - O documento do usuário atualizado (sem senha).
 */
const updateUser = async (id, companyId, updateData) => {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("ID de usuário inválido.");
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) throw new Error("ID da empresa inválido.");

    const { nome, email, perfil, ativo, senha } = updateData; 
    const fieldsToUpdate = {};
    let hasUpdate = false;

    if (nome !== undefined) { fieldsToUpdate.nome = nome; hasUpdate = true; }
    if (email !== undefined) { fieldsToUpdate.email = email.toLowerCase(); hasUpdate = true; }
    if (perfil !== undefined) { fieldsToUpdate.perfil = perfil; hasUpdate = true; }
    if (ativo !== undefined) { fieldsToUpdate.ativo = Boolean(ativo); hasUpdate = true; }

    if (senha) {
        if (typeof senha !== 'string' || senha.length < 6) { 
            throw new Error("Senha inválida. Deve ter pelo menos 6 caracteres.");
        }
        console.log(`[UserService] Gerando hash para nova senha do usuário ${id}`);
        const salt = await bcrypt.genSalt(10);
        fieldsToUpdate.senha = await bcrypt.hash(senha, salt);
        hasUpdate = true;
    }

    if (!hasUpdate) { throw new Error("Nenhum dado válido fornecido para atualização."); }

    try {
        if (fieldsToUpdate.email) {
            const existingEmail = await User.findOne({
                 email: fieldsToUpdate.email,
                 _id: { $ne: id } 
            });
            if (existingEmail) {
                throw new Error(`O email '${fieldsToUpdate.email}' já está em uso por outro usuário.`);
            }
        }

        const updatedUser = await User.findOneAndUpdate(
            { _id: id, company: companyId }, 
            { $set: fieldsToUpdate },
            { new: true, runValidators: true }
        ).select('-senha');

        if (!updatedUser) {
            throw new Error('Usuário não encontrado nesta empresa ou não foi possível atualizar.');
        }
        console.log(`[UserService] Usuário atualizado para empresa ${companyId}:`, id);
        return updatedUser;

    } catch (error) {
        if (error.message.includes("já está em uso")) throw error;
        console.error(`[UserService] Erro ao atualizar usuário ${id} para empresa ${companyId}:`, error);
        throw new Error(error.message || "Erro ao atualizar usuário.");
    }
};

/**
 * Exclui um usuário de uma empresa específica.
 * @param {string} id - ID do usuário a excluir.
 * @param {string} companyId - ID da empresa do usuário logado (para segurança).
 */
const deleteUser = async (id, companyId) => {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("ID de usuário inválido.");
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) throw new Error("ID da empresa inválido.");

    try {
        const userToDelete = await User.findOne({ _id: id, company: companyId });
        if (!userToDelete) {
            throw new Error('Usuário não encontrado nesta empresa.');
        }

        
         const leadCount = await Lead.countDocuments({ responsavel: id, company: companyId });
         if (leadCount > 0) {
            throw new Error(`Não é possível excluir: Usuário é responsável por ${leadCount} lead(s).`);
         }
         if (userToDelete.perfil === 'admin') {
             const otherAdminCount = await User.countDocuments({ company: companyId, perfil: 'admin', _id: { $ne: id } });
             if (otherAdminCount === 0) {
                 throw new Error("Não é possível excluir o único administrador da empresa.");
             }
         }

        
        await User.deleteOne({ _id: id, company: companyId });
        console.log(`[UserService] Usuário excluído da empresa ${companyId}:`, id);
        return { message: `Usuário "${userToDelete.nome}" excluído com sucesso.` };

    } catch (error) {
        console.error(`[UserService] Erro ao excluir usuário ${id} da empresa ${companyId}:`, error);
        throw new Error(error.message || 'Erro ao excluir usuário.');
    }
};

module.exports = {
    getUsersByCompany,
    getUserById, // Precisa ser ajustado para receber companyId se for usado em contexto não-admin
    createUser,
    updateUser,
    deleteUser,
};