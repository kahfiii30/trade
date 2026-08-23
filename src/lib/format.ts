export function formatCurrency(amount: number, currencyCode: string | undefined | null, showPlusSign: boolean = false): string {
  const code = (currencyCode || 'IDR').toUpperCase();
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : (showPlusSign && amount > 0 ? '+' : '');
  
  if (code === 'USD') {
    return `${sign}$${absAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  if (code === 'USC') {
    return `${sign}${absAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USC`;
  }

  // Default to IDR
  return `${sign}Rp ${absAmount.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
