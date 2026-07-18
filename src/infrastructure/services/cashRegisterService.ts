import apiClient from '../../core/api/client';
import { Env } from '../../core/config/env';

export interface CashierSession {
  status: 'OPEN' | 'CLOSED';
  opened_by?: string;
  opened_at?: string;
  start_amount?: number;
  closed_at?: string;
  closed_by?: string;
  end_amount?: number;
  movements?: CashMovement[];
}

export interface CashMovement {
  id: string;
  type: 'SALE' | 'DEPOSIT' | 'WITHDRAWAL' | 'INFLOW' | 'OUTFLOW';
  amount: number;
  description: string;
  timestamp: string;
  paymentMethod?: string;
}

export interface CashRegister {
  id: string;
  name: string;
  location?: string;
  estado?: string;
}

const parseLambdaResponse = (axiosResponse: any) => {
  if (!axiosResponse) return null;
  const data = axiosResponse.data !== undefined ? axiosResponse.data : axiosResponse;
  if (!data) return null;

  // Handle standard lambda body string wrapping
  if (typeof data.body === 'string') {
    try {
      const parsedBody = JSON.parse(data.body);
      return parsedBody.Items || parsedBody.items || parsedBody;
    } catch (e) {
      console.error('Error parsing Lambda body string:', e);
      return data.body;
    }
  }

  // Handle body object wrapping
  if (data.body && typeof data.body === 'object') {
    const b = data.body;
    return b.Items || b.items || b;
  }

  // Handle direct DynamoDB Items wrapping
  if (data.Items && Array.isArray(data.Items)) {
    return data.Items;
  }

  // Handle direct items wrapping
  if (data.items && Array.isArray(data.items)) {
    return data.items;
  }

  // Handle direct array or object
  return data;
};

export const CashRegisterService = {
  /**
   * List all cash registers registered for the commerce
   */
  async listCashRegisters(): Promise<CashRegister[]> {
    try {
      const response = await apiClient.get(`${Env.ADMIN_URL}/cash-registers`);
      const items = parseLambdaResponse(response);
      const rawList = Array.isArray(items) ? items : [];
      console.log('📡 [CashRegisterService] Raw registers from API:', JSON.stringify(rawList, null, 2));
      return rawList
        .filter((i: any) => i.estado !== 'ELIMINADO')
        .map((i: any, index: number) => {
          const rawId = i.id ? String(i.id) : (i.PK ? String(i.PK) : '');
          const computedId = rawId.replace('CASH_REGISTER#', '');
          console.log(`🔍 [CashRegisterService Diagnostic] Mapped Register [${index}] -> PK: ${i.PK}, SK: ${i.SK}, id: ${i.id}, computedId: ${computedId}`);
          return {
            id: computedId || `register-${index}`,
            name: i.name || `Caja ${computedId || index}`
          };
        })
        .filter((i: any) => i.id !== '' && !i.id.startsWith('STORE#') && !i.id.startsWith('TENANT#') && !i.id.startsWith('SESSION#'));
    } catch (e) {
      console.error('Error listing cash registers:', e);
      throw e;
    }
  },

  /**
   * Get the current status/session of a specific cash register
   */
  async getCashRegisterStatus(tenantId: string, cashRegisterId: string): Promise<CashierSession> {
    try {
      const response = await apiClient.get(
        `${Env.API_URL}/store/${tenantId}/cash-register`,
        { params: { cash_register_id: cashRegisterId } }
      );
      const session = parseLambdaResponse(response) || { status: 'CLOSED' };
      if (!session.movements) session.movements = [];
      return session;
    } catch (e) {
      console.error('Error fetching cash register status:', e);
      throw e;
    }
  },

  /**
   * Open a new session for a specific cash register
   */
  async openSession(
    tenantId: string,
    cashRegisterId: string,
    amount: number,
    paymentMethods: any[] = []
  ): Promise<any> {
    try {
      const payload = {
        amount,
        payment_methods: paymentMethods,
        cash_register_id: cashRegisterId,
      };
      const response = await apiClient.post(
        `${Env.API_URL}/store/${tenantId}/cash-register/open`,
        payload
      );
      return parseLambdaResponse(response);
    } catch (e) {
      console.error('Error opening cash register session:', e);
      throw e;
    }
  },

  /**
   * Get preview details/theoretical numbers for the active session
   */
  async getSessionPreview(tenantId: string, cashRegisterId: string): Promise<any> {
    try {
      const response = await apiClient.get(
        `${Env.API_URL}/store/${tenantId}/cash-register/session-preview`,
        { params: { cash_register_id: cashRegisterId } }
      );
      return parseLambdaResponse(response);
    } catch (e) {
      console.error('Error getting session preview:', e);
      throw e;
    }
  },

  /**
   * Register manual cash transaction (Inflow/Outflow / Deposit/Withdrawal)
   */
  async registerMovement(
    tenantId: string,
    cashRegisterId: string,
    type: 'INFLOW' | 'OUTFLOW',
    amount: number,
    reason: string
  ): Promise<any> {
    try {
      const payload = {
        type,
        amount,
        reason,
        method: 'cash',
        cash_register_id: cashRegisterId,
      };
      const response = await apiClient.post(
        `${Env.API_URL}/store/${tenantId}/cash-register/movement`,
        payload
      );
      return parseLambdaResponse(response);
    } catch (e) {
      console.error('Error registering cash movement:', e);
      throw e;
    }
  },

  /**
   * Close session with formal blind cash counting
   */
   async closeSession(
    tenantId: string,
    cashRegisterId: string,
    amount: number,
    paymentMethods: { method: string; amount: number }[],
    notes?: string
  ): Promise<any> {
    try {
      const payload = {
        amount,
        payment_methods: paymentMethods,
        cash_register_id: cashRegisterId,
        notes,
      };
      const response = await apiClient.post(
        `${Env.API_URL}/store/${tenantId}/cash-register/close`,
        payload
      );
      return parseLambdaResponse(response);
    } catch (e) {
      console.error('Error closing cash register session:', e);
      throw e;
    }
  },

  /**
   * Instantly close session using current theoretical system balance
   */
  async quickClose(tenantId: string, cashRegisterId: string): Promise<any> {
    try {
      const response = await apiClient.post(
        `${Env.API_URL}/store/${tenantId}/cash-register/quick-close`,
        {},
        { params: { cash_register_id: cashRegisterId } }
      );
      return parseLambdaResponse(response);
    } catch (e) {
      console.error('Error performing quick close:', e);
      throw e;
    }
  },

  /**
   * Fetch active payment methods configured for this commerce
   */
  async listPaymentMethods(): Promise<any[]> {
    try {
      const response = await apiClient.get(`${Env.ADMIN_URL}/payment-methods`);
      const items = parseLambdaResponse(response);
      return Array.isArray(items) ? items : [];
    } catch (e) {
      console.error('Error listing payment methods:', e);
      throw e;
    }
  },

  async getSessionsHistory(): Promise<any[]> {
    try {
      const response = await apiClient.get(`${Env.ADMIN_URL}/cash-register-sessions`);
      console.log('📡 [API RAW RESPONSE /cash-register-sessions]:', JSON.stringify(response.data, null, 2));
      const items = parseLambdaResponse(response);
      const rawList = Array.isArray(items) ? items : [];
      const filtered = rawList.filter((item: any) => {
        const isSession = (item.SK && String(item.SK).startsWith('CAJA_HISTORY#')) || item.entity_type === 'CASH_REGISTER_SESSION';
        return isSession && item.SK !== 'METADATA';
      });
      console.log(`📡 [CashRegisterService getSessionsHistory] Return filtered sessions list. Count: ${filtered.length}`);
      return filtered;
    } catch (e) {
      console.error('Error fetching sessions history:', e);
      throw e;
    }
  },

  /**
   * Fetch expenses in a date range for a specific cash register (client-side filtered later)
   */
  async getSessionExpenses(startDate: string, endDate: string): Promise<any[]> {
    try {
      const response = await apiClient.get(`${Env.ADMIN_URL}/expenses`, {
        params: { start_date: startDate, end_date: endDate }
      });
      return parseLambdaResponse(response) || [];
    } catch (e) {
      console.error('Error fetching session expenses:', e);
      throw e;
    }
  },

  /**
   * Create a new cash register in the commerce
   */
  async createCashRegister(data: any): Promise<any> {
    try {
      const response = await apiClient.post(`${Env.ADMIN_URL}/cash-registers`, data);
      return parseLambdaResponse(response);
    } catch (e) {
      console.error('Error creating cash register:', e);
      throw e;
    }
  },

  /**
   * Update a cash register
   */
  async updateCashRegister(id: string, data: any): Promise<any> {
    try {
      const response = await apiClient.put(`${Env.ADMIN_URL}/cash-registers/${id}`, data);
      return parseLambdaResponse(response);
    } catch (e) {
      console.error('Error updating cash register:', e);
      throw e;
    }
  },

  /**
   * Delete / Desactivate a cash register
   */
  async deleteCashRegister(id: string): Promise<any> {
    try {
      const response = await apiClient.delete(`${Env.ADMIN_URL}/cash-registers/${id}`);
      return parseLambdaResponse(response);
    } catch (e) {
      console.error('Error deleting cash register:', e);
      throw e;
    }
  },
};
