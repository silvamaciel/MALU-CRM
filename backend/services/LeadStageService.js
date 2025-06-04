// services/LeadStageService.js
const mongoose = require('mongoose');
const LeadStage = require('../models/LeadStage');
const Lead = require('../models/Lead'); // Para checar uso antes de deletar

const DESCARTADO_ORDER_VALUE = 9999;

/**
 * Lista todas as situações ATIVAS de uma empresa específica, ordenadas por 'ordem'.
 * @param {string} companyId - ID da empresa.
 */
const getAllLeadStages = async (companyId) => {
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
         throw new Error('ID da empresa inválido ou não fornecido para buscar situações.');
    }
    try {
        // <<< FILTRA por companyId e ativo=true, ORDENA por ordem e nome >>>
        return await LeadStage.find({ company: companyId, ativo: true })
                           .sort({ ordem: 1, nome: 1 });
    } catch (error) {
        console.error(`[LSvc] Erro ao buscar situações para empresa ${companyId}:`, error);
        throw new Error('Erro ao buscar situações.');
    }
};


/**
 * Cria uma nova situação para uma empresa específica, calculando a ordem.
 * @param {object} stageData - Dados da situação (ex: { nome: 'Nova' }).
 * @param {string} companyId - ID da empresa onde criar a situação.
 */
// <<< Recebe companyId como argumento separado >>>
const createLeadStage = async (stageData, companyId) => {
    const { nome } = stageData; // Ordem será calculada
    if (!nome || typeof nome !== 'string' || nome.trim() === '') {
        throw new Error('O nome da situação é obrigatório.');
    }
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
         throw new Error('ID da empresa inválido ou não fornecido para criar situação.');
    }

    const nomeTrimmed = nome.trim();
    let ordemCalculada = 0;

    try {
        // <<< MELHORIA: Verifica nome duplicado NA MESMA EMPRESA >>>
        const existingStage = await LeadStage.findOne({
            nome: { $regex: new RegExp(`^${nomeTrimmed}$`, 'i') },
            company: companyId // <<< FILTRA por empresa
        });
        if (existingStage) {
            throw new Error(`Situação '${nomeTrimmed}' já existe nesta empresa.`);
        }

        // <<< LÓGICA DE ORDEM (igual à anterior) >>>
        if (nomeTrimmed.toLowerCase() === 'descartado') {
            ordemCalculada = DESCARTADO_ORDER_VALUE;
            const existingDescartado = await LeadStage.findOne({
                 nome: { $regex: /^descartado$/i },
                 company: companyId // <<< FILTRA por empresa
            });
            if (existingDescartado) { throw new Error("Situação 'Descartado' já existe nesta empresa."); }
        } else {
            const lastStage = await LeadStage.findOne({
                company: companyId, // <<< FILTRA por empresa
                ordem: { $lt: DESCARTADO_ORDER_VALUE }
            }).sort({ ordem: -1 });
            ordemCalculada = (lastStage ? lastStage.ordem : -1) + 1;
        }
        // <<< FIM LÓGICA DE ORDEM >>>

        const novaSituacao = new LeadStage({
            nome: nomeTrimmed,
            ordem: ordemCalculada,
            company: companyId // <<< SALVA o companyId
        });
        await novaSituacao.save();
        console.log(`[LSvc] Situação criada para empresa ${companyId}:`, novaSituacao._id);
        return novaSituacao;

    } catch (error) {
        if (error.message.includes("já existe")) throw error;
        console.error(`[LSvc] Erro ao criar situação para empresa ${companyId}:`, error);
        throw new Error('Erro ao criar situação.');
    }
};

/**
 * Atualiza uma situação existente de uma empresa específica.
 * @param {string} id - ID da situação.
 * @param {string} companyId - ID da empresa proprietária.
 * @param {object} updateData - Dados para atualizar (ex: { nome: 'Novo Nome', ordem: 2, ativo: false }).
 */
