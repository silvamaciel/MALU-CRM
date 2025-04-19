// controllers/UserController.js
const UserService = require('../services/UserService');

// Listar usuários
const getUsers = async (req, res) => {
  try {
    const users = await UserService.getUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Criar um novo usuário
const createUser = async (req, res) => {
  try {
    const novoUsuario = await UserService.createUser(req.body);
    res.status(201).json(novoUsuario);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Atualizar um usuário
const updateUser = async (req, res) => {
  try {
    const usuarioAtualizado = await UserService.updateUser(req.params.id, req.body);
    res.json(usuarioAtualizado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Deletar um usuário
const deleteUser = async (req, res) => {
  try {
    await UserService.deleteUser(req.params.id);
    res.json({ mensagem: 'Usuário excluído com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await UserService.getUserById(req.params.id); // <- certo
    res.json(user);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserById
};
