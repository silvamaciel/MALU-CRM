const mongoose = require('mongoose');
const ImovelAvulso = require('../models/ImovelAvulso');

// Criar um novo Imóvel Avulso
const createImovel = async (imovelData, companyId, userId) => {
    const imovel = new ImovelAvulso({ ...imovelData, company: companyId, responsavel: userId });
    await imovel.save();
    return imovel;
};

// Buscar Imóveis com filtros e paginação
const getImoveis = async (companyId, queryParams) => {
    const page = parseInt(queryParams.page, 10) || 1;
    const limit = parseInt(queryParams.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const queryConditions = { company: companyId };
    
    if (queryParams.cidade) queryConditions['endereco.cidade'] = { $regex: queryParams.cidade, $options: 'i' };
    if (queryParams.bairro) queryConditions['endereco.bairro'] = { $regex: queryParams.bairro, $options: 'i' };
    if (queryParams.tipoImovel) queryConditions.tipoImovel = queryParams.tipoImovel;
    if (queryParams.quartos) queryConditions.quartos = { $gte: parseInt(queryParams.quartos, 10) };
    if (queryParams.status) queryConditions.status = queryParams.status;
    
    const [total, imoveis] = await Promise.all([
        ImovelAvulso.countDocuments(queryConditions),
        ImovelAvulso.find(queryConditions)
            .populate('responsavel', 'nome email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean()
    ]);
    
    const totalPages = Math.ceil(total / limit) || 1;
    return { imoveis, total, totalPages, currentPage: page };
};

// Buscar um Imóvel por ID
const getImovelById = async (id, companyId) => {
    return ImovelAvulso.findOne({ _id: id, company: companyId }).populate('responsavel', 'nome email').lean();
};

// Atualizar um Imóvel
const updateImovel = async (id, updateData, companyId) => {
    const imovel = await ImovelAvulso.findOneAndUpdate(
        { _id: id, company: companyId },
        { $set: updateData },
        { new: true, runValidators: true }
    );
    if (!imovel) throw new Error("Imóvel não encontrado ou não pertence a esta empresa.");
    return imovel;
};

// Deletar um Imóvel
const deleteImovel = async (id, companyId) => {
    const imovel = await ImovelAvulso.findOne({ _id: id, company: companyId });
    if (!imovel) throw new Error("Imóvel não encontrado ou não pertence a esta empresa.");
    if (['Reservado', 'Vendido'].includes(imovel.status)) {
        throw new Error(`Não é possível excluir um imóvel com status '${imovel.status}'.`);
    }
    await imovel.deleteOne();
    return { message: "Imóvel excluído com sucesso." };
};

module.exports = {
    createImovel,
    getImoveis,
    getImovelById,
    updateImovel,
    deleteImovel
};