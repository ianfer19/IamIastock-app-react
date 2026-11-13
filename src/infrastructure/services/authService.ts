import axios from 'axios';
import apiClient from '../../core/api/client';
import { SecureStorage, SECURE_KEYS } from '../../core/storage/secureStorage';
import { Env } from '../../core/config/env';
import { decodeJWT } from '../../core/utils/jwt';

export interface LoginResponse {
  access_token: string;
  id_token: string;
  refresh_token: string;
  user: {
    id: string;
    tenant_id: string;
    role: string;
    name: string;
  };
}

export const AuthService = {
  login: async (username: string, password: string, signal?: AbortSignal): Promise<LoginResponse> => {
    console.log('🚀 [AuthService] Iniciando Login para:', username);
    console.log('📡 [AuthService] URL:', `${Env.API_URL}/auth/login`);

    try {
      const response = await apiClient.post(`${Env.API_URL}/auth/login`, {
        username,
        password
      }, { signal });

      console.log('✅ [AuthService] Respuesta Exitosa (200 OK):', response.data);

      const data: LoginResponse = response.data;
      const decoded = decodeJWT(data.id_token);

      // Extract real tenant_id from token (custom:tenant_id or tenant_id)
      const realTenantId = decoded?.['custom:tenant_id'] || decoded?.['tenant_id'] || data.user.tenant_id;

      const userToSave = {
        ...data.user,
        tenant_id: realTenantId
      };

      console.log('🔑 [AuthService] Tenant Resolvido del Token:', realTenantId);

      // Persist session securely
      await SecureStorage.saveToken(SECURE_KEYS.ACCESS_TOKEN, data.access_token);
      await SecureStorage.saveToken(SECURE_KEYS.ID_TOKEN, data.id_token);
      await SecureStorage.saveToken(SECURE_KEYS.REFRESH_TOKEN, data.refresh_token);
      await SecureStorage.saveUser(userToSave);

      return data;
    } catch (error: any) {
      if (axios.isCancel(error)) {
        console.log('⚠️ [AuthService] Petición cancelada por el componente');
        throw new Error('Petición cancelada');
      }

      if (error.response) {
        console.log('❌ [AuthService] Error de API (Status:', error.response.status, '):', error.response.data);
        
        const status = error.response.status;
        const data = error.response.data;
        const serverMessage = data?.error || data?.message;

        if (status === 401) throw new Error(serverMessage || 'Credenciales inválidas');
        if (status === 404) throw new Error(serverMessage || 'Usuario no encontrado');
        if (status === 403) {
          if (data?.code === 'PASSWORD_RESET_REQUIRED') {
            throw { status: 403, code: 'PASSWORD_RESET_REQUIRED', message: 'Cambio de contraseña requerido' };
          }
          throw new Error(serverMessage || 'Usuario inactivo o suspendido');
        }
        throw new Error(serverMessage || 'No se pudo iniciar sesión');
      }

      console.log('🌐 [AuthService] Error de Red o Servidor No Alcanzable:', error.message);
      throw new Error('Error de conexión con el servidor');
    }
  },

  getCurrentUser: async (): Promise<any> => {
    console.log('📡 [AuthService] Obteniendo perfil /admin/me');
    try {
      const response = await apiClient.get(`${Env.API_URL}/admin/me`);
      
      // Handle Lambda wrapper if needed
      const data = response.data?.body ? JSON.parse(response.data.body) : response.data;
      
      console.log('✅ [AuthService] Perfil obtenido:', data);
      return data;
    } catch (error) {
      console.error('❌ [AuthService] Error en /admin/me:', error);
      throw error;
    }
  },

  listMemberships: async (): Promise<any[]> => {
    console.log('📡 [AuthService] Listando memberships /admin/me/memberships');
    try {
      const response = await apiClient.get(`${Env.API_URL}/admin/me/memberships`);
      
      // Handle Lambda Proxy wrapper
      const data = response.data?.body ? JSON.parse(response.data.body) : response.data;
      
      console.log('✅ [AuthService] Memberships obtenidos:', data);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('❌ [AuthService] Error en memberships:', error);
      throw error;
    }
  },

  switchSite: async (tenantId: string): Promise<any> => {
    console.log('📡 [AuthService] switchSite para:', tenantId);
    try {
      const refreshToken = await SecureStorage.getToken(SECURE_KEYS.REFRESH_TOKEN);
      console.log('[AuthService] Recuperando refresh_token de SecureStorage:', 
          refreshToken ? 'ENCONTRADO' : 'NO ENCONTRADO');

      const response = await apiClient.post(`${Env.API_URL}/admin/me/switch-context`, {
        tenant_id: tenantId,
        refresh_token: refreshToken
      });

      console.log('✅ [AuthService] Switch context response:', response.data);
      const res = response.data;
      const tokens = res.tokens || res.data || res;
      const idToken = tokens.id_token;
      const accessToken = tokens.access_token;

      if (idToken && accessToken) {
        // Guardar nuevos tokens
        await SecureStorage.saveToken(SECURE_KEYS.ACCESS_TOKEN, accessToken);
        await SecureStorage.saveToken(SECURE_KEYS.ID_TOKEN, idToken);
        console.log('[AuthService] Nuevos tokens guardados en SecureStorage.');
        
        // Decodificar el id_token para actualizar los datos locales del usuario
        const decoded = decodeJWT(idToken);
        const savedUserStr = await SecureStorage.getToken(SECURE_KEYS.USER_DATA);
        if (savedUserStr) {
          const user = JSON.parse(savedUserStr);
          user.tenant_id = tenantId;
          await SecureStorage.saveUser(user);
        }
      }

      return res;
    } catch (error) {
      console.error('❌ [AuthService] Error en switchSite:', error);
      throw error;
    }
  },

  updateEmployee: async (employeeId: string, payload: any): Promise<any> => {
    try {
      const response = await apiClient.put(`${Env.API_URL}/admin/employees/${employeeId}`, payload);
      return response.data?.body ? JSON.parse(response.data.body) : response.data;
    } catch (error) {
      console.error('❌ [AuthService] Error en updateEmployee:', error);
      throw error;
    }
  },

  changeMyPassword: async (newPassword: string): Promise<any> => {
    try {
      const response = await apiClient.post(`${Env.API_URL}/admin/me/password`, { new_password: newPassword });
      return response.data?.body ? JSON.parse(response.data.body) : response.data;
    } catch (error) {
      console.error('❌ [AuthService] Error en changeMyPassword:', error);
      throw error;
    }
  }
};
