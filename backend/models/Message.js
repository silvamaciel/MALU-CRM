// backend/models/Message.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const messageSchema = new Schema({
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    company: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    channelMessageId: { type: String, unique: true, sparse: true }, // ID da mensagem na plataforma de origem
    direction: {
        type: String,
        required: true,
        enum: ['incoming', 'outgoing'] // Mensagem recebida ou enviada
    },
    senderId: { type: String }, // Pode ser o JID do cliente ou o ID do usuário do CRM
    content: { type: String, required: true, trim: true },
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read', 'failed'],
        default: 'sent'
    }
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;