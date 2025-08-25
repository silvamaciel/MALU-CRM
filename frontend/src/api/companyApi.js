import axiosInstance from "./axiosInstance";

export const getCompanySettingsApi = async () => {
    const response = await axiosInstance.get('/companies/settings');
    return response.data.data;
};

export const updateCompanySettingsApi = async (settings) => {
    const response = await axiosInstance.put('/companies/settings', settings);
    return response.data;
};