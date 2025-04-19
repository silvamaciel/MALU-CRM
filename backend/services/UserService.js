// services/UserService.js
const User = require("../models/User");

// Função para listar todos os usuários
const getUsers = async () => {
  try {
    return await User.find({}, "-senha"); // exclui campo de senha
  } catch (error) {
    throw new Error("Erro ao buscar usuários.");
  }
};

// Função para criar um novo usuário
const createUser = async (data) => {
  try {
    const novoUsuario = new User(data);
    return await novoUsuario.save();
  } catch (error) {
    throw new Error("Erro ao criar usuário.");
  }
};

// Função para atualizar um usuário
const updateUser = async (id, data) => {
  try {
    return await User.findByIdAndUpdate(id, data, { new: true });
  } catch (error) {
    throw new Error("Erro ao atualizar usuário.");
  }
};

// Função para excluir um usuário
const deleteUser = async (id) => {
  try {
    return await User.findByIdAndDelete(id);
  } catch (error) {
    throw new Error("Erro ao excluir usuário.");
  }
};

const getUserById = async (id) => {
  try {
    return await User.findById(id).select('-senha'); // exclui campo de senha
  } catch (error) {
    throw new Error('Erro ao buscar usuário.');
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserById,
};
