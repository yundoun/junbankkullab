#!/usr/bin/env python3
"""
Market Data Fetcher
Fetches historical price data for stocks/indices using yfinance.

Usage:
    # Get price change over hours
    python market_data.py <symbol> <timestamp_ms> [hours_after]
    
    # Get close price for a specific date (US market close)
    python market_data.py close <symbol> <date>
    
Example:
    python market_data.py 005930.KS 1706745600000 24
    python market_data.py close NVDA 2025-01-31
    
Output (JSON):
    {"symbol": "005930.KS", "priceAt": 75000, "priceAfter": 76000, "change": 1.33}
    {"symbol": "NVDA", "closePrice": 150.25, "date": "2025-01-31", "direction": "up"}
"""

import sys
import json
from datetime import datetime, timedelta
import yfinance as yf
import pandas_market_calendars as mcal

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
    'Google': 'GOOGL',
    'Bitcoin': 'BTC-USD',
}

# Market calendar mapping (which exchange to use for trading days)
MARKET_CALENDAR = {
    'KOSPI': 'XKRX',      # Korea Exchange
    'Samsung': 'XKRX',
    'SKHynix': 'XKRX',
    'NASDAQ': 'NYSE',     # US markets
    'SP500': 'NYSE',
    'Tesla': 'NYSE',
    'Nvidia': 'NYSE',
    'Apple': 'NYSE',
    'Google': 'NYSE',
    'Bitcoin': None,      # 24/7 trading
}


def get_trading_day(asset: str, date_str: str) -> str:
    """
    Get the trading day for a given asset and date.
    If the date is a weekend or holiday, returns the next trading day.
    For Bitcoin, returns the same date (24/7 trading).
    """
    calendar_name = MARKET_CALENDAR.get(asset)
    target_date = datetime.strptime(date_str, '%Y-%m-%d')
    
    if calendar_name is None:
        # Bitcoin trades 24/7
        return date_str
    
    try:
        calendar = mcal.get_calendar(calendar_name)
        
        # Search up to 10 days ahead for next trading day
        end_date = target_date + timedelta(days=10)
        schedule = calendar.schedule(start_date=target_date, end_date=end_date)
        
        if len(schedule) > 0:
            trading_day = schedule.index[0].strftime('%Y-%m-%d')
            return trading_day
        else:
            return date_str
    except Exception as e:
        print(f"Calendar error: {e}", file=sys.stderr)
        return date_str


def get_close_price(symbol: str, date_str: str):
    """
    Get the close price for a specific trading date.
    
    For US markets: Returns the close price of that trading day
    For KR markets: Returns the close price of that trading day
    For Bitcoin: Returns the close price at ~midnight UTC
    
    Args:
        symbol: Asset name (e.g., 'Nvidia', 'KOSPI')
        date_str: Date in YYYY-MM-DD format (Korean time for the video publish date)
    
    Returns:
        dict with closePrice, date, direction, previousClose
    """
    resolved_symbol = SYMBOL_MAP.get(symbol, symbol)
    
    # Get the actual trading day
    trading_day = get_trading_day(symbol, date_str)
    trading_date = datetime.strptime(trading_day, '%Y-%m-%d')
    
    # Fetch data for a range (trading day and previous day for comparison)
    fetch_start = trading_date - timedelta(days=7)  # Go back to ensure we get previous trading day
    fetch_end = trading_date + timedelta(days=1)
    
    try:
        ticker = yf.Ticker(resolved_symbol)
        hist = ticker.history(start=fetch_start, end=fetch_end, interval='1d')
        
        if hist.empty:
            return {'error': 'No data available'}
        
        # Normalize timezone
        hist.index = hist.index.tz_localize(None) if hist.index.tz else hist.index
        
        # Find the close price for the trading day
        trading_date_normalized = trading_date.replace(hour=0, minute=0, second=0, microsecond=0)
        
        close_price = None
        previous_close = None
        actual_date = None
        
        for i, idx in enumerate(hist.index):
            idx_date = idx.replace(hour=0, minute=0, second=0, microsecond=0)
            if idx_date >= trading_date_normalized:
                close_price = float(hist.iloc[i]['Close'])
                actual_date = idx_date.strftime('%Y-%m-%d')
                if i > 0:
                    previous_close = float(hist.iloc[i-1]['Close'])
                break
        
        if close_price is None:
            return {'error': 'Could not find close price for date'}
        
        # Calculate direction
        direction = 'flat'
        if previous_close is not None:
            change_pct = ((close_price - previous_close) / previous_close) * 100
            if change_pct > 0.1:
                direction = 'up'
            elif change_pct < -0.1:
                direction = 'down'
        
        return {
            'symbol': resolved_symbol,
            'closePrice': round(close_price, 4),
            'previousClose': round(previous_close, 4) if previous_close else None,
            'date': actual_date,
            'requestedDate': date_str,
            'tradingDay': trading_day,
            'direction': direction,
        }
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return {'error': str(e)}


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
        print("Usage:")
        print("  python market_data.py <symbol> <timestamp_ms> [hours_after]")
        print("  python market_data.py close <symbol> <date>")
        sys.exit(1)
    
    # Check if it's a close price request
    if sys.argv[1] == 'close':
        if len(sys.argv) < 4:
            print("Usage: python market_data.py close <symbol> <date>")
            sys.exit(1)
        
        symbol = sys.argv[2]
        date_str = sys.argv[3]
        
        result = get_close_price(symbol, date_str)
        print(json.dumps(result))
        
        if 'error' in result:
            sys.exit(1)
    else:
        # Original functionality
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
