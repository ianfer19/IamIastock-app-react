import apiClient from '../../core/api/client';
import { Env } from '../../core/config/env';

export interface Zone {
  id: string;
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface Table {
  id: string;
  name: string;
  zone_id: string;
  capacity?: number;
  is_active?: boolean;
  status?: string; // e.g. AVAILABLE, OCCUPIED
}

const parseLambdaResponse = (axiosResponse: any) => {
  if (!axiosResponse) return null;
  const data = axiosResponse.data !== undefined ? axiosResponse.data : axiosResponse;
  if (!data) return null;

  if (typeof data.body === 'string') {
    try {
      const parsedBody = JSON.parse(data.body);
      return parsedBody.Items || parsedBody.items || parsedBody;
    } catch (e) {
      return data.body;
    }
  }

  if (data.body && typeof data.body === 'object') {
    return data.body.Items || data.body.items || data.body;
  }

  if (data.Items && Array.isArray(data.Items)) return data.Items;
  if (data.items && Array.isArray(data.items)) return data.items;

  return data;
};

export const TablesService = {
  // --- ZONES ---
  async listZones(): Promise<Zone[]> {
    try {
      const response = await apiClient.get(`${Env.ADMIN_URL}/zones`);
      const items = parseLambdaResponse(response);
      return Array.isArray(items) ? items : [];
    } catch (e) {
      console.error('Error listing zones:', e);
      throw e;
    }
  },

  async createZone(data: Partial<Zone>): Promise<any> {
    try {
      const response = await apiClient.post(`${Env.ADMIN_URL}/zones`, data);
      return parseLambdaResponse(response);
    } catch (e) {
      console.error('Error creating zone:', e);
      throw e;
    }
  },

  async updateZone(id: string, data: Partial<Zone>): Promise<any> {
    try {
      const response = await apiClient.put(`${Env.ADMIN_URL}/zones/${id}`, data);
      return parseLambdaResponse(response);
    } catch (e) {
      console.error('Error updating zone:', e);
      throw e;
    }
  },

  async deleteZone(id: string): Promise<any> {
    try {
      const response = await apiClient.delete(`${Env.ADMIN_URL}/zones/${id}`);
      return parseLambdaResponse(response);
    } catch (e) {
      console.error('Error deleting zone:', e);
      throw e;
    }
  },

  // --- TABLES ---
  async listTables(): Promise<Table[]> {
    try {
      const response = await apiClient.get(`${Env.ADMIN_URL}/tables`);
      const items = parseLambdaResponse(response);
      return Array.isArray(items) ? items : [];
    } catch (e) {
      console.error('Error listing tables:', e);
      throw e;
    }
  },

  async createTable(data: Partial<Table>): Promise<any> {
    try {
      const response = await apiClient.post(`${Env.ADMIN_URL}/tables`, data);
      return parseLambdaResponse(response);
    } catch (e) {
      console.error('Error creating table:', e);
      throw e;
    }
  },

  async updateTable(id: string, data: Partial<Table>): Promise<any> {
    try {
      const response = await apiClient.put(`${Env.ADMIN_URL}/tables/${id}`, data);
      return parseLambdaResponse(response);
    } catch (e) {
      console.error('Error updating table:', e);
      throw e;
    }
  },

  async deleteTable(id: string): Promise<any> {
    try {
      const response = await apiClient.delete(`${Env.ADMIN_URL}/tables/${id}`);
      return parseLambdaResponse(response);
    } catch (e) {
      console.error('Error deleting table:', e);
      throw e;
    }
  }
};
