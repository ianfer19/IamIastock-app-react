import { SecureStorage } from '../storage/secureStorage';

export interface CurrencyConfig {
  code: string;
  symbol: string;
  locale: string;
  precision: number;
}

let currentConfig: CurrencyConfig = {
  code: 'USD',
  symbol: '$',
  locale: 'en-US',
  precision: 2
};

export const CurrencyService = {
  /**
   * Initializes the currency configuration from commerce profile
   */
  initialize: (commerceData: any) => {
    if (!commerceData) return;

    const currencyCode = commerceData.currency || commerceData.regional?.currency_code || 'USD';
    const locale = commerceData.regional?.locale || commerceData.language || 'es-CO';
    
    // Map of common currency codes to symbols
    const symbols: Record<string, string> = {
      'COP': '$',
      'USD': '$',
      'EUR': '€',
      'MXN': '$',
      'ARS': '$',
      'CLP': '$',
      'PEN': 'S/',
      'BRL': 'R$',
    };

    currentConfig = {
      code: currencyCode,
      symbol: symbols[currencyCode] || '$',
      locale: locale.includes('-') ? locale : `${locale}-${commerceData.country || 'CO'}`,
      precision: currencyCode === 'COP' ? 0 : 2
    };

    console.log('💰 [CurrencyService] Configuración aplicada:', currentConfig);
  },

  /**
   * Formats a numeric amount to a currency string
   */
  format: (amount: number | string): string => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(value)) return `${currentConfig.symbol}0`;

    try {
      return new Intl.NumberFormat(currentConfig.locale, {
        style: 'currency',
        currency: currentConfig.code,
        minimumFractionDigits: currentConfig.precision,
        maximumFractionDigits: currentConfig.precision,
      }).format(value);
    } catch (e) {
      // Fallback if Intl fails
      return `${currentConfig.symbol}${value.toLocaleString()}`;
    }
  },

  getConfig: () => currentConfig
};
