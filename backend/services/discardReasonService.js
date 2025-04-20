// services/discardReasonService.js
const mongoose = require("mongoose"); 
const DiscardReason = require("../models/DiscardReason");

// Função para buscar todos os motivos (ordenados por nome)
const getAllDiscardReasons = async () => {
  try {
    const reasons = await DiscardReason.find().sort({ nome: 1 });
    return reasons;
  } catch (error) {
    console.error("Erro ao buscar motivos de descarte:", error);
    throw new Error("Falha ao buscar motivos de descarte.");
  }
};

const createDiscardReason = async (reasonData) => {
  const { nome } = reasonData;
  if (!nome || typeof nome !== "string" || nome.trim() === "") {
    throw new Error("O nome do motivo é obrigatório.");
  }
  try {
    // Verifica se já existe (opcional, mas bom por causa do unique index)
    const existing = await DiscardReason.findOne({ nome: nome.trim() });
    if (existing) {
      throw new Error(`Motivo de descarte "${nome.trim()}" já existe.`);
    }
    const newReason = new DiscardReason({ nome: nome.trim() });
    await newReason.save();
    return newReason;
  } catch (error) {
    // Trata erro de chave duplicada do unique index também
    if (error.code === 11000) {
      throw new Error(`Motivo de descarte "${nome.trim()}" já existe.`);
    }
    console.error("Erro ao criar motivo de descarte:", error);
    throw new Error(error.message || "Falha ao criar motivo de descarte.");
  }
};

const updateDiscardReason = async (id, reasonData) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("ID inválido.");
  }
  const { nome } = reasonData;
  if (!nome || typeof nome !== "string" || nome.trim() === "") {
    throw new Error("O nome do motivo é obrigatório para atualização.");
  }
  try {
    // Verifica se o novo nome já existe em OUTRO documento
    const existing = await DiscardReason.findOne({
      nome: nome.trim(),
      _id: { $ne: id },
    });
    if (existing) {
      throw new Error(`Outro motivo já existe com o nome "${nome.trim()}".`);
    }

    const updatedReason = await DiscardReason.findByIdAndUpdate(
      id,
      { nome: nome.trim() },
      { new: true, runValidators: true } // Retorna o doc atualizado e roda validadores do schema
    );
    if (!updatedReason) {
      throw new Error("Motivo de descarte não encontrado.");
    }
    return updatedReason;
  } catch (error) {
    if (error.code === 11000) {
      throw new Error(`Outro motivo já existe com o nome "${nome.trim()}".`);
    }
    console.error(`Erro ao atualizar motivo ${id}:`, error);
    throw new Error(error.message || "Falha ao atualizar motivo de descarte.");
  }
};

const deleteDiscardReason = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("ID inválido.");
  }
  try {
    // Verificar se este motivo está sendo usado por algum Lead antes de deletar
    const leadUsingReason = await Lead.findOne({ motivoDescarte: id });
    if (leadUsingReason) {
      throw new Error(
        "Não é possível excluir: Este motivo está sendo usado por leads."
      );
    }

    const deletedReason = await DiscardReason.findByIdAndDelete(id);
    if (!deletedReason) {
      throw new Error("Motivo de descarte não encontrado.");
    }
    return { message: "Motivo de descarte excluído com sucesso." };
  } catch (error) {
    console.error(`Erro ao deletar motivo ${id}:`, error);
    throw new Error(error.message || "Falha ao excluir motivo de descarte.");
  }
};

module.exports = {
  getAllDiscardReasons,
  createDiscardReason,
  updateDiscardReason,
  deleteDiscardReason,
};
