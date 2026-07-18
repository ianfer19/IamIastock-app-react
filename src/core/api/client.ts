import axios from 'axios';
import { SecureStorage, SECURE_KEYS } from '../storage/secureStorage';

export const authEventEmitter = {
  onLogout: () => {},
};

const apiClient = axios.create();

// Request Interceptor: Inject Token & Tenant automatically + Logging
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const [token, user] = await Promise.all([
        SecureStorage.getToken(SECURE_KEYS.ID_TOKEN),
        SecureStorage.getUser()
      ]);

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Important: tenant_id must match exactly what the backend expects
      if (user?.tenant_id && !config.headers['x-tenant-id']) {
        config.headers['x-tenant-id'] = user.tenant_id;
      }

      if (__DEV__) {
        console.log('--- 🚀 API REQUEST ---');
        console.log(`Method: ${config.method?.toUpperCase()}`);
        console.log(`URL: ${config.url}`);
        console.log('Headers:', JSON.stringify(config.headers, null, 2));
        console.log('----------------------');
      }

    } catch (e) {
      console.error('Error injecting auth headers', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Global Logout on 401 + Detailed Error Logging
apiClient.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(`--- ✅ API RESPONSE [${response.status}] ---`);
      console.log(`URL: ${response.config.url}`);
      console.log('-----------------------');
    }
    return response;
  },
  async (error) => {
    if (__DEV__) {
      console.log('--- ❌ API ERROR ---');
      console.log(`Status: ${error.response?.status}`);
      console.log(`URL: ${error.config?.url}`);
      console.log('Error Data:', JSON.stringify(error.response?.data, null, 2));
      console.log('Headers sent:', JSON.stringify(error.config?.headers, null, 2));
      console.log('--------------------');
    }

    if (error.response?.status === 401) {
      console.log('🚨 [Auth] Session expired or invalid token. Logging out...');
      await SecureStorage.clearAll();
      authEventEmitter.onLogout();
      // Halt the promise chain so we don't trigger downstream errors which show toasts to the user
      return new Promise(() => {});
    }
    return Promise.reject(error);
  }
);

export default apiClient;
