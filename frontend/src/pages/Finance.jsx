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
} from 'lucide-react';
import {
  RetroCard,
  RetroButton,
  RetroBadge,
  OrnamentalDivider,
  RetroModal,
} from '../components/ui/RetroUI';

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
      ? 'bg-semantic-danger'
      : budgetPercent >= 75
      ? 'bg-cempasuchil'
      : 'bg-nopal';

  if (loading) {
    return (
      <div className="text-tinta-muted font-display py-8 font-bold">
        Loading Financial Telemetry...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-tinta/20 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-display text-tinta">
            Financial Engine
          </h1>
          <p className="text-tinta-muted text-sm">
            Real-time liquidity, monthly budget execution, and ACID ledger.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <RetroButton onClick={() => setShowAccModal(true)} variant="secondary">
            <CreditCard className="w-4 h-4 text-nopal" /> + Account
          </RetroButton>
          {overview.accounts.length >= 2 && (
            <RetroButton
              onClick={() => {
                setFromAccId(String(overview.accounts[0].id));
                setToAccId(String(overview.accounts[1].id));
                setShowTransferModal(true);
              }}
              variant="secondary"
            >
              <ArrowLeftRight className="w-4 h-4 text-cempasuchil" /> Transfer
            </RetroButton>
          )}
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RetroCard variant="highlighted">
          <div className="flex items-center justify-between text-tinta-muted text-xs font-bold uppercase tracking-wider mb-1">
            <span>Total Liquidity</span>
            <Wallet className="w-4 h-4 text-nopal" />
          </div>
          <p className="text-2xl font-extrabold font-display text-tinta">
            ${overview.total_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </RetroCard>

        <RetroCard>
          <div className="flex items-center justify-between text-tinta-muted text-xs font-bold uppercase tracking-wider mb-1">
            <span>Monthly Income</span>
            <ArrowUpRight className="w-4 h-4 text-nopal" />
          </div>
          <p className="text-2xl font-extrabold font-display text-nopal">
            +${overview.monthly_income.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </RetroCard>

        <RetroCard>
          <div className="flex items-center justify-between text-tinta-muted text-xs font-bold uppercase tracking-wider mb-1">
            <span>Monthly Burn (Expenses)</span>
            <ArrowDownRight className="w-4 h-4 text-semantic-danger" />
          </div>
          <p className="text-2xl font-extrabold font-display text-semantic-danger">
            -${overview.monthly_expenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </RetroCard>
      </div>

      {/* Monthly Budget Bar */}
      <RetroCard className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <div>
            <span className="font-bold font-display text-base text-tinta">
              Monthly Budget Execution
            </span>
            <span className="text-tinta-muted font-semibold ml-2">
              ({budgetPercent}% used)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase text-tinta-muted">Cap: $</span>
            <input
              type="number"
              value={budgetLimit}
              onChange={(e) => handleBudgetChange(e.target.value)}
              className="w-28 bg-crema border-2 border-tinta rounded-lg px-2.5 py-1 text-xs font-bold text-right text-tinta focus:outline-none focus:ring-2 focus:ring-nopal"
            />
          </div>
        </div>
        <div className="w-full h-4 bg-crema-sunken border-2 border-tinta rounded-full overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-300 ${budgetBarColor}`}
            style={{ width: `${budgetPercent}%` }}
          />
        </div>
      </RetroCard>

      <OrnamentalDivider label="Active Accounts & Vaults" />

      {/* Accounts Grid */}
      <div>
        {overview.accounts.length === 0 ? (
          <RetroCard variant="dashed" className="p-8 text-center">
            <p className="text-tinta-muted text-sm mb-4 font-medium">
              No accounts created yet. Create your first account (e.g., BBVA, Nu, Cash, GBM+) to start logging transactions.
            </p>
            <RetroButton onClick={() => setShowAccModal(true)} variant="primary">
              + Create First Account
            </RetroButton>
          </RetroCard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {overview.accounts.map((acc) => (
              <RetroCard key={acc.id} className="flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold font-display text-base text-tinta">
                    {acc.name}
                  </span>
                  <RetroBadge variant="nopal" className="uppercase">
                    {acc.type}
                  </RetroBadge>
                </div>
                <p className="text-xl font-extrabold font-display text-tinta">
                  ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                  <span className="text-xs text-tinta-muted font-sans font-semibold">
                    {acc.currency}
                  </span>
                </p>
              </RetroCard>
            ))}
          </div>
        )}
      </div>

      <OrnamentalDivider label="Recent Ledger Activity" />

      {/* Recent Transactions List */}
      <div>
        {overview.recent_transactions.length === 0 ? (
          <p className="text-tinta-muted text-sm text-center py-4 font-medium">
            No transactions recorded yet.
          </p>
        ) : (
          <RetroCard className="p-0 overflow-hidden divide-y-2 divide-tinta/15">
            {overview.recent_transactions.map((tx) => {
              const isExpense = tx.type === 'expense' || tx.type === 'transfer_out';
              return (
                <div
                  key={tx.id}
                  className="p-4 flex items-center justify-between hover:bg-maiz-soft/40 transition"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl border border-tinta ${
                        isExpense
                          ? 'bg-semantic-danger/15 text-semantic-danger'
                          : 'bg-nopal/15 text-nopal'
                      }`}
                    >
                      {isExpense ? (
                        <ArrowDownRight className="w-4 h-4" />
                      ) : (
                        <TrendingUp className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-tinta">
                        {tx.description || tx.category}
                      </p>
                      <span className="text-xs font-medium text-tinta-muted">
                        {tx.category}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`font-extrabold font-display text-sm ${
                      isExpense ? 'text-semantic-danger' : 'text-nopal'
                    }`}
                  >
                    {isExpense ? '-' : '+'}${tx.amount.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </RetroCard>
        )}
      </div>

      {/* Floating Action Button (+) for < 5s Quick Expense */}
      {overview.accounts.length > 0 && (
        <button
          onClick={() => setShowTxModal(true)}
          title="Quick Transaction"
          className="fixed bottom-20 md:bottom-8 right-6 w-14 h-14 bg-cempasuchil hover:bg-cempasuchil-dark text-crema border-2 border-tinta rounded-full shadow-vintage flex items-center justify-center transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none z-40"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      {/* Modal: Quick Transaction (< 5s) */}
      <RetroModal
        isOpen={showTxModal}
        onClose={() => setShowTxModal(false)}
        title="Quick Ledger Entry"
      >
        <form onSubmit={handleQuickTransaction} className="space-y-4">
          <div className="grid grid-cols-2 gap-2 bg-crema-sunken p-1.5 rounded-xl border-2 border-tinta">
            <button
              type="button"
              onClick={() => setTxType('expense')}
              className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                txType === 'expense'
                  ? 'bg-semantic-danger text-crema border border-tinta shadow-vintage-sm'
                  : 'text-tinta-muted'
              }`}
            >
              Expense (-)
            </button>
            <button
              type="button"
              onClick={() => setTxType('income')}
              className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                txType === 'income'
                  ? 'bg-nopal text-crema border border-tinta shadow-vintage-sm'
                  : 'text-tinta-muted'
              }`}
            >
              Income (+)
            </button>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted">
              Amount ($)
            </label>
            <input
              type="number"
              step="0.01"
              required
              autoFocus
              placeholder="0.00"
              value={txAmount}
              onChange={(e) => setTxAmount(e.target.value)}
              className="w-full bg-crema border-2 border-tinta rounded-xl px-4 py-3 text-2xl font-extrabold font-display text-tinta focus:outline-none focus:ring-2 focus:ring-nopal mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted">
              Account
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2.5 text-sm font-semibold text-tinta mt-1"
            >
              {overview.accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (${acc.balance})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1.5">
              Category (1-Tap)
            </label>
            <div className="flex flex-wrap gap-2">
              {QUICK_CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setTxCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                    txCategory === cat
                      ? 'bg-nopal text-crema border-tinta shadow-vintage-sm'
                      : 'bg-crema text-tinta-muted border-tinta/40 hover:bg-maiz-soft'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <input
            type="text"
            placeholder="Note (optional, e.g., Tacos, Uber, Filament)"
            value={txDesc}
            onChange={(e) => setTxDesc(e.target.value)}
            className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2.5 text-sm text-tinta placeholder:text-tinta-soft"
          />

          <RetroButton type="submit" variant="accent" className="w-full py-3">
            Save Transaction
          </RetroButton>
        </form>
      </RetroModal>

      {/* Modal: Create Account */}
      <RetroModal
        isOpen={showAccModal}
        onClose={() => setShowAccModal(false)}
        title="New Financial Account"
      >
        <form onSubmit={handleCreateAccount} className="space-y-4">
          <input
            type="text"
            required
            placeholder="Account Name (e.g., BBVA Debit, Nu, Cash, GBM+)"
            value={accName}
            onChange={(e) => setAccName(e.target.value)}
            className="w-full bg-crema border-2 border-tinta rounded-xl px-4 py-2.5 text-sm font-medium text-tinta"
          />
          <select
            value={accType}
            onChange={(e) => setAccType(e.target.value)}
            className="w-full bg-crema border-2 border-tinta rounded-xl px-4 py-2.5 text-sm font-semibold text-tinta"
          >
            <option value="debit">Debit / Checking</option>
            <option value="cash">Cash</option>
            <option value="investment">Investment (GBM+ / Cajita Nu)</option>
            <option value="credit">Credit Card</option>
          </select>
          <input
            type="number"
            step="0.01"
            placeholder="Initial Balance (0.00)"
            value={accBalance}
            onChange={(e) => setAccBalance(e.target.value)}
            className="w-full bg-crema border-2 border-tinta rounded-xl px-4 py-2.5 text-sm font-medium text-tinta"
          />
          <RetroButton type="submit" variant="primary" className="w-full py-3">
            Create Account
          </RetroButton>
        </form>
      </RetroModal>

      {/* Modal: Transfer Between Accounts */}
      <RetroModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        title="Transfer Funds"
      >
        <form onSubmit={handleTransfer} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted">
              From Account
            </label>
            <select
              value={fromAccId}
              onChange={(e) => setFromAccId(e.target.value)}
              className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2.5 text-sm font-semibold text-tinta mt-1"
            >
              {overview.accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (${acc.balance})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted">
              To Account
            </label>
            <select
              value={toAccId}
              onChange={(e) => setToAccId(e.target.value)}
              className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2.5 text-sm font-semibold text-tinta mt-1"
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
            className="w-full bg-crema border-2 border-tinta rounded-xl px-4 py-2.5 text-sm font-medium text-tinta"
          />
          <RetroButton type="submit" variant="primary" className="w-full py-3">
            Execute Transfer
          </RetroButton>
        </form>
      </RetroModal>
    </div>
  );
}