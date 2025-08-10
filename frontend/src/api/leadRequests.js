import axiosInstance from './axiosInstance';

export const submitLeadRequestPublicApi = async (payload) => {
  const { data } = await axiosInstance.post('/public/lead-requests', payload);
  return data?.data;
};

export const getLeadRequests = async (status) => {
  const { data } = await axiosInstance.get('/lead-requests', { params: { status } });
  return Array.isArray(data) ? data : [];
};

export const approveLeadRequest = async (id) => {
  const { data } = await axiosInstance.post(`/lead-requests/${id}/approve`);
  return data?.data;
};

export const rejectLeadRequest = async (id, reason) => {
  const { data } = await axiosInstance.post(`/lead-requests/${id}/reject`, { reason });
  return data?.data;
};


