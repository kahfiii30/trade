import type { Trade } from '../types/database';

/**
 * Returns the ISO date string of the trade, prioritizing date -> close_time -> open_time -> created_at
 */
export const getTradeDate = (trade: Partial<Trade>): string => {
  return trade.date || trade.close_time || trade.open_time || trade.created_at || new Date().toISOString();
};

/**
 * Returns the volume/lot of the trade (position_size or lot)
 */
export const getTradeLot = (trade: Partial<Trade>): number => {
  const lotVal = trade.position_size ?? trade.lot;
  return lotVal !== undefined && lotVal !== null ? Number(lotVal) : 0;
};

/**
 * Returns the gross PnL of the trade (pnl_nominal or pnl)
 */
export const getTradeGrossPnL = (trade: Partial<Trade>): number => {
  const pnlVal = trade.pnl_nominal ?? trade.pnl;
  return pnlVal !== undefined && pnlVal !== null ? Number(pnlVal) : 0;
};

/**
 * Returns the total fee / commission / swap
 */
export const getTradeFee = (trade: Partial<Trade>): number => {
  if (trade.fee !== undefined && trade.fee !== null) {
    return Number(trade.fee);
  }
  return Number(trade.commission || 0) + Number(trade.swap || 0);
};

/**
 * Returns the net PnL (Gross PnL minus fee/commission/swap)
 */
export const getTradeNetPnL = (trade: Partial<Trade>): number => {
  // If pnl is explicitly provided (MT5 style), calculate net as pnl - commission - swap
  if (trade.pnl !== undefined && trade.pnl !== null) {
    return Number(trade.pnl) - Number(trade.commission || 0) - Number(trade.swap || 0);
  }
  // If pnl_nominal is provided (manual form or MT5 rest sync where pnl is already net/nominal)
  if (trade.pnl_nominal !== undefined && trade.pnl_nominal !== null) {
    return Number(trade.pnl_nominal);
  }
  return 0;
};

/**
 * Determines if a trade is a Win, Loss, or BE based on result tag or net PnL
 */
export const isTradeWin = (trade: Partial<Trade>): boolean => {
  if (trade.result === 'Win') return true;
  if (trade.result === 'Loss' || trade.result === 'BE' || trade.result === 'Pending') return false;
  return getTradeNetPnL(trade) > 0;
};

export const isTradeLoss = (trade: Partial<Trade>): boolean => {
  if (trade.result === 'Loss') return true;
  if (trade.result === 'Win' || trade.result === 'BE' || trade.result === 'Pending') return false;
  return getTradeNetPnL(trade) < 0;
};

export const isTradeBE = (trade: Partial<Trade>): boolean => {
  if (trade.result === 'BE') return true;
  if (trade.result === 'Win' || trade.result === 'Loss') return false;
  return getTradeNetPnL(trade) === 0;
};
