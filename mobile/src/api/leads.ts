import http from './http';

// This is a placeholder for the Lead type
export interface Lead {
  id: string;
  name: string;
  status: string;
}

/**
 * Fetches a paginated list of leads.
 * In a real app, you would pass filter and pagination params.
 */
export const getLeads = async (): Promise<Lead[]> => {
  try {
    // const { data } = await http.get('/leads');
    // return data.leads;
    console.log('Fetching leads...');
    return []; // Return empty array for now
  } catch (error) {
    console.error('Failed to fetch leads:', error);
    throw error;
  }
};
