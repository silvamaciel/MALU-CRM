import axiosInstance from "./axiosInstance";

export const listConversationsApi = async () => {
    const response = await axiosInstance.get('/chat/conversations');
    return response.data.data;
};

export const getMessagesApi = async (conversationId) => {
    const response = await axiosInstance.get(`/chat/conversations/${conversationId}/messages`);
    return response.data.data;
};

export const sendMessageApi = async (conversationId, content) => {
    const response = await axiosInstance.post(`/chat/conversations/${conversationId}/messages`, { content });
    return response.data.data;
};