const mongoose = require('mongoose');
const { Schema } = mongoose;

const taskSchema = new Schema({
    title: {
        type: String,
        required: [true, 'O título da tarefa é obrigatório.'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['Pendente', 'Concluída'],
        default: 'Pendente',
        index: true
    },
    dueDate: { // Data e Hora de Vencimento
        type: Date,
        required: [true, 'A data de vencimento é obrigatória.']
    },
    lead: { // A tarefa é associada a um Lead
        type: Schema.Types.ObjectId,
        ref: 'Lead',
        required: true,
        index: true
    },
    assignedTo: { // Usuário do CRM responsável pela tarefa
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

taskSchema.index({ company: 1, status: 1, dueDate: 1 });

const Task = mongoose.model('Task', taskSchema);
module.exports = Task;