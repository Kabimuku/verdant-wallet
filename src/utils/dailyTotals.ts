// Utility functions for computing daily and monthly totals

export interface Transaction {
  amount: number;
  type: 'income' | 'expense';
  transaction_date: string;
}

export function computeDailyTotals(transactions: Transaction[], date: string = new Date().toISOString().split('T')[0]) {
  const dayTransactions = transactions.filter(transaction => 
    transaction.transaction_date.split('T')[0] === date
  );
  
  const dailyIncome = dayTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  
  const dailyExpenses = dayTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return { dailyIncome, dailyExpenses };
}

export function computeMonthlyTotals(transactions: Transaction[], month?: number, year?: number) {
  const currentMonth = month ?? new Date().getMonth();
  const currentYear = year ?? new Date().getFullYear();
  
  const monthlyData = transactions.filter(transaction => {
    const transactionDate = new Date(transaction.transaction_date);
    return transactionDate.getMonth() === currentMonth && 
           transactionDate.getFullYear() === currentYear;
  });

  const monthlyIncome = monthlyData
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  
  const monthlyExpenses = monthlyData
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return { monthlyIncome, monthlyExpenses };
}

export function formatCurrencyForScreen(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}