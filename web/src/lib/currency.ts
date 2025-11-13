// src/lib/currency.ts

interface CurrencyConfig {
  code: string
  symbol: string
  position: 'before' | 'after'
  decimals: number
}

// Common currency configurations
const CURRENCY_CONFIGS: Record<string, CurrencyConfig> = {
  USD: { code: 'USD', symbol: '$', position: 'before', decimals: 2 },
  GBP: { code: 'GBP', symbol: '£', position: 'before', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', position: 'before', decimals: 2 },
  CAD: { code: 'CAD', symbol: 'C$', position: 'before', decimals: 2 },
  AUD: { code: 'AUD', symbol: 'A$', position: 'before', decimals: 2 },
  JPY: { code: 'JPY', symbol: '¥', position: 'before', decimals: 0 },
  CHF: { code: 'CHF', symbol: 'CHF', position: 'before', decimals: 2 },
  SEK: { code: 'SEK', symbol: 'kr', position: 'after', decimals: 2 },
  NOK: { code: 'NOK', symbol: 'kr', position: 'after', decimals: 2 },
  DKK: { code: 'DKK', symbol: 'kr', position: 'after', decimals: 2 },
  PLN: { code: 'PLN', symbol: 'zł', position: 'after', decimals: 2 },
  NZD: { code: 'NZD', symbol: 'NZ$', position: 'before', decimals: 2 },
  SGD: { code: 'SGD', symbol: 'S$', position: 'before', decimals: 2 },
  HKD: { code: 'HKD', symbol: 'HK$', position: 'before', decimals: 2 },
  MXN: { code: 'MXN', symbol: 'MX$', position: 'before', decimals: 2 },
  BRL: { code: 'BRL', symbol: 'R$', position: 'before', decimals: 2 },
}

/**
 * Format an amount in the specified currency
 * @param amount Amount in minor units (e.g., cents, pence)
 * @param currencyCode ISO 4217 currency code
 * @param options Additional formatting options
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = 'USD',
  options: {
    showDecimals?: boolean
    showCode?: boolean
    locale?: string
  } = {}
): string {
  const {
    showDecimals = true,
    showCode = false,
    locale = 'en-US'
  } = options

  // Convert from minor units to major units
  const majorAmount = amount / 100

  try {
    // Try using Intl.NumberFormat first for best localization
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: showDecimals ? undefined : 0,
      maximumFractionDigits: showDecimals ? undefined : 0,
    })
    
    let formatted = formatter.format(majorAmount)
    
    // Add currency code if requested
    if (showCode && !formatted.includes(currencyCode)) {
      formatted = `${formatted} ${currencyCode}`
    }
    
    return formatted
  } catch (error) {
    // Fallback for unsupported currencies or locales
    console.warn(`Currency formatting failed for ${currencyCode}, using fallback`, error)
    
    const config = CURRENCY_CONFIGS[currencyCode] || {
      code: currencyCode,
      symbol: currencyCode,
      position: 'before',
      decimals: 2
    }
    
    const rounded = showDecimals 
      ? majorAmount.toFixed(config.decimals)
      : Math.round(majorAmount).toString()
    
    const formatted = config.position === 'before'
      ? `${config.symbol}${rounded}`
      : `${rounded}${config.symbol}`
    
    return showCode ? `${formatted} ${config.code}` : formatted
  }
}

/**
 * Get currency symbol for a given currency code
 */
export function getCurrencySymbol(currencyCode: string): string {
  const config = CURRENCY_CONFIGS[currencyCode]
  return config?.symbol || currencyCode
}

/**
 * Parse Patreon tier names to extract amount and currency
 * Handles formats like "£10 Tier" or "Gold ($15)"
 */
export function parseTierAmount(tierName: string): {
  amount: number | null
  currency: string | null
} {
  // Common patterns for tier amounts
  const patterns = [
    /£(\d+(?:\.\d{2})?)/i,  // £10 or £10.50
    /\$(\d+(?:\.\d{2})?)/i,  // $10 or $10.50
    /€(\d+(?:\.\d{2})?)/i,  // €10 or €10.50
    /(\d+(?:\.\d{2})?)\s*(USD|GBP|EUR|CAD|AUD)/i,  // 10 USD
  ]
  
  for (const pattern of patterns) {
    const match = tierName.match(pattern)
    if (match) {
      const amount = parseFloat(match[1])
      let currency = 'USD' // default
      
      if (tierName.includes('£')) currency = 'GBP'
      else if (tierName.includes('€')) currency = 'EUR'
      else if (match[2]) currency = match[2].toUpperCase()
      
      return { amount: amount * 100, currency } // Convert to minor units
    }
  }
  
  return { amount: null, currency: null }
}
