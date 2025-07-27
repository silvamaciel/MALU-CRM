const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const TaskController = require('../controllers/TaskController');

router.use(protect); // Todas as rotas de tarefas são protegidas

router.route('/')
    .get(TaskController.getAllTasks)
    .post(TaskController.createTask);

router.route('/:id')
    .put(TaskController.updateTask)
    .delete(TaskController.deleteTask);

module.exports = router;