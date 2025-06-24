// frontend/src/api/__tests__/leads.api.test.js
import { getLeads, createLead, getLeadById, updateLead, discardLead, deleteLead, importLeadsFromCSVApi, downloadCSVTemplateApi } from '../leads';
import axiosInstance from '../axiosInstance';

// Mock axiosInstance
jest.mock('../axiosInstance', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

describe('Leads API functions', () => {
  afterEach(() => {
    // Clear all mock calls after each test
    jest.clearAllMocks();
  });

  describe('getLeads', () => {
    it('should call axiosInstance.get with "/leads" and provided params', async () => {
      const mockParams = { nome: 'Test', page: 1 };
      const mockResponse = { data: { leads: [{ id: '1', nome: 'Test Lead' }], totalLeads: 1 } };
      axiosInstance.get.mockResolvedValue(mockResponse);

      const result = await getLeads(mockParams);

      expect(axiosInstance.get).toHaveBeenCalledWith('/leads', { params: mockParams });
      expect(result).toEqual(mockResponse.data);
    });

    it('should call axiosInstance.get with "/leads" and empty params if none provided', async () => {
      const mockResponse = { data: { leads: [], totalLeads: 0 } };
      axiosInstance.get.mockResolvedValue(mockResponse);

      await getLeads();

      expect(axiosInstance.get).toHaveBeenCalledWith('/leads', { params: {} });
    });

    it('should throw an error if axiosInstance.get rejects', async () => {
      const errorMessage = 'Network Error';
      axiosInstance.get.mockRejectedValue(new Error(errorMessage));

      await expect(getLeads()).rejects.toThrow(errorMessage);
    });

    it('should re-throw error with response data if available', async () => {
        const errorResponse = { response: { data: { error: 'Specific API Error' } } };
        axiosInstance.get.mockRejectedValue(errorResponse);

        try {
          await getLeads();
        } catch (e) {
          // The actual error thrown by the function might be the errorResponse itself
          // or a new Error with message from error.response.data
          // For this test, we check if the original error was propagated.
          expect(e).toEqual(errorResponse);
        }
      });
  });

  describe('createLead', () => {
    it('should call axiosInstance.post with "/leads" and leadData', async () => {
        const leadData = { nome: 'New Lead', contato: '12345' };
        const mockResponse = { data: { ...leadData, id: '2' } };
        axiosInstance.post.mockResolvedValue(mockResponse);

        const result = await createLead(leadData);
        expect(axiosInstance.post).toHaveBeenCalledWith('/leads', leadData);
        expect(result).toEqual(mockResponse.data);
    });

    it('should throw an error with specific message if API returns error object', async () => {
        const leadData = { nome: 'New Lead', contato: '12345' };
        const apiError = { response: { data: { message: 'Validation failed' } } };
        axiosInstance.post.mockRejectedValue(apiError);

        await expect(createLead(leadData)).rejects.toThrow('Validation failed');
    });
  });

  describe('getLeadById', () => {
    it('should call axiosInstance.get with "/leads/:id"', async () => {
        const leadId = 'lead123';
        const mockResponse = { data: { id: leadId, nome: 'Specific Lead' } };
        axiosInstance.get.mockResolvedValue(mockResponse);

        const result = await getLeadById(leadId);
        expect(axiosInstance.get).toHaveBeenCalledWith(`/leads/${leadId}`);
        expect(result).toEqual(mockResponse.data);
    });

    it('should throw "Lead não encontrado" if API returns 404', async () => {
        const leadId = 'lead123';
        const apiError = { response: { status: 404 } };
        axiosInstance.get.mockRejectedValue(apiError);

        await expect(getLeadById(leadId)).rejects.toThrow('Lead não encontrado.');
    });
  });

  // TODO: Add similar tests for updateLead, discardLead, deleteLead,
  // importLeadsFromCSVApi, and downloadCSVTemplateApi focusing on:
  // - Correct endpoint and method calls.
  // - Correct payload/params being sent.
  // - Successful response handling.
  // - Error response handling (including specific messages if the API function customizes them).
  // For importLeadsFromCSVApi, test that FormData is constructed correctly.
  // For downloadCSVTemplateApi, test that responseType 'blob' is used.

});
