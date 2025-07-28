const Task = require('../models/Task');
const Lead = require('../models/Lead');
const mongoose = require('mongoose');

/**
 * Cria uma nova tarefa.
 */
const createTask = async (taskData, companyId, userId) => {
    const { title, dueDate, lead, assignedTo } = taskData;

    if (!title || !dueDate || !lead) {
        throw new Error('Título, data de vencimento e lead são obrigatórios.');
    }

    // Valida se o Lead pertence à empresa
    const leadDoc = await Lead.findOne({ _id: lead, company: companyId });
    if (!leadDoc) {
        throw new Error("Lead não encontrado ou não pertence a esta empresa.");
    }

    // FORÇA assignedTo ser o userId autenticado (ignorando o que vem do frontend)
    const task = new Task({
        ...taskData,
        assignedTo: userId,
        company: companyId,
        createdBy: userId
    });

    await task.save();

    return task.populate([
        { path: 'lead', select: 'nome' },
        { path: 'assignedTo', select: 'nome' }
    ]);
};

/**
 * Busca tarefas com filtros.
 */
const getTasks = async (companyId, filters) => {
    const queryConditions = { company: companyId, ...filters };
    return Task.find(queryConditions)
        .populate('lead', 'nome')
        .populate('assignedTo', 'nome')
        .sort({ dueDate: 1 }); // Ordena por data de vencimento
};

/**
 * Atualiza uma tarefa (ex: marcar como concluída).
 */
const updateTask = async (taskId, updateData, companyId) => {
    const task = await Task.findOneAndUpdate(
        { _id: taskId, company: companyId },
        { $set: updateData },
        { new: true, runValidators: true }
    );
    if (!task) throw new Error("Tarefa não encontrada.");
    return task;
};

/**
 * Deleta uma tarefa.
 */
const deleteTask = async (taskId, companyId) => {
    const result = await Task.deleteOne({ _id: taskId, company: companyId });
    if (result.deletedCount === 0) throw new Error("Tarefa não encontrada.");
    return { message: "Tarefa deletada com sucesso." };
};

module.exports = {
    createTask,
    getTasks,
    updateTask,
    deleteTask
};