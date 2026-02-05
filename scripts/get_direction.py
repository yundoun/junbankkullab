#!/usr/bin/env python3
"""주어진 종목의 시장 방향을 조회"""
import sys
import yfinance as yf

SYMBOL_MAP = {
    'KOSPI': '^KS11',
    'SP500': '^GSPC',
    'NASDAQ': '^IXIC',
    'Samsung': '005930.KS',
    'SKHynix': '000660.KS',
    'Nvidia': 'NVDA',
    'Tesla': 'TSLA',
    'Bitcoin': 'BTC-USD',
}

def get_direction(asset: str, start_date: str, end_date: str) -> str:
    symbol = SYMBOL_MAP.get(asset)
    if not symbol:
        return 'no_data'
    
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(start=start_date, end=end_date)
        
        if len(hist) >= 2:
            change = (hist['Close'].iloc[1] - hist['Close'].iloc[0]) / hist['Close'].iloc[0] * 100
            if change > 0.1:
                return 'up'
            elif change < -0.1:
                return 'down'
            else:
                return 'flat'
        else:
            return 'no_data'
    except Exception as e:
        return 'no_data'

if __name__ == '__main__':
    if len(sys.argv) != 4:
        print('no_data')
        sys.exit(1)
    
    asset = sys.argv[1]
    start_date = sys.argv[2]
    end_date = sys.argv[3]
    
    result = get_direction(asset, start_date, end_date)
    print(result)
