const asyncHandler = require('../middlewares/asyncHandler');
const TaskService = require('../services/TaskService');

const getAllTasks = asyncHandler(async (req, res, next) => {
    const filters = req.query; // Permite filtros como ?status=Pendente ou ?lead=LEAD_ID
    
    filters.assignedTo = req.user._id; 
    const tasks = await TaskService.getTasks(req.user.company, filters);
    res.status(200).json({ success: true, count: tasks.length, data: tasks });
});

const createTask = asyncHandler(async (req, res, next) => {
    const task = await TaskService.createTask(req.body, req.user.company, req.user._id);
    res.status(201).json({ success: true, data: task });
});

const updateTask = asyncHandler(async (req, res, next) => {
    const task = await TaskService.updateTask(req.params.id, req.body, req.user.company);
    res.status(200).json({ success: true, data: task });
});

const deleteTask = asyncHandler(async (req, res, next) => {
    await TaskService.deleteTask(req.params.id, req.user.company);
    res.status(200).json({ success: true, data: {} });
});

module.exports = { getAllTasks, createTask, updateTask, deleteTask };