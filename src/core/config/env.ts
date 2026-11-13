import AsyncStorage from '@react-native-async-storage/async-storage';

export type ApiStage = 'development' | 'production';

export interface ApiEnvironmentConfig {
    stage: ApiStage;
    label: string;
    apiUrl: string;
    adminUrl: string;
    secondaryApiUrl: string;
    courtsUrl: string;
    wsUrl: string;
}

const STORAGE_KEY = 'api_environment_v1';

// Deben coincidir con el frontend web (IamIAStockCloudFront/src/environments).
const DEV_API = 'https://bq22pgfot8.execute-api.us-east-1.amazonaws.com';
const DEV_COURTS = 'https://z5wyhuc5x1.execute-api.us-east-1.amazonaws.com';
const DEV_WS = 'wss://03nvgfyfy5.execute-api.us-east-1.amazonaws.com/prod';

const PROD_API = 'https://q17z7xdvu4.execute-api.us-east-1.amazonaws.com';
const PROD_COURTS = 'https://mz25he3b4h.execute-api.us-east-1.amazonaws.com';
const PROD_WS = 'wss://wwpmf8ryb6.execute-api.us-east-1.amazonaws.com/prod';

const read = (value: string | undefined, fallback: string): string => value || fallback;

const DEV_CONFIG: ApiEnvironmentConfig = {
    stage: 'development',
    label: 'DEV',
    apiUrl: read(process.env.EXPO_PUBLIC_API_URL_DEV, DEV_API),
    adminUrl: read(process.env.EXPO_PUBLIC_ADMIN_URL_DEV, `${DEV_API}/admin`),
    secondaryApiUrl: read(process.env.EXPO_PUBLIC_SAAS_API_URL_DEV, DEV_COURTS),
    courtsUrl: read(
        process.env.EXPO_PUBLIC_COURTS_URL_DEV,
        read(process.env.EXPO_PUBLIC_SAAS_API_URL_DEV, DEV_COURTS)
    ),
    wsUrl: read(process.env.EXPO_PUBLIC_WS_URL_DEV, DEV_WS),
};

const PROD_CONFIG: ApiEnvironmentConfig = {
    stage: 'production',
    label: 'PROD',
    apiUrl: read(process.env.EXPO_PUBLIC_API_URL_PROD, PROD_API),
    adminUrl: read(process.env.EXPO_PUBLIC_ADMIN_URL_PROD, `${PROD_API}/admin`),
    secondaryApiUrl: read(process.env.EXPO_PUBLIC_SAAS_API_URL_PROD, PROD_COURTS),
    courtsUrl: read(
        process.env.EXPO_PUBLIC_COURTS_URL_PROD,
        read(process.env.EXPO_PUBLIC_SAAS_API_URL_PROD, PROD_COURTS)
    ),
    wsUrl: read(process.env.EXPO_PUBLIC_WS_URL_PROD, PROD_WS),
};

export const API_ENVIRONMENTS: Record<ApiStage, ApiEnvironmentConfig> = {
    development: DEV_CONFIG,
    production: PROD_CONFIG,
};

const DEFAULT_STAGE: ApiStage = process.env.EXPO_PUBLIC_ENV === 'production' ? 'production' : 'development';

export const Env = {
    API_URL: DEV_CONFIG.apiUrl,
    ADMIN_URL: DEV_CONFIG.adminUrl,
    SAAS_API_URL: DEV_CONFIG.secondaryApiUrl,
    COURTS_URL: DEV_CONFIG.courtsUrl,
    WS_URL: DEV_CONFIG.wsUrl,
    STAGE: 'development' as ApiStage,
    IS_DEV: true,
    IS_PROD: false,
};

const applyStage = (stage: ApiStage): ApiStage => {
    const config = API_ENVIRONMENTS[stage];
    Env.API_URL = config.apiUrl;
    Env.ADMIN_URL = config.adminUrl;
    Env.SAAS_API_URL = config.secondaryApiUrl;
    Env.COURTS_URL = config.courtsUrl;
    Env.WS_URL = config.wsUrl;
    Env.STAGE = config.stage;
    Env.IS_DEV = config.stage === 'development';
    Env.IS_PROD = config.stage === 'production';
    return Env.STAGE;
};

applyStage(DEFAULT_STAGE);

export const EnvService = {
    async load(): Promise<ApiStage> {
        try {
            const saved = await AsyncStorage.getItem(STORAGE_KEY);
            if (saved === 'development' || saved === 'production') {
                applyStage(saved);
            }
        } catch (error) {
            console.warn('[EnvService] No se pudo cargar el entorno guardado', error);
        }
        if (__DEV__) {
            console.log(`[EnvService] Entorno activo: ${Env.STAGE.toUpperCase()} · ${Env.API_URL}`);
        }
        return Env.STAGE;
    },

    setStage(stage: ApiStage): ApiStage {
        const next = applyStage(stage);
        AsyncStorage.setItem(STORAGE_KEY, stage).catch(error => {
            console.warn('[EnvService] No se pudo guardar el entorno', error);
        });
        if (__DEV__) {
            console.log(`[EnvService] Entorno cambiado a: ${next.toUpperCase()} · ${Env.API_URL}`);
        }
        return next;
    },

    toggle(): ApiStage {
        return this.setStage(Env.STAGE === 'development' ? 'production' : 'development');
    },

    getStage(): ApiStage {
        return Env.STAGE;
    },

    getConfig(stage: ApiStage = Env.STAGE): ApiEnvironmentConfig {
        return API_ENVIRONMENTS[stage];
    },
};
