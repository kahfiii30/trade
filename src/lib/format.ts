export function formatCurrency(amount: number, currencyCode: string | undefined | null): string {
  const code = (currencyCode || 'USD').toUpperCase();
  const absAmount = Math.abs(amount);
  
  if (code === 'IDR') {
    return `${amount < 0 ? '-' : ''}Rp ${absAmount.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  
  if (code === 'USC') {
    return `${amount < 0 ? '-' : ''}${absAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USC`;
  }

  // Default to USD
  return `${amount < 0 ? '-$' : '$'}${absAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
