import axiosInstance from "./axiosInstance";

const norm = (r) => r?.data ?? r;
const arr  = (v) => (Array.isArray(v) ? v : []);

export const listConversationsApi = async (params = {}) => {
  const body = norm(await axiosInstance.get('/chat/conversations', { params }));
  return {
    items: arr(body.items) || arr(body.data),
    nextCursor: body.nextCursor ?? null,
  };
};

export const getMessagesApi = async (conversationId, params = {}) => {
  const body = norm(await axiosInstance.get(`/chat/conversations/${conversationId}/messages`, { params }));
  return {
    items: arr(body.items) || arr(body.data),
    nextBefore: body.nextBefore ?? null,
  };
};

export const sendMessageApi = async (conversationId, content) => {
  const body = norm(await axiosInstance.post(`/chat/conversations/${conversationId}/messages`, { content }));
  return body.data ?? body;
};

export const createLeadFromConversationApi = async (conversationId) => {
  const body = norm(await axiosInstance.post(`/chat/conversations/${conversationId}/create-lead`));
  return body.data ?? body;
};
