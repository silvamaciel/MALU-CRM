const Origem = require('../models/origem');

// Listar origens
const getOrigens = async (req, res) => {
  try {
    const origens = await Origem.find().sort({ nome: 1 });
    res.json(origens);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar origens.' });
  }
};

// Criar origem
const createOrigem = async (req, res) => {
  try {
    const novaOrigem = new Origem(req.body);
    const salva = await novaOrigem.save();
    res.status(201).json(salva);
  } catch (error) {
    res.status(400).json({ error: 'Erro ao criar origem.' });
  }
};

// Atualizar origem
const updateOrigem = async (req, res) => {
  try {
    const atualizada = await Origem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(atualizada);
  } catch (error) {
    res.status(400).json({ error: 'Erro ao atualizar origem.' });
  }
};

// Deletar origem
const deleteOrigem = async (req, res) => {
  try {
    await Origem.findByIdAndDelete(req.params.id);
    res.json({ mensagem: 'Origem excluída com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir origem.' });
  }
};

module.exports = {
  getOrigens,
  createOrigem,
  updateOrigem,
  deleteOrigem,
};
