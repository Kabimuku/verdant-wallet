interface Transaction {
  amount: number;
  type: 'income' | 'expense';
  transaction_date: string;
}

interface Budget {
  amount: number;
  category_id: string | null;
}

export interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  dailyAllowance: number;
  daysLeft: number;
  percentage: number;
  status: 'safe' | 'warning' | 'danger';
}

export const calculateBudgetSummary = (
  budgets: Budget[],
  transactions: Transaction[],
  month: number,
  year: number
): BudgetSummary => {
  // Calculate total budget
  const totalBudget = budgets.reduce((sum, budget) => sum + budget.amount, 0);

  // Calculate total spent for the month
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0);
  
  const monthlyExpenses = transactions.filter(t => {
    const transactionDate = new Date(t.transaction_date);
    return (
      t.type === 'expense' &&
      transactionDate >= startOfMonth &&
      transactionDate <= endOfMonth
    );
  });

  const totalSpent = monthlyExpenses.reduce((sum, t) => sum + t.amount, 0);

  // Calculate remaining budget
  const remaining = totalBudget - totalSpent;

  // Calculate days left in month
  const today = new Date();
  const lastDay = new Date(year, month, 0);
  const daysLeft = Math.max(0, lastDay.getDate() - today.getDate() + 1);

  // Calculate daily allowance
  const dailyAllowance = daysLeft > 0 ? Math.max(0, remaining / daysLeft) : 0;

  // Calculate percentage used
  const percentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // Determine status
  let status: 'safe' | 'warning' | 'danger' = 'safe';
  if (percentage > 100) {
    status = 'danger';
  } else if (percentage > 80) {
    status = 'warning';
  }

  return {
    totalBudget,
    totalSpent,
    remaining,
    dailyAllowance,
    daysLeft,
    percentage,
    status
  };
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export const getBudgetStatusColor = (status: 'safe' | 'warning' | 'danger'): string => {
  switch (status) {
    case 'safe':
      return 'text-emerald-500';
    case 'warning':
      return 'text-yellow-500';
    case 'danger':
      return 'text-red-500';
    default:
      return 'text-muted-foreground';
  }
};

export const getBudgetStatusText = (status: 'safe' | 'warning' | 'danger'): string => {
  switch (status) {
    case 'safe':
      return 'On Track';
    case 'warning':
      return 'Approaching Limit';
    case 'danger':
      return 'Over Budget';
    default:
      return 'Unknown';
  }
};

export const generateBudgetRecommendation = (summary: BudgetSummary): string => {
  const { remaining, dailyAllowance, daysLeft, percentage } = summary;

  if (percentage > 100) {
    return `You're ₹${Math.abs(remaining).toFixed(0)} over budget. Consider reducing expenses.`;
  }

  if (percentage > 80) {
    return `Budget alert! You have ₹${remaining.toFixed(0)} left for ${daysLeft} days.`;
  }

  if (daysLeft > 0) {
    return `You can spend ₹${dailyAllowance.toFixed(0)} per day for the next ${daysLeft} days.`;
  }

  return 'Great job staying within budget this month!';
};