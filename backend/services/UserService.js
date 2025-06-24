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
                                .sort({ nome: 1 })
                                .lean(); // Added .lean()
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
const { findAndValidateOwnership, validateObjectIds, checkDuplicateField } = require('../utils/validationHelpers');

/**
 * Lista todos os usuários ATIVOS de uma empresa específica.
 * @param {string} companyId - ID da empresa.
 * @returns {Promise<Array>} - Array de usuários (sem senha).
 */
const getUsersByCompany = async (companyId) => {
    validateObjectIds({ companyId }); // Using helper
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
    // validateObjectIds({ userId: id, companyId }); // This is now handled by findAndValidateOwnership
    try {
        const user = await findAndValidateOwnership(User, id, companyId, 'Usuário', null, '-senha', true); // Added lean: true
        return user;
    } catch (error) {
        console.error(`[UserService] Erro ao buscar usuário ${id} para empresa ${companyId}:`, error);
        throw new Error(error.message || 'Erro ao buscar usuário.'); // Re-throw specific or generic error
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
    validateObjectIds({ companyId }); // Using helper

    const emailLower = email.toLowerCase();

    try {
        // Using checkDuplicateField helper (which itself uses .lean() internally for the check)
        await checkDuplicateField(User, { email: emailLower }, companyId, null, 'Email', 'Usuário');

        // No need to add .lean() to the existing User.findOne call if it's removed due to checkDuplicateField
        // If checkDuplicateField wasn't used, it would be:
        // const existingEmail = await User.findOne({ email: emailLower }).lean();
        // if (existingEmail) {
        //     throw new Error(`O email '${emailLower}' já está em uso.`);
        // }

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
    validateObjectIds({ userId: id, companyId }); // Using helper for initial ID checks

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
        // Using checkDuplicateField helper if email is being updated
        if (fieldsToUpdate.email) {
            await checkDuplicateField(User, { email: fieldsToUpdate.email }, companyId, id, 'Email', 'Usuário');
        }

        // The findOneAndUpdate call itself will handle the update.
        // No separate read query that would need .lean() here before the update operation.

        const updatedUser = await User.findOneAndUpdate(
            { _id: id, company: companyId }, 
            { $set: fieldsToUpdate },
            { new: true, runValidators: true }
        ).select('-senha');

        if (!updatedUser) {
            // This error will be more specific if findAndValidateOwnership was used before,
            // but findOneAndUpdate returning null also indicates not found or ownership issue.
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
    // validateObjectIds({ userId: id, companyId }); // Initial ID validation

    try {
        // Using findAndValidateOwnership to get the user and ensure it belongs to the company
        const userToDelete = await findAndValidateOwnership(User, id, companyId, 'Usuário', null, '', true); // Added lean: true

        // The rest of the deletion logic remains the same
        
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