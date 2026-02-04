// Market data fetching utilities
// Uses Binance for crypto, will add yfinance proxy for stocks

interface PriceData {
  timestamp: number
  price: number
}

interface PriceChange {
  startPrice: number
  endPrice: number
  changePercent: number
  direction: 'up' | 'down'
}

// Binance API for crypto
const BINANCE_BASE = 'https://api.binance.com/api/v3'

const CRYPTO_SYMBOLS: Record<string, string> = {
  bitcoin: 'BTCUSDT',
  ethereum: 'ETHUSDT',
}

export async function getCryptoPrice(asset: string): Promise<number | null> {
  const symbol = CRYPTO_SYMBOLS[asset.toLowerCase()]
  if (!symbol) return null

  try {
    const response = await fetch(`${BINANCE_BASE}/ticker/price?symbol=${symbol}`)
    if (!response.ok) return null
    
    const data = await response.json()
    return parseFloat(data.price)
  } catch {
    return null
  }
}

export async function getCryptoPriceAt(
  asset: string,
  timestamp: number
): Promise<number | null> {
  const symbol = CRYPTO_SYMBOLS[asset.toLowerCase()]
  if (!symbol) return null

  try {
    // Get kline (candlestick) data around the timestamp
    const params = new URLSearchParams({
      symbol,
      interval: '1h',
      startTime: String(timestamp),
      limit: '1',
    })

    const response = await fetch(`${BINANCE_BASE}/klines?${params}`)
    if (!response.ok) return null

    const data = await response.json()
    if (!data.length) return null

    // Return close price
    return parseFloat(data[0][4])
  } catch {
    return null
  }
}

export async function getPriceChange(
  asset: string,
  startTime: Date,
  hoursAfter: number = 24
): Promise<PriceChange | null> {
  const startTimestamp = startTime.getTime()
  const endTimestamp = startTimestamp + hoursAfter * 60 * 60 * 1000

  const startPrice = await getCryptoPriceAt(asset, startTimestamp)
  const endPrice = await getCryptoPriceAt(asset, endTimestamp)

  if (startPrice === null || endPrice === null) return null

  const changePercent = ((endPrice - startPrice) / startPrice) * 100

  return {
    startPrice,
    endPrice,
    changePercent,
    direction: changePercent >= 0 ? 'up' : 'down',
  }
}

// Stock/Index data - placeholder for yfinance integration
// For now, return mock data or implement proxy to Python service

const STOCK_SYMBOLS: Record<string, string> = {
  kospi: '^KS11',
  nasdaq: '^IXIC',
  sp500: '^GSPC',
  tesla: 'TSLA',
  samsung: '005930.KS',
  nvidia: 'NVDA',
  apple: 'AAPL',
}

export async function getStockPrice(asset: string): Promise<number | null> {
  // TODO: Implement yfinance proxy
  // For now, return null to indicate not yet implemented
  return null
}

export function isCrypto(asset: string): boolean {
  return asset.toLowerCase() in CRYPTO_SYMBOLS
}

export function isStock(asset: string): boolean {
  return asset.toLowerCase() in STOCK_SYMBOLS
}
