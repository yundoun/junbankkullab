#!/usr/bin/env python3
"""
Market Data Fetcher
Fetches historical price data for stocks/indices using yfinance.

Usage:
    python market_data.py <symbol> <timestamp_ms> [hours_after]
    
Example:
    python market_data.py 005930.KS 1706745600000 24
    
Output (JSON):
    {"symbol": "005930.KS", "priceAt": 75000, "priceAfter": 76000, "change": 1.33}
"""

import sys
import json
from datetime import datetime, timedelta
import yfinance as yf

# Symbol mapping
SYMBOL_MAP = {
    'KOSPI': '^KS11',
    'NASDAQ': '^IXIC',
    'SP500': '^GSPC',
    'Samsung': '005930.KS',
    'SKHynix': '000660.KS',
    'Tesla': 'TSLA',
    'Nvidia': 'NVDA',
    'Apple': 'AAPL',
    'Bitcoin': 'BTC-USD',
}

def get_price_at(symbol: str, timestamp_ms: int, hours_after: int = 24):
    """Get price at timestamp and price after specified hours."""
    
    # Resolve symbol
    resolved_symbol = SYMBOL_MAP.get(symbol, symbol)
    
    # Convert timestamp
    start_dt = datetime.fromtimestamp(timestamp_ms / 1000)
    end_dt = start_dt + timedelta(hours=hours_after + 1)
    
    # Extend range for data availability
    fetch_start = start_dt - timedelta(days=1)
    fetch_end = end_dt + timedelta(days=1)
    
    try:
        ticker = yf.Ticker(resolved_symbol)
        hist = ticker.history(start=fetch_start, end=fetch_end, interval='1h')
        
        if hist.empty:
            # Try daily interval for less liquid markets
            hist = ticker.history(start=fetch_start, end=fetch_end, interval='1d')
        
        if hist.empty:
            return None
        
        # Find closest price to start time
        hist.index = hist.index.tz_localize(None) if hist.index.tz else hist.index
        
        price_at = None
        price_after = None
        
        # Find price at publish time
        for idx in hist.index:
            if idx >= start_dt:
                price_at = float(hist.loc[idx, 'Close'])
                break
        
        if price_at is None and len(hist) > 0:
            price_at = float(hist.iloc[0]['Close'])
        
        # Find price after N hours
        target_time = start_dt + timedelta(hours=hours_after)
        for idx in hist.index:
            if idx >= target_time:
                price_after = float(hist.loc[idx, 'Close'])
                break
        
        if price_after is None and len(hist) > 0:
            price_after = float(hist.iloc[-1]['Close'])
        
        if price_at and price_after:
            change = ((price_after - price_at) / price_at) * 100
            return {
                'symbol': resolved_symbol,
                'priceAt': round(price_at, 4),
                'priceAfter': round(price_after, 4),
                'change': round(change, 4),
                'direction': 'up' if change >= 0 else 'down'
            }
        
        return None
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return None


def main():
    if len(sys.argv) < 3:
        print("Usage: python market_data.py <symbol> <timestamp_ms> [hours_after]")
        sys.exit(1)
    
    symbol = sys.argv[1]
    timestamp_ms = int(sys.argv[2])
    hours_after = int(sys.argv[3]) if len(sys.argv) > 3 else 24
    
    result = get_price_at(symbol, timestamp_ms, hours_after)
    
    if result:
        print(json.dumps(result))
    else:
        print(json.dumps({"error": "Could not fetch data"}))
        sys.exit(1)


if __name__ == '__main__':
    main()