// <<< Recebe companyId como argumento separado >>>
const updateLeadStage = async (id, companyId, updateData) => {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("ID da situação inválido.");
    if (!mongoose.Types.ObjectId.isValid(companyId)) throw new Error("ID da empresa inválido.");

    const { nome, ordem, ativo } = updateData;
    const fieldsToUpdate = {};
    let hasUpdate = false; // Flag para verificar se há algo a atualizar

    if (nome !== undefined) {
        if(typeof nome !== 'string' || nome.trim() === '') throw new Error('Nome inválido.');
        fieldsToUpdate.nome = nome.trim();
        hasUpdate = true;
    }
    if (ordem !== undefined) {
        fieldsToUpdate.ordem = parseInt(ordem, 10);
        if (isNaN(fieldsToUpdate.ordem)) throw new Error('Ordem inválida.');
        hasUpdate = true;
    }
     if (ativo !== undefined) {
         fieldsToUpdate.ativo = Boolean(ativo);
         hasUpdate = true;
     }

    if (!hasUpdate) { throw new Error("Nenhum dado válido fornecido para atualização."); }

    try {
        // Validações antes de atualizar (duplicidade, nome 'Descartado', etc.)
        const currentStage = await LeadStage.findOne({_id: id, company: companyId });
        if (!currentStage) throw new Error('Situação não encontrada ou não pertence a esta empresa.');

        if (fieldsToUpdate.nome && fieldsToUpdate.nome.toLowerCase() !== currentStage.nome.toLowerCase()) {
             // Verifica nome duplicado se o nome está mudando
             const existingStage = await LeadStage.findOne({
                  nome: { $regex: new RegExp(`^${fieldsToUpdate.nome}$`, 'i') },
                  company: companyId,
                  _id: { $ne: id }
             });
             if (existingStage) throw new Error(`Já existe outra situação com o nome '${fieldsToUpdate.nome}' nesta empresa.`);

             // Impede renomear para "Descartado" se já existir outro "Descartado"
             if(fieldsToUpdate.nome.toLowerCase() === 'descartado') {
                 const existingDescartado = await LeadStage.findOne({ nome: { $regex: /^descartado$/i }, company: companyId, _id: { $ne: id } });
                 if (existingDescartado) throw new Error("Já existe uma situação 'Descartado' nesta empresa.");
             }
             // Impede renomear a situação que é "Descartado"
             if (currentStage.nome.toLowerCase() === 'descartado') {
                  throw new Error("Não é possível renomear a situação 'Descartado'.");
             }
        }
         // Impede alterar ordem do "Descartado"
         if (currentStage.nome.toLowerCase() === 'descartado' && fieldsToUpdate.ordem !== undefined && fieldsToUpdate.ordem !== DESCARTADO_ORDER_VALUE) {
            // Permitir mudar a ordem DE VOLTA para o valor alto se foi alterada por engano? Ou só impedir? Vamos impedir.
            // delete fieldsToUpdate.ordem; // Remove a tentativa de alterar a ordem
             throw new Error("Não é possível alterar a ordem da situação 'Descartado'.");
         }

        // <<< ATUALIZA filtrando por ID E companyId >>>
        const updatedStage = await LeadStage.findOneAndUpdate(
            { _id: id, company: companyId }, // Garante que só atualiza se for da empresa certa
            fieldsToUpdate,
            { new: true, runValidators: true }
        );
        // findOneAndUpdate retorna null se o filtro não encontrar nada
        if (!updatedStage) {
            throw new Error('Situação não encontrada ou não pertence a esta empresa (update falhou).');
        }
        console.log(`[LSvc] Situação atualizada para empresa ${companyId}:`, id);
        return updatedStage;

    } catch (error) {
        if (error.message.includes("já existe")) throw error;
        console.error(`[LSvc] Erro ao atualizar situação ${id} para empresa ${companyId}:`, error);
        throw new Error(error.message || 'Erro ao atualizar situação.');
    }
};

/**
 * Exclui uma situação de uma empresa específica.
 * @param {string} id - ID da situação.
 * @param {string} companyId - ID da empresa proprietária.
 */
// <<< Recebe companyId como argumento separado >>>
const deleteLeadStage = async (id, companyId) => {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("ID da situação inválido.");
    if (!mongoose.Types.ObjectId.isValid(companyId)) throw new Error("ID da empresa inválido.");

    try {
        // <<< Busca filtrando por ID E companyId >>>
        const stageToDelete = await LeadStage.findOne({ _id: id, company: companyId });
        if (!stageToDelete) {
            throw new Error('Situação não encontrada ou não pertence a esta empresa.');
        }

        // Impede excluir "Descartado"
        if (stageToDelete.nome.toLowerCase() === 'descartado') {
            throw new Error("A situação 'Descartado' não pode ser excluída.");
        }

        // <<< Verifica se está em uso por Leads DA MESMA EMPRESA >>>
        const leadCount = await Lead.countDocuments({ situacao: id, company: companyId });
        if (leadCount > 0) {
            throw new Error(`Não é possível excluir: A situação "${stageToDelete.nome}" está sendo usada por ${leadCount} lead(s) desta empresa.`);
        }

        // <<< Deleta filtrando por ID E companyId >>>
        await LeadStage.deleteOne({ _id: id, company: companyId });
        console.log(`[LSvc] Situação excluída para empresa ${companyId}:`, id);
        return { message: `Situação "${stageToDelete.nome}" excluída com sucesso.` };

    } catch (error) {
        console.error(`[LSvc] Erro ao excluir situação ${id} para empresa ${companyId}:`, error);
        throw new Error(error.message || 'Erro ao excluir situação.');
    }
};


/**
 * Atualiza a ordem de múltiplas LeadStages para uma empresa.
 * @param {string} companyId - ID da empresa.
 * @param {string[]} orderedStageIds - Array de IDs de LeadStage na nova ordem desejada.
 * @returns {Promise<object>} Resultado da operação.
 */
const updateLeadStagesOrder = async (companyId, orderedStageIds) => {
    console.log(`[LStageSvc] Atualizando ordem das LeadStages para Company: ${companyId}`);
    if (!companyId || !Array.isArray(orderedStageIds)) {
        throw new Error("ID da empresa e um array de IDs de estágio ordenados são obrigatórios.");
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const updatePromises = orderedStageIds.map((stageId, index) => {
            if (!mongoose.Types.ObjectId.isValid(stageId)) {
                throw new Error(`ID de estágio inválido fornecido: ${stageId}`);
            }
            return LeadStage.updateOne(
                { _id: stageId, company: companyId },
                { $set: { ordem: index } }, // Define a ordem baseada no índice do array
                { session }
            );
        });

        const results = await Promise.all(updatePromises);

        // Verificar se todas as atualizações foram bem-sucedidas (opcional, mas bom)
        results.forEach((result, index) => {
            if (result.matchedCount === 0) {
                console.warn(`[LStageSvc] Estágio com ID ${orderedStageIds[index]} não encontrado para a empresa ${companyId} ou já estava na ordem correta.`);
            }
            if (result.modifiedCount === 0 && result.matchedCount > 0) {
                console.log(`[LStageSvc] Estágio ${orderedStageIds[index]} já estava na ordem correta ou não precisou de modificação.`);
            }
        });

        await session.commitTransaction();
        console.log(`[LStageSvc] Ordem das LeadStages atualizada com sucesso para Company: ${companyId}.`);
        return { success: true, message: "Ordem das situações atualizada com sucesso." };
    } catch (error) {
        await session.abortTransaction();
        console.error("[LStageSvc] Erro ao atualizar ordem das LeadStages:", error);
        throw new Error(error.message || "Erro interno ao atualizar a ordem das situações.");
    } finally {
        session.endSession();
    }
};
module.exports = {
    getAllLeadStages,
    createLeadStage,
    updateLeadStage,
    deleteLeadStage,
    updateLeadStagesOrder
};