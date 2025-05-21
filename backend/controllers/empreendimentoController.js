// backend/controllers/empreendimentoController.js
const asyncHandler = require("../middlewares/asyncHandler"); // Nosso wrapper para try/catch
const empreendimentoService = require("../services/empreendimentoService");
const ErrorResponse = require("../utils/errorResponse"); // Nossa classe de erro customizada

/**  @desc    Criar um novo empreendimento
* @route   POST /api/empreendimentos
* @access  Privado (usuário logado da empresa)
*/
const createEmpreendimentoController = asyncHandler(async (req, res, next) => {
  const companyId = req.user.company; // Obtido do middleware 'protect'
  const empreendimentoData = req.body;

  if (
    !empreendimentoData.nome ||
    !empreendimentoData.tipo ||
    !empreendimentoData.statusEmpreendimento ||
    !empreendimentoData.localizacao?.cidade ||
    !empreendimentoData.localizacao?.uf
  ) {
    return next(
      new ErrorResponse(
        "Nome, tipo, status do empreendimento, cidade e UF da localização são obrigatórios.",
        400
      )
    );
  }

  const novoEmpreendimento = await empreendimentoService.createEmpreendimento(
    empreendimentoData,
    companyId
  );
  res.status(201).json({ success: true, data: novoEmpreendimento });
});

/** @desc    Listar todos os empreendimentos da empresa
 *  @route   GET /api/empreendimentos
 *  @access  Privado
 */
const getEmpreendimentosController = asyncHandler(async (req, res, next) => {
  const companyId = req.user.company;
  const { page = 1, limit = 10, ...filters } = req.query; // Pega page, limit e outros filtros da query

  const paginationOptions = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  // Remove 'page' e 'limit' dos filtros para não serem passados como condição de busca
  delete filters.page;
  delete filters.limit;

  const result = await empreendimentoService.getEmpreendimentosByCompany(
    companyId,
    filters,
    paginationOptions
  );
  res.status(200).json({ success: true, ...result });
});

/**  @desc    Buscar um empreendimento por ID
* @route   GET /api/empreendimentos/:id
* @access  Privado
*/
const getEmpreendimentoByIdController = asyncHandler(async (req, res, next) => {
  const companyId = req.user.company;
  const empreendimentoId = req.params.id;

  const empreendimento =
    await empreendimentoService.getEmpreendimentoByIdAndCompany(
      empreendimentoId,
      companyId
    );

  if (!empreendimento) {
    return next(
      new ErrorResponse(
        `Empreendimento com ID ${empreendimentoId} não encontrado para esta empresa ou está inativo.`,
        404
      )
    );
  }
  res.status(200).json({ success: true, data: empreendimento });
});

/**  @desc    Atualizar um empreendimento
* @route   PUT /api/empreendimentos/:id
* @access  Privado
*/
const updateEmpreendimentoController = asyncHandler(async (req, res, next) => {
  const companyId = req.user.company;
  const empreendimentoId = req.params.id;
  const updateData = req.body;

  const empreendimentoAtualizado =
    await empreendimentoService.updateEmpreendimento(
      empreendimentoId,
      updateData,
      companyId
    );

  // O serviço já lança erro se não encontrar ou não pertencer à empresa
  res.status(200).json({ success: true, data: empreendimentoAtualizado });
});

/**  @desc    Desativar (soft delete) um empreendimento
* @route   DELETE /api/empreendimentos/:id
* @access  Privado
*/
const deleteEmpreendimentoController = asyncHandler(async (req, res, next) => {
  const companyId = req.user.company;
  const empreendimentoId = req.params.id;

  const result = await empreendimentoService.deleteEmpreendimento(
    empreendimentoId,
    companyId
  );

  // O serviço já lança erro se não encontrar ou não pertencer à empresa
  res.status(200).json({ success: true, data: result }); // Retorna a mensagem do serviço
});

module.exports = {
  createEmpreendimentoController,
  getEmpreendimentosController,
  getEmpreendimentoByIdController,
  updateEmpreendimentoController,
  deleteEmpreendimentoController,
};
