// controllers/discardReasonController.js
const discardReasonService = require('../services/discardReasonService');

const getAllDiscardReasons = async (req, res) => {
  try {
    const reasons = await discardReasonService.getAllDiscardReasons();
    res.json(reasons);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const createDiscardReason = async (req, res) => {
    try {
      const newReason = await discardReasonService.createDiscardReason(req.body);
      res.status(201).json(newReason);
    } catch (error) {
      // Se for erro de nome duplicado/existente, pode ser 409 (Conflict) ou 400
      const statusCode = error.message.includes("já existe") ? 409 : 400;
      res.status(statusCode).json({ error: error.message });
    }
  };
  
  // <<< NOVO CONTROLLER: Atualizar Motivo >>>
  const updateDiscardReason = async (req, res) => {
      try {
          const updatedReason = await discardReasonService.updateDiscardReason(req.params.id, req.body);
          res.json(updatedReason);
      } catch (error) {
           const statusCode = error.message.includes("não encontrado") ? 404 : (error.message.includes("já existe") ? 409 : 400);
          res.status(statusCode).json({ error: error.message });
      }
  };
  
  // <<< NOVO CONTROLLER: Deletar Motivo >>>
  const deleteDiscardReason = async (req, res) => {
       try {
          const result = await discardReasonService.deleteDiscardReason(req.params.id);
          res.json(result); // Retorna a mensagem de sucesso do serviço
          // Alternativa: res.status(204).send(); // No Content
       } catch (error) {
           const statusCode = error.message.includes("não encontrado") ? 404 : (error.message.includes("sendo usado") ? 400 : 500);
           res.status(statusCode).json({ error: error.message });
       }
  };
  
  module.exports = {
    getAllDiscardReasons,
    createDiscardReason, 
    updateDiscardReason, 
    deleteDiscardReason  
  };

