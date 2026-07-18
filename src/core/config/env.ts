/**
 * Environment Configuration Service
 */

// Debugging: Ver exactamente qué está llegando desde el proceso
const rawApiUrl = process.env.EXPO_PUBLIC_API_URL;
const rawEnv = process.env.EXPO_PUBLIC_ENV;

export const Env = {
  // Si la variable no existe, forzamos un error visual para saber que el .env no cargó
  API_URL: rawApiUrl || 'URL_NO_CONFIGURADA',
  ADMIN_URL: process.env.EXPO_PUBLIC_ADMIN_URL || (rawApiUrl ? `${rawApiUrl}/admin` : 'URL_NO_CONFIGURADA'),
  STAGE: rawEnv || 'development',
  IS_DEV: rawEnv === 'development' || !rawEnv,
  IS_PROD: rawEnv === 'production',
  // WebSocket dinámico: Se prefiere la variable de entorno, si no existe usa la de Dev por defecto.
  WS_URL: process.env.EXPO_PUBLIC_WS_URL || 'wss://qg27v7f2p4.execute-api.us-east-1.amazonaws.com/prod',
};


if (__DEV__) {
  console.log('------------------------------------');
  console.log('🔍 [DEBUG ENV] RAW EXPO_PUBLIC_API_URL:', rawApiUrl);
  console.log('🛠️ [Env] Stage:', Env.STAGE);
  console.log('📡 [Env] API URL:', Env.API_URL);
  console.log('📡 [Env] ADMIN URL:', Env.ADMIN_URL);
  console.log('------------------------------------');
}
