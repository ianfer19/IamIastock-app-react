import apiClient from '../../core/api/client';
import { Env } from '../../core/config/env';

export interface PaymentMethod {
  id: string;
  name: string;
  type?: string;
  is_active?: boolean;
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

export const PaymentMethodsService = {
  async listPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const response = await apiClient.get(`${Env.ADMIN_URL}/payment-methods`);
      const items = parseLambdaResponse(response);
      return Array.isArray(items) ? items : [];
    } catch (e) {
      console.error('Error listing payment methods:', e);
      throw e;
    }
  },

  async createPaymentMethod(data: Partial<PaymentMethod>): Promise<any> {
    try {
      const response = await apiClient.post(`${Env.ADMIN_URL}/payment-methods`, data);
      return parseLambdaResponse(response);
    } catch (e) {
      console.error('Error creating payment method:', e);
      throw e;
    }
  },

  async updatePaymentMethod(id: string, data: Partial<PaymentMethod>): Promise<any> {
    try {
      const response = await apiClient.put(`${Env.ADMIN_URL}/payment-methods/${id}`, data);
      return parseLambdaResponse(response);
    } catch (e) {
      console.error('Error updating payment method:', e);
      throw e;
    }
  },

  async deletePaymentMethod(id: string): Promise<any> {
    try {
      const response = await apiClient.delete(`${Env.ADMIN_URL}/payment-methods/${id}`);
      return parseLambdaResponse(response);
    } catch (e) {
      console.error('Error deleting payment method:', e);
      throw e;
    }
  }
};
