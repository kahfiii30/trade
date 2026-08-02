export type TradeResult = 'Win' | 'Loss' | 'BE' | 'Pending';
export type MarketType = 'Crypto' | 'Forex' | 'Stock' | 'Indices' | 'Commodities';
export type TradeDirection = 'Long' | 'Short' | 'Buy' | 'Sell';

export interface Profile {
  id: string;
  email: string;
  created_at: string;
}

export interface Settings {
  id: string;
  user_id: string;
  initial_capital: number;
  default_risk: number;
  default_rr: number;
  daily_max_trades: number;
  currency: string;
}

export interface Trade {
  id: string;
  user_id: string;
  ticket?: number | string;
  pair: string;
  market?: MarketType;
  direction: TradeDirection;
  lot?: number;
  position_size?: number;
  open_time?: string;
  close_time?: string;
  date?: string;
  entry_price?: number;
  exit_price?: number | null;
  stop_loss?: number | null;
  take_profit?: number | null;
  pnl?: number;
  pnl_nominal?: number;
  commission?: number;
  swap?: number;
  fee?: number;
  result?: TradeResult;
  rr_planned?: number;
  rr_realized?: number;
  risk_percent?: number;
  setup_name?: string;
  setup_tags?: string[];
  emotion?: string;
  mistakes?: string[];
  timeframe?: string;
  screenshot_before?: string;
  screenshot_after?: string;
  notes?: string;
  ai_analysis?: string;
  created_at?: string;
}

export interface Playbook {
  id: string;
  user_id: string;
  setup_name: string;
  rule_entry: string;
  rule_invalidation: string;
  main_timeframe: string;
  checklist?: string[];
  screenshot_url?: string;
  evaluation_notes?: string;
  is_active: boolean;
}
