/**
 * Currency utilities for the TutorApp
 * Now focused on currency information rather than conversion
 */

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
  'GB': {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound'
  },
  'MY': {
    code: 'MYR',
    symbol: 'RM',
    name: 'Malaysian Ringgit'
  },
  'HK': {
    code: 'HKD',
    symbol: 'HK$',
    name: 'Hong Kong Dollar'
  },
  'SG': {
    code: 'SGD',
    symbol: 'S$',
    name: 'Singapore Dollar'
  },
  'US': {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar'
  }
};

/**
 * Get currency information for a country
 * @param countryCode Country code
 * @returns Currency information or null if not supported
 */
export function getCurrencyInfo(countryCode: string): CurrencyInfo | null {
  return SUPPORTED_CURRENCIES[countryCode] || null;
}

/**
 * Get the default currency (Malaysia/Ringgit)
 */
export function getDefaultCurrency(): CurrencyInfo {
  return SUPPORTED_CURRENCIES['MY'];
}

/**
 * Check if a country code is supported
 * @param countryCode Country code
 * @returns True if supported, false otherwise
 */
export function isSupportedCurrency(countryCode: string): boolean {
  return countryCode in SUPPORTED_CURRENCIES;
} 