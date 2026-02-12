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
# 
# 종목/섹터 → yfinance 티커 매핑
# 새 종목 추가 시 여기에 추가
# 
SYMBOL_MAP = {
    # 지수
    'KOSPI': '^KS11',
    'NASDAQ': '^IXIC',
    'SP500': '^GSPC',
    
    # 미국 개별 종목
    'Tesla': 'TSLA',
    'Nvidia': 'NVDA',
    'Apple': 'AAPL',
    'Google': 'GOOGL',
    'Microsoft': 'MSFT',
    'Amazon': 'AMZN',
    'Meta': 'META',
    
    # 한국 개별 종목
    'Samsung': '005930.KS',
    'SKHynix': '000660.KS',
    'Hyundai': '005380.KS',
    'LGEnergy': '373220.KS',
    'SamsungBio': '207940.KS',
    'Celltrion': '068270.KS',
    
    # 섹터 (대표 종목으로 매핑)
    'Shipbuilding': '009540.KS',   # HD한국조선해양
    'Defense': '012450.KS',         # 한화에어로스페이스
    'Battery': '373220.KS',         # LG에너지솔루션
    'Auto': '005380.KS',            # 현대차
    'Bio': '207940.KS',             # 삼성바이오로직스
    'Bank': '105560.KS',            # KB금융
    'Construction': '000720.KS',    # 현대건설
    'Steel': '005490.KS',           # POSCO홀딩스
    'Chemical': '051910.KS',        # LG화학
    'Energy': '096770.KS',          # SK이노베이션
    'Retail': '004170.KS',          # 신세계
    'Telecom': '017670.KS',         # SK텔레콤
    'Nuclear': '034020.KS',         # 두산에너빌리티
    'Semiconductor': '005930.KS',   # 삼성전자
    'Internet': '035720.KS',        # 카카오
    'Game': '036570.KS',            # 엔씨소프트
    'Entertainment': '352820.KS',   # 하이브
    
    # 암호화폐
    'Bitcoin': 'BTC-USD',
    'Ethereum': 'ETH-USD',
}

# Market calendar mapping (which exchange to use for trading days)
# 
# 거래소별 휴일/거래일 계산에 사용
# None = 24시간 거래 (암호화폐)
#
MARKET_CALENDAR = {
    # 지수
    'KOSPI': 'XKRX',
    'NASDAQ': 'NYSE',
    'SP500': 'NYSE',
    
    # 미국 종목
    'Tesla': 'NYSE',
    'Nvidia': 'NYSE',
    'Apple': 'NYSE',
    'Google': 'NYSE',
    'Microsoft': 'NYSE',
    'Amazon': 'NYSE',
    'Meta': 'NYSE',
    
    # 한국 종목
    'Samsung': 'XKRX',
    'SKHynix': 'XKRX',
    'Hyundai': 'XKRX',
    'LGEnergy': 'XKRX',
    'SamsungBio': 'XKRX',
    'Celltrion': 'XKRX',
    
    # 섹터 (한국)
    'Shipbuilding': 'XKRX',
    'Defense': 'XKRX',
    'Battery': 'XKRX',
    'Auto': 'XKRX',
    'Bio': 'XKRX',
    'Bank': 'XKRX',
    'Construction': 'XKRX',
    'Steel': 'XKRX',
    'Chemical': 'XKRX',
    'Energy': 'XKRX',
    'Retail': 'XKRX',
    'Telecom': 'XKRX',
    'Nuclear': 'XKRX',
    'Semiconductor': 'XKRX',
    'Internet': 'XKRX',
    'Game': 'XKRX',
    'Entertainment': 'XKRX',
    
    # 암호화폐 (24/7)
    'Bitcoin': None,
    'Ethereum': None,
}


def get_trading_day(asset: str, date_str: str, next_day: bool = False) -> str:
    """
    Get the trading day for a given asset and date.
    If the date is a weekend or holiday, returns the next trading day.
    For Bitcoin, returns the same date (24/7 trading).
    
    Args:
        asset: Asset name
        date_str: Date string in YYYY-MM-DD format
        next_day: If True, returns the NEXT trading day after the given date
    """
    calendar_name = MARKET_CALENDAR.get(asset)
    target_date = datetime.strptime(date_str, '%Y-%m-%d')
    
    if calendar_name is None:
        # Bitcoin trades 24/7
        if next_day:
            return (target_date + timedelta(days=1)).strftime('%Y-%m-%d')
        return date_str
    
    try:
        calendar = mcal.get_calendar(calendar_name)
        
        # Search up to 10 days ahead for next trading day
        if next_day:
            # Start from the day AFTER target_date
            start_date = target_date + timedelta(days=1)
        else:
            start_date = target_date
            
        end_date = start_date + timedelta(days=10)
        schedule = calendar.schedule(start_date=start_date, end_date=end_date)
        
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
    Get the close price comparing the NEXT trading day vs the publish day.
    
    This measures market reaction AFTER the video was published:
    - Video published Monday → Compare Tuesday close vs Monday close
    - This captures how the market moved after seeing the prediction
    
    Args:
        symbol: Asset name (e.g., 'Nvidia', 'KOSPI')
        date_str: Date in YYYY-MM-DD format (Korean time for the video publish date)
    
    Returns:
        dict with closePrice, date, direction, previousClose
    """
    resolved_symbol = SYMBOL_MAP.get(symbol, symbol)
    
    # Get the publish day's trading day (baseline)
    baseline_day = get_trading_day(symbol, date_str, next_day=False)
    baseline_date = datetime.strptime(baseline_day, '%Y-%m-%d')
    
    # Get the NEXT trading day AFTER the baseline (for measuring reaction)
    # This ensures we measure the reaction day, not the same day
    reaction_day = get_trading_day(symbol, baseline_day, next_day=True)
    reaction_date = datetime.strptime(reaction_day, '%Y-%m-%d')
    
    # Fetch data for a range covering both days
    fetch_start = baseline_date - timedelta(days=3)
    fetch_end = reaction_date + timedelta(days=3)
    
    try:
        ticker = yf.Ticker(resolved_symbol)
        hist = ticker.history(start=fetch_start, end=fetch_end, interval='1d')
        
        if hist.empty:
            return {'error': 'No data available'}
        
        # Normalize timezone
        hist.index = hist.index.tz_localize(None) if hist.index.tz else hist.index
        
        # Find close prices for baseline and reaction days
        baseline_normalized = baseline_date.replace(hour=0, minute=0, second=0, microsecond=0)
        reaction_normalized = reaction_date.replace(hour=0, minute=0, second=0, microsecond=0)
        
        baseline_close = None
        reaction_close = None
        reaction_actual_date = None
        
        for i, idx in enumerate(hist.index):
            idx_date = idx.replace(hour=0, minute=0, second=0, microsecond=0)
            
            # Find baseline close (publish day)
            if baseline_close is None and idx_date >= baseline_normalized:
                baseline_close = float(hist.iloc[i]['Close'])
            
            # Find reaction close (next trading day)
            if reaction_close is None and idx_date >= reaction_normalized:
                reaction_close = float(hist.iloc[i]['Close'])
                reaction_actual_date = idx_date.strftime('%Y-%m-%d')
        
        if reaction_close is None:
            return {'error': 'Could not find close price for reaction date'}
        
        # Calculate direction: compare reaction day vs baseline day
        direction = 'flat'
        if baseline_close is not None and baseline_close != 0:
            change_pct = ((reaction_close - baseline_close) / baseline_close) * 100
            if change_pct > 0.1:
                direction = 'up'
            elif change_pct < -0.1:
                direction = 'down'
        
        return {
            'symbol': resolved_symbol,
            'closePrice': round(reaction_close, 4),
            'previousClose': round(baseline_close, 4) if baseline_close else None,
            'date': reaction_actual_date,
            'requestedDate': date_str,
            'baselineDay': baseline_day,
            'reactionDay': reaction_day,
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


def get_multi_period_prices(symbol: str, date_str: str):
    """
    Get prices for multiple periods: 1d, 1w (5 trading days), 1m (20 trading days), 3m (60 trading days).
    
    Args:
        symbol: Asset name (e.g., 'Nvidia', 'KOSPI')
        date_str: Date in YYYY-MM-DD format (video publish date)
    
    Returns:
        dict with period data: { '1d': {...}, '1w': {...}, '1m': {...}, '3m': {...} }
    """
    resolved_symbol = SYMBOL_MAP.get(symbol, symbol)
    calendar_name = MARKET_CALENDAR.get(symbol)
    
    # Get the publish day's trading day (baseline)
    baseline_day = get_trading_day(symbol, date_str, next_day=False)
    baseline_date = datetime.strptime(baseline_day, '%Y-%m-%d')
    
    # Fetch ~90 days of data (enough for 60 trading days)
    fetch_start = baseline_date - timedelta(days=3)
    fetch_end = baseline_date + timedelta(days=120)
    
    try:
        ticker = yf.Ticker(resolved_symbol)
        hist = ticker.history(start=fetch_start, end=fetch_end, interval='1d')
        
        if hist.empty:
            return {'error': 'No data available'}
        
        # Normalize timezone
        hist.index = hist.index.tz_localize(None) if hist.index.tz else hist.index
        
        # Get trading days after baseline
        trading_days = []
        baseline_normalized = baseline_date.replace(hour=0, minute=0, second=0, microsecond=0)
        
        for idx in hist.index:
            idx_date = idx.replace(hour=0, minute=0, second=0, microsecond=0)
            if idx_date >= baseline_normalized:
                trading_days.append({
                    'date': idx_date.strftime('%Y-%m-%d'),
                    'close': float(hist.loc[idx, 'Close'])
                })
        
        if len(trading_days) < 2:
            return {'error': 'Not enough trading days'}
        
        # Baseline price (publish day or first available)
        baseline_close = trading_days[0]['close']
        
        # Period targets (trading day indices after baseline)
        # 1d = index 1 (next trading day)
        # 1w = index 5 (5 trading days)
        # 1m = index 20 (20 trading days)
        # 3m = index 60 (60 trading days)
        period_indices = {
            '1d': 1,
            '1w': 5,
            '1m': 20,
            '3m': 60
        }
        
        result = {
            'symbol': resolved_symbol,
            'baseline': {
                'date': trading_days[0]['date'],
                'close': baseline_close
            }
        }
        
        for period, target_idx in period_indices.items():
            if target_idx < len(trading_days):
                period_data = trading_days[target_idx]
                period_close = period_data['close']
                
                change_pct = ((period_close - baseline_close) / baseline_close) * 100 if baseline_close != 0 else 0
                
                direction = 'flat'
                if change_pct > 0.1:
                    direction = 'up'
                elif change_pct < -0.1:
                    direction = 'down'
                
                result[period] = {
                    'date': period_data['date'],
                    'close': round(period_close, 4),
                    'change': round(change_pct, 4),
                    'direction': direction,
                    'available': True
                }
            else:
                result[period] = {
                    'available': False,
                    'reason': f'Only {len(trading_days)} trading days available, need {target_idx + 1}'
                }
        
        return result
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return {'error': str(e)}


def main():
    if len(sys.argv) < 3:
        print("Usage:")
        print("  python market_data.py <symbol> <timestamp_ms> [hours_after]")
        print("  python market_data.py close <symbol> <date>")
        print("  python market_data.py multi <symbol> <date>")
        sys.exit(1)
    
    # Check if it's a multi-period request
    if sys.argv[1] == 'multi':
        if len(sys.argv) < 4:
            print("Usage: python market_data.py multi <symbol> <date>")
            sys.exit(1)
        
        symbol = sys.argv[2]
        date_str = sys.argv[3]
        
        result = get_multi_period_prices(symbol, date_str)
        print(json.dumps(result))
        
        if 'error' in result:
            sys.exit(1)
        return
    
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
