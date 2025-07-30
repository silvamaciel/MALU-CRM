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
 * Busca tarefas com filtros e retorna um resumo com KPIs.
 */
const getTasks = async (companyId, filters) => {
    console.log(`[TaskService] Buscando tarefas para Company: ${companyId} com filtros:`, filters);

    // Condições base para a busca
    const matchConditions = { company: new mongoose.Types.ObjectId(companyId) };
    if (filters.status) {
        matchConditions.status = filters.status;
    }
    if (filters.assignedTo) {
        matchConditions.assignedTo = new mongoose.Types.ObjectId(filters.assignedTo);
    }
    if (filters.lead) {
        matchConditions.lead = new mongoose.Types.ObjectId(filters.lead);
    }

    const hoje = new Date();

    try {
        // Usamos $facet para realizar múltiplas agregações em uma única consulta
        const results = await Task.aggregate([
            {
                $facet: {
                    // Pipeline 1: Busca a lista de tarefas filtradas
                    'tasksList': [
                        { $match: matchConditions },
                        { $sort: { dueDate: 1 } },
                        { $lookup: { from: 'leads', localField: 'lead', foreignField: '_id', as: 'lead' } },
                        { $lookup: { from: 'users', localField: 'assignedTo', foreignField: '_id', as: 'assignedTo' } },
                        { $unwind: { path: "$lead", preserveNullAndEmptyArrays: true } },
                        { $unwind: { path: "$assignedTo", preserveNullAndEmptyArrays: true } },
                        { $project: {
                            // ... selecione os campos que o frontend precisa
                            title: 1, description: 1, status: 1, dueDate: 1,
                            'lead._id': 1, 'lead.nome': 1,
                            'assignedTo._id': 1, 'assignedTo.nome': 1,
                            createdAt: 1
                        }}
                    ],
                    // Pipeline 2: Calcula os KPIs
                    'kpis': [
                        // Considera apenas as tarefas do utilizador logado para os KPIs
                        { $match: { company: new mongoose.Types.ObjectId(companyId), assignedTo: new mongoose.Types.ObjectId(filters.assignedTo) } },
                        {
                            $group: {
                                _id: null,
                                concluidas: {
                                    $sum: { $cond: [{ $eq: ['$status', 'Concluída'] }, 1, 0] }
                                },
                                vencidas: {
                                    $sum: { $cond: [{ $and: [ { $eq: ['$status', 'Pendente'] }, { $lt: ['$dueDate', hoje] } ] }, 1, 0] }
                                },
                                aVencer: {
                                    $sum: { $cond: [{ $and: [ { $eq: ['$status', 'Pendente'] }, { $gte: ['$dueDate', hoje] } ] }, 1, 0] }
                                }
                            }
                        }
                    ]
                }
            }
        ]);

        const tasks = results[0].tasksList;
        const kpis = results[0].kpis[0] || { concluidas: 0, vencidas: 0, aVencer: 0 };

        console.log(`[TaskService] Encontradas ${tasks.length} tarefas e KPIs calculados.`);
        
        return { tasks, kpis };

    } catch (error) {
        console.error("[TaskService] Erro ao buscar tarefas com agregação:", error);
        throw new Error("Erro ao buscar tarefas.");
    }
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