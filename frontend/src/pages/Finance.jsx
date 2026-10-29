import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  TrendingUp,
  CreditCard,
  X,
} from 'lucide-react';

const QUICK_CATEGORIES = ['Food', 'Transport', 'Tech / 3D', 'Gym', 'Investments', 'Fixed'];

export default function Finance({ onDataChange }) {
  const [overview, setOverview] = useState({
    total_balance: 0,
    monthly_income: 0,
    monthly_expenses: 0,
    monthly_budget_limit: 10000,
    accounts: [],
    recent_transactions: [],
  });
  const [loading, setLoading] = useState(true);
  const [budgetLimit, setBudgetLimit] = useState(() => {
    return Number(localStorage.getItem('locked_budget_limit')) || 10000;
  });

  // Modals state
  const [showTxModal, setShowTxModal] = useState(false);
  const [showAccModal, setShowAccModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Quick Transaction Form state
  const [txType, setTxType] = useState('expense');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState('Food');
  const [txDesc, setTxDesc] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');

  // New Account Form state
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState('debit');
  const [accBalance, setAccBalance] = useState('');

  // Transfer Form state
  const [fromAccId, setFromAccId] = useState('');
  const [toAccId, setToAccId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');

  const refreshFinance = useCallback(async () => {
    try {
      const { data } = await api.get(`/finance/overview?monthly_budget_limit=${budgetLimit}`);
      setOverview(data);
      if (data.accounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(String(data.accounts[0].id));
      }
      if (onDataChange) onDataChange();
    } catch (err) {
      console.error('Error loading finance overview:', err);
    } finally {
      setLoading(false);
    }
  }, [budgetLimit, selectedAccountId, onDataChange]);

  useEffect(() => {
    let isMounted = true;
    api
      .get(`/finance/overview?monthly_budget_limit=${budgetLimit}`)
      .then(({ data }) => {
        if (isMounted) {
          setOverview(data);
          if (data.accounts.length > 0) {
            setSelectedAccountId((prev) => prev || String(data.accounts[0].id));
          }
        }
      })
      .catch((err) => console.error('Initial finance fetch error:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [budgetLimit]);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!accName.trim()) return;
    await api.post('/finance/accounts', {
      name: accName,
      type: accType,
      balance: Number(accBalance) || 0,
      currency: 'MXN',
    });
    setAccName('');
    setAccBalance('');
    setShowAccModal(false);
    await refreshFinance();
  };

  const handleQuickTransaction = async (e) => {
    e.preventDefault();
    if (!txAmount || !selectedAccountId) return;
    await api.post('/finance/transactions', {
      account_id: Number(selectedAccountId),
      amount: Number(txAmount),
      type: txType,
      category: txCategory,
      description: txDesc || txCategory,
    });
    setTxAmount('');
    setTxDesc('');
    setShowTxModal(false);
    await refreshFinance();
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!fromAccId || !toAccId || !transferAmount || fromAccId === toAccId) return;
    await api.post('/finance/transfers', {
      from_account_id: Number(fromAccId),
      to_account_id: Number(toAccId),
      amount: Number(transferAmount),
    });
    setTransferAmount('');
    setShowTransferModal(false);
    await refreshFinance();
  };

  const handleBudgetChange = (newLimit) => {
    const val = Number(newLimit) || 1000;
    setBudgetLimit(val);
    localStorage.setItem('locked_budget_limit', String(val));
  };

  const budgetPercent = Math.min(
    100,
    Math.round((overview.monthly_expenses / (budgetLimit || 1)) * 100)
  );

  const budgetBarColor =
    budgetPercent >= 90
      ? 'bg-red-500'
      : budgetPercent >= 75
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  if (loading) {
    return <div className="text-slate-400 py-8">Loading Financial Telemetry...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Financial Engine</h1>
          <p className="text-slate-400 text-sm">
            Real-time liquidity, monthly budget execution, and ACID ledger.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAccModal(true)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5 border border-slate-700 transition"
          >
            <CreditCard className="w-4 h-4 text-emerald-400" /> + Account
          </button>
          {overview.accounts.length >= 2 && (
            <button
              onClick={() => {
                setFromAccId(String(overview.accounts[0].id));
                setToAccId(String(overview.accounts[1].id));
                setShowTransferModal(true);
              }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5 border border-slate-700 transition"
            >
              <ArrowLeftRight className="w-4 h-4 text-sky-400" /> Transfer
            </button>
          )}
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-sm mb-1">
            <span>Total Liquidity</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            ${overview.total_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-sm mb-1">
            <span>Monthly Income</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            +${overview.monthly_income.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-sm mb-1">
            <span>Monthly Burn (Expenses)</span>
            <ArrowDownRight className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-rose-400">
            -${overview.monthly_expenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Monthly Budget Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="font-semibold text-white">Monthly Budget Execution</span>
            <span className="text-slate-400 ml-2">({budgetPercent}% used)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Cap: $</span>
            <input
              type="number"
              value={budgetLimit}
              onChange={(e) => handleBudgetChange(e.target.value)}
              className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-right text-white"
            />
          </div>
        </div>
        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${budgetBarColor}`}
            style={{ width: `${budgetPercent}%` }}
          />
        </div>
      </div>

      {/* Accounts Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Active Accounts</h2>
        {overview.accounts.length === 0 ? (
          <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-8 text-center">
            <p className="text-slate-400 text-sm mb-3">
              No accounts created yet. Create your first account (e.g., Debit, Cash, GBM+) to start logging transactions.
            </p>
            <button
              onClick={() => setShowAccModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
            >
              + Create First Account
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {overview.accounts.map((acc) => (
              <div
                key={acc.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-slate-200">{acc.name}</span>
                  <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400">
                    {acc.type}
                  </span>
                </div>
                <p className="text-xl font-bold text-white">
                  ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                  <span className="text-xs text-slate-500 font-normal">{acc.currency}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Transactions List */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Recent Ledger Activity</h2>
        {overview.recent_transactions.length === 0 ? (
          <p className="text-slate-500 text-sm">No transactions recorded yet.</p>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800">
            {overview.recent_transactions.map((tx) => {
              const isExpense = tx.type === 'expense' || tx.type === 'transfer_out';
              return (
                <div key={tx.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl ${
                        isExpense
                          ? 'bg-rose-500/10 text-rose-400'
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}
                    >
                      {isExpense ? (
                        <ArrowDownRight className="w-4 h-4" />
                      ) : (
                        <TrendingUp className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        {tx.description || tx.category}
                      </p>
                      <span className="text-xs text-slate-500">{tx.category}</span>
                    </div>
                  </div>
                  <span
                    className={`font-semibold text-sm ${
                      isExpense ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {isExpense ? '-' : '+'}${tx.amount.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button (+) for < 5s Quick Expense */}
      {overview.accounts.length > 0 && (
        <button
          onClick={() => setShowTxModal(true)}
          title="Quick Transaction"
          className="fixed bottom-20 md:bottom-8 right-6 w-14 h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-xl shadow-emerald-950 flex items-center justify-center transition transform hover:scale-105 z-40"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      {/* Modal: Quick Transaction (< 5s) */}
      {showTxModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Quick Entry</h3>
              <button onClick={() => setShowTxModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickTransaction} className="space-y-4">
              {/* Type Toggle */}
              <div className="grid grid-cols-2 gap-2 bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTxType('expense')}
                  className={`py-2 rounded-lg text-sm font-semibold transition ${
                    txType === 'expense' ? 'bg-rose-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Expense (-)
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('income')}
                  className={`py-2 rounded-lg text-sm font-semibold transition ${
                    txType === 'income' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Income (+)
                </button>
              </div>

              {/* Amount Input (AutoFocus for instant typing) */}
              <div>
                <label className="text-xs text-slate-400">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  placeholder="0.00"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-2xl font-bold text-white focus:outline-none focus:border-emerald-500 mt-1"
                />
              </div>

              {/* Account Selector */}
              <div>
                <label className="text-xs text-slate-400">Account</label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white mt-1"
                >
                  {overview.accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (${acc.balance})
                    </option>
                  ))}
                </select>
              </div>

              {/* 1-Tap Category Chips */}
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">Category (1-Tap)</label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_CATEGORIES.map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setTxCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        txCategory === cat
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Note */}
              <input
                type="text"
                placeholder="Note (optional, e.g., Tacos, Uber, Filament)"
                value={txDesc}
                onChange={(e) => setTxDesc(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
              />

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition"
              >
                Save Transaction
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Account */}
      {showAccModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">New Account</h3>
              <button onClick={() => setShowAccModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Account Name (e.g., Debit Card, Cash, GBM+)"
                value={accName}
                onChange={(e) => setAccName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white"
              />
              <select
                value={accType}
                onChange={(e) => setAccType(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white"
              >
                <option value="debit">Debit / Checking</option>
                <option value="cash">Cash</option>
                <option value="investment">Investment (GBM+ / ETF)</option>
                <option value="credit">Credit Card</option>
              </select>
              <input
                type="number"
                step="0.01"
                placeholder="Initial Balance (0.00)"
                value={accBalance}
                onChange={(e) => setAccBalance(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white"
              />
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition"
              >
                Create Account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Transfer Between Accounts */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Transfer Funds</h3>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400">From Account</label>
                <select
                  value={fromAccId}
                  onChange={(e) => setFromAccId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white mt-1"
                >
                  {overview.accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (${acc.balance})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400">To Account</label>
                <select
                  value={toAccId}
                  onChange={(e) => setToAccId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white mt-1"
                >
                  {overview.accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (${acc.balance})
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="number"
                step="0.01"
                required
                placeholder="Amount to transfer ($)"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white"
              />
              <button
                type="submit"
                className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold py-3 rounded-xl transition"
              >
                Execute Transfer
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}