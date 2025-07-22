const mongoose = require('mongoose');
const { Schema } = mongoose;

const evolutionInstanceSchema = new Schema({
    instanceName: {
        type: String,
        required: true,
        trim: true
    },
    instanceId: { // ID retornado pela Evolution API
        type: String,
        required: true,
        unique: true
    },

    receiveFromGroups: {
        type: Boolean,
        default: false
    },

    apiKey: { // API Key específica desta instância, retornada pela Evolution API
        type: String,
        required: true
    },
    status: {
        type: String,
        default: 'created' // Ex: created, connecting, connected
    },
    ownerNumber: {
        type: String
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

// Garante que cada empresa só pode ter uma instância com o mesmo nome
evolutionInstanceSchema.index({ company: 1, instanceName: 1 }, { unique: true });

const EvolutionInstance = mongoose.model('EvolutionInstance', evolutionInstanceSchema);
module.exports = EvolutionInstance;