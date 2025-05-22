// backend/services/unidadeService.js
const Unidade = require('../models/Unidade');
const Empreendimento = require('../models/Empreendimento'); // Para verificar o empreendimento pai
const mongoose = require('mongoose');

/**
 * Cria uma nova unidade associada a um empreendimento.
 * @param {object} unidadeData - Dados da unidade a ser criada.
 * @param {string} empreendimentoId - ID do empreendimento pai.
 * @param {string} companyId - ID da empresa proprietária (para verificação).
 * @returns {Promise<Unidade>} A unidade criada.
 */
const createUnidade = async (unidadeData, empreendimentoId, companyId) => {
    if (!empreendimentoId || !mongoose.Types.ObjectId.isValid(empreendimentoId) ||
        !companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error('ID do Empreendimento ou da Empresa inválido.');
    }
    if (!unidadeData || !unidadeData.identificador) { // Adicione outras validações de campos obrigatórios da Unidade se necessário
        throw new Error('Dados insuficientes para criar unidade. Identificador é obrigatório.');
    }

    // Verifica se o Empreendimento pai existe, pertence à empresa e está ativo
    const empreendimentoPai = await Empreendimento.findOne({
        _id: empreendimentoId,
        company: companyId,
        ativo: true
    }).lean(); // .lean() para pegar um objeto JS puro, já que só precisamos do companyId dele aqui

    if (!empreendimentoPai) {
        throw new Error('Empreendimento pai não encontrado, inativo ou não pertence a esta empresa.');
    }

    const novaUnidade = new Unidade({
        ...unidadeData,
        empreendimento: empreendimentoId,
        company: empreendimentoPai.company, // Garante que o companyId da unidade é o mesmo do empreendimento
        ativo: true // Garante que começa ativa
    });

    try {
        await novaUnidade.save();
        console.log(`[UnidadeService] Unidade criada: ${novaUnidade._id} para Empreendimento: ${empreendimentoId}`);
        return novaUnidade;
    } catch (error) {
        // O índice unique em { empreendimento: 1, identificador: 1 } no modelo Unidade cuidará da duplicidade
        if (error.code === 11000) {
            throw new Error(`Já existe uma unidade com o identificador "${novaUnidade.identificador}" neste empreendimento.`);
        }
        console.error("[UnidadeService] Erro ao criar unidade:", error);
        throw new Error(error.message || "Erro ao salvar nova unidade.");
    }
};

/**
 * Lista todas as unidades ativas de um empreendimento específico, com paginação.
 * @param {string} empreendimentoId - ID do empreendimento.
 * @param {string} companyId - ID da empresa (para verificação de propriedade do empreendimento).
 * @param {object} filters - Objeto com filtros para as unidades (ex: { statusUnidade: 'Disponível' }).
 * @param {object} paginationOptions - Opções de paginação (page, limit).
 * @returns {Promise<{unidades: Array<Unidade>, total: number, page: number, pages: number}>}
 */
const getUnidadesByEmpreendimento = async (empreendimentoId, companyId, filters = {}, paginationOptions = { page: 1, limit: 10 }) => {
    if (!empreendimentoId || !mongoose.Types.ObjectId.isValid(empreendimentoId) ||
        !companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error('ID do Empreendimento ou da Empresa inválido.');
    }

    // Primeiro, verifica se o empreendimento pertence à empresa (opcional, mas bom para segurança)
    const empreendimentoPai = await Empreendimento.findOne({ _id: empreendimentoId, company: companyId, ativo: true }).select('_id').lean();
    if (!empreendimentoPai) {
        throw new Error('Empreendimento não encontrado ou não pertence a esta empresa.');
    }

    const page = parseInt(paginationOptions.page, 10) || 1;
    const limit = parseInt(paginationOptions.limit, 10) || 100; // Default para listar mais unidades
    const skip = (page - 1) * limit;

    const queryConditions = {
        empreendimento: empreendimentoId,
        company: companyId, // Garante que as unidades também são filtradas pela empresa
        ativo: true,
        ...filters
    };

    for (const key in queryConditions) {
        if (queryConditions[key] === null || queryConditions[key] === undefined || queryConditions[key] === '') {
            delete queryConditions[key];
        }
    }

    console.log(`[UnidadeService] Buscando unidades para Empreendimento: ${empreendimentoId}, Condições:`, queryConditions);

    try {
        const unidades = await Unidade.find(queryConditions)
            .sort({ identificador: 1 }) // Ordena pelo identificador
            .skip(skip)
            .limit(limit)
            .lean(); // Retorna objetos JS puros

        const totalUnidades = await Unidade.countDocuments(queryConditions);

        console.log(`[UnidadeService] ${totalUnidades} unidades encontradas para Empreendimento: ${empreendimentoId}`);
        return {
            unidades,
            total: totalUnidades,
            page,
            pages: Math.ceil(totalUnidades / limit) || 1
        };
    } catch (error) {
        console.error(`[UnidadeService] Erro ao buscar unidades do empreendimento ${empreendimentoId}:`, error);
        throw new Error("Erro ao buscar unidades.");
    }
};

/**
 * Busca uma unidade específica por seu ID, garantindo que pertence ao empreendimento e empresa corretos.
 * @param {string} unidadeId - ID da unidade.
 * @param {string} empreendimentoId - ID do empreendimento pai.
 * @param {string} companyId - ID da empresa proprietária.
 * @returns {Promise<Unidade|null>} A unidade encontrada ou null.
 */
const getUnidadeById = async (unidadeId, empreendimentoId, companyId) => {
    if (!unidadeId || !mongoose.Types.ObjectId.isValid(unidadeId) ||
        !empreendimentoId || !mongoose.Types.ObjectId.isValid(empreendimentoId) ||
        !companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error('IDs de Unidade, Empreendimento ou Empresa inválidos.');
    }
    console.log(`[UnidadeService] Buscando unidade ID: ${unidadeId} do Empreendimento: ${empreendimentoId}, Company: ${companyId}`);
    try {
        const unidade = await Unidade.findOne({
            _id: unidadeId,
            empreendimento: empreendimentoId,
            company: companyId,
            ativo: true // Considerar se deve buscar inativas também em algum contexto
        }).lean();

        if (!unidade) {
            console.log(`[UnidadeService] Unidade ID: ${unidadeId} não encontrada ou não pertence ao Empreendimento/Empresa especificado ou está inativa.`);
            return null;
        }
        return unidade;
    } catch (error) {
        console.error(`[UnidadeService] Erro ao buscar unidade ${unidadeId}:`, error);
        throw new Error("Erro ao buscar unidade por ID.");
    }
};

/**
 * Atualiza uma unidade existente.
 * @param {string} unidadeId - ID da unidade a ser atualizada.
 * @param {object} updateData - Dados para atualizar.
 * @param {string} empreendimentoId - ID do empreendimento pai.
 * @param {string} companyId - ID da empresa proprietária.
 * @returns {Promise<Unidade>} A unidade atualizada.
 */
