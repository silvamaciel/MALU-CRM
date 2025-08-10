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
    contentType: {
        type: String,
        required: true,
        enum: ['text', 'image', 'audio', 'document', 'other'],
        default: 'text'
    },
    content: { type: String, required: true, trim: true }, 
    mediaUrl: { type: String, trim: true }, 
    mediaMimeType: { type: String, trim: true },
    read: { type: Boolean, default: false, index: true },
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read', 'failed'],
        default: 'sent'
    }
}, { timestamps: true });

messageSchema.index({ conversation: 1, createdAt: -1 });


const Message = mongoose.model('Message', messageSchema);
module.exports = Message;