import apiClient from '../../core/api/client';
import { Env } from '../../core/config/env';

const API_BASE_URL = Env.API_URL;

export interface TenantConfig {
  id: string;
  name: string;
  payload: {
    cash_control?: Record<string, any>;
    branding?: {
      logo_url?: string;
      primary_color?: string;
    };
    localization?: {
      country_iso?: string;
      currency_iso?: string;
      timezone?: string;
      prices_include_tax?: boolean;
      default_tax_rate?: number;
    };
    location?: {
      address_line_1?: string;
      city?: string;
      state_province?: string;
      postal_code?: string;
      neighborhood?: string;
    };
    operations?: {
      delivery?: {
        enabled?: boolean;
        radius_km?: number;
      };
    };
    billing_info?: {
      business_name?: string;
      nit?: string;
      email?: string;
    };
  };
}

export const TenantService = {
  getTenantConfig: async (tenantId: string): Promise<TenantConfig> => {
    console.log(`📡 [TenantService] Cargando config para tenant: ${tenantId}`);
    try {
      const response = await apiClient.get(`${API_BASE_URL}/tenants/${tenantId}`);
      const data = response.data?.body ? JSON.parse(response.data.body) : response.data;
      console.log('✅ [TenantService] Config cargada con éxito');
      return data;
    } catch (error) {
      console.error('❌ [TenantService] Error cargando config:', error);
      throw error;
    }
  },

  updateRegional: async (tenantId: string, payload: any): Promise<any> => {
    const response = await apiClient.patch(`${API_BASE_URL}/tenants/${tenantId}/regional`, payload);
    return response.data?.body ? JSON.parse(response.data.body) : response.data;
  },

  updateOperations: async (tenantId: string, payload: any): Promise<any> => {
    const response = await apiClient.patch(`${API_BASE_URL}/tenants/${tenantId}/operations`, payload);
    return response.data?.body ? JSON.parse(response.data.body) : response.data;
  },

  updateBilling: async (tenantId: string, payload: any): Promise<any> => {
    const response = await apiClient.patch(`${API_BASE_URL}/tenants/${tenantId}/billing`, payload);
    return response.data?.body ? JSON.parse(response.data.body) : response.data;
  },

  updateConnectors: async (tenantId: string, payload: any): Promise<any> => {
    // Backend uses PUT for connectors
    const response = await apiClient.put(`${API_BASE_URL}/tenants/${tenantId}/connectors`, payload);
    return response.data?.body ? JSON.parse(response.data.body) : response.data;
  },

  updateFactusConfig: async (tenantId: string, payload: any): Promise<any> => {
    // Factus config is updated via /admin/commerce/factus-config using PUT
    const response = await apiClient.put(`${API_BASE_URL}/admin/commerce/factus-config`, payload);
    return response.data?.body ? JSON.parse(response.data.body) : response.data;
  },

  updateCashControl: async (tenantId: string, payload: any): Promise<any> => {
    const response = await apiClient.patch(`${API_BASE_URL}/tenants/${tenantId}/cash-control`, payload);
    return response.data?.body ? JSON.parse(response.data.body) : response.data;
  },

  listAvailableBots: async (): Promise<any[]> => {
    const response = await apiClient.get(`${API_BASE_URL}/admin/bots`);
    return response.data?.body ? JSON.parse(response.data.body) : response.data;
  },

  updateBotEntitlements: async (tenantId: string, allowedBots: string[]): Promise<any> => {
    const response = await apiClient.patch(`${API_BASE_URL}/admin/tenants/${tenantId}/entitlements`, { allowed_bots: allowedBots });
    return response.data?.body ? JSON.parse(response.data.body) : response.data;
  }
};