const updateUnidade = async (unidadeId, updateData, empreendimentoId, companyId) => {
    if (!unidadeId || !mongoose.Types.ObjectId.isValid(unidadeId) ||
        !empreendimentoId || !mongoose.Types.ObjectId.isValid(empreendimentoId) ||
        !companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error('IDs de Unidade, Empreendimento ou Empresa inválidos para atualização.');
    }
    console.log(`[UnidadeService] Atualizando unidade ID: ${unidadeId} do Empreendimento: ${empreendimentoId}`);

    // Campos que não devem ser alterados diretamente por esta função ou são controlados de outra forma
    delete updateData.empreendimento; // Não se pode mudar a unidade de empreendimento por aqui
    delete updateData.company;
    delete updateData.ativo;
    delete updateData.currentLeadId;
    delete updateData.currentReservaId;
    delete updateData._id;

    try {
        // Verifica se o identificador da unidade está sendo alterado e se já existe outro com o novo identificador no mesmo empreendimento
        if (updateData.identificador) {
            const existingUnidadeWithIdentificador = await Unidade.findOne({
                _id: { $ne: unidadeId }, // Exclui o próprio documento da checagem
                empreendimento: empreendimentoId,
                identificador: updateData.identificador,
                company: companyId // Garante que a verificação é dentro da mesma empresa
            });
            if (existingUnidadeWithIdentificador) {
                throw new Error(`Já existe uma unidade com o identificador "${updateData.identificador}" neste empreendimento.`);
            }
        }

        const unidadeAtualizada = await Unidade.findOneAndUpdate(
            { _id: unidadeId, empreendimento: empreendimentoId, company: companyId, ativo: true },
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!unidadeAtualizada) {
            throw new Error("Unidade não encontrada, não pertence ao Empreendimento/Empresa, ou está inativa.");
        }
        console.log(`[UnidadeService] Unidade ID: ${unidadeId} atualizada.`);
        return unidadeAtualizada;
    } catch (error) {
        if (error.code === 11000) { // Erro de índice único (identificador + empreendimento)
            throw new Error(`Já existe uma unidade com o identificador "${updateData.identificador}" neste empreendimento.`);
        }
        console.error(`[UnidadeService] Erro ao atualizar unidade ${unidadeId}:`, error);
        throw new Error(error.message || "Erro ao atualizar unidade.");
    }
};

/**
 * Desativa (soft delete) uma unidade.
 * @param {string} unidadeId - ID da unidade a ser desativada.
 * @param {string} empreendimentoId - ID do empreendimento pai.
 * @param {string} companyId - ID da empresa proprietária.
 * @returns {Promise<object>} Mensagem de sucesso.
 */
const deleteUnidade = async (unidadeId, empreendimentoId, companyId) => {
    if (!unidadeId || !mongoose.Types.ObjectId.isValid(unidadeId) ||
        !empreendimentoId || !mongoose.Types.ObjectId.isValid(empreendimentoId) ||
        !companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error('IDs de Unidade, Empreendimento ou Empresa inválidos para desativação.');
    }
    console.log(`[UnidadeService] Desativando unidade ID: ${unidadeId} do Empreendimento: ${empreendimentoId}`);

    // Verifica se a unidade pode ser desativada (ex: não pode se estiver Vendida ou com Reserva/Proposta Ativa)
    const unidade = await Unidade.findOne({
         _id: unidadeId,
         empreendimento: empreendimentoId,
         company: companyId,
         ativo: true
    });

    if (!unidade) {
        throw new Error("Unidade não encontrada, já está inativa ou não pertence ao Empreendimento/Empresa.");
    }

    // Regra de Negócio: Não permitir desativar se estiver Vendida, Reservada ou com Proposta Aceita
    const nonDeletableStatus = ["Reservada", "Proposta Aceita", "Vendido"];
    if (nonDeletableStatus.includes(unidade.statusUnidade)) {
        throw new Error(`Não é possível desativar uma unidade que está com status "${unidade.statusUnidade}".`);
    }

    try {
        unidade.ativo = false;
        // Opcional: Mudar status para 'Bloqueado' ou 'Indisponível' ao desativar
        // unidade.statusUnidade = "Bloqueado"; 
        await unidade.save();

        console.log(`[UnidadeService] Unidade ID: ${unidadeId} desativada.`);
        return { message: "Unidade desativada com sucesso." };
    } catch (error) {
        console.error(`[UnidadeService] Erro ao desativar unidade ${unidadeId}:`, error);
        throw new Error(error.message || "Erro ao desativar unidade.");
    }
};



module.exports = {
    createUnidade,
    getUnidadesByEmpreendimento,
    getUnidadeById,
    updateUnidade,
    deleteUnidade
};