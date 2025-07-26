// backend/models/Conversation.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const conversationSchema = new Schema({
    lead: { type: Schema.Types.ObjectId, ref: 'Lead', required: false, default: null },
    leadNameSnapshot: { type: String, trim: true },
    tempContactName: { type: String, trim: true },
    company: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    channel: {
        type: String,
        required: true,
        enum: ['WhatsApp', 'Instagram', 'FacebookMessenger'],
        default: 'WhatsApp'
    },
    channelInternalId: { // Ex: o número de telefone com JID do WhatsApp
        type: String,
        required: true
    },
    lastMessage: { type: String },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    unreadCount: { type: Number, default: 0 }
}, { timestamps: true });

// Garante que só exista uma conversa por lead/canal
conversationSchema.index({ lead: 1, channel: 1 }, { unique: true });

const Conversation = mongoose.model('Conversation', conversationSchema);
module.exports = Conversation;