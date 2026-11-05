import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import {
  Wallet,
  Plus,
  ArrowDownRight,
  ArrowLeftRight,
  TrendingUp,
  CreditCard,
  Building2,
  PiggyBank,
  CalendarClock,
  ShieldCheck,
  Banknote,
  Repeat2,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';
import {
  RetroCard,
  RetroButton,
  RetroBadge,
  OrnamentalDivider,
  RetroModal,
} from '../components/ui/RetroUI';

const QUICK_CATEGORIES = ['Food', 'Transport', 'Tech / 3D', 'Gym', 'Investments', 'Fixed'];
const TABS = [
  { id: 'ledger', label: 'Cuentas & Libro', icon: BookOpen },
  { id: 'cards', label: 'Tarjetas & Bancos', icon: CreditCard },
  { id: 'savings', label: 'Cajitas & Deudas', icon: PiggyBank },
];

const fmtMXN = (n) =>
  Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

export default function Finance({ onDataChange }) {
  const [overview, setOverview] = useState({
    total_balance: 0,
    monthly_income: 0,
    monthly_expenses: 0,
    monthly_budget_limit: 10000,
    budget_used_pct: 0,
    accounts: [],
    recent_transactions: [],
    institutions: [],
    instruments: [],
    savings_funds: [],
    debts: [],
    subscriptions: [],
    credit_debt_total: 0,
    savings_total: 0,
    net_liquidity: 0,
    safe_to_spend_daily: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ledger');
  const [budgetLimit, setBudgetLimit] = useState(() => {
    return Number(localStorage.getItem('locked_budget_limit')) || 10000;
  });

  // ---- Modal visibility ----
  const [showTxModal, setShowTxModal] = useState(false);
  const [showAccModal, setShowAccModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showInstitutionModal, setShowInstitutionModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showPayCardModal, setShowPayCardModal] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);

  // ---- Quick Transaction form ----
  const [txType, setTxType] = useState('expense');
  const [txPayMethod, setTxPayMethod] = useState('account'); // 'account' | 'card'
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState('Food');
  const [txDesc, setTxDesc] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedInstrumentId, setSelectedInstrumentId] = useState('');

  // ---- New Account form ----
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState('debit');
  const [accBalance, setAccBalance] = useState('');

  // ---- Transfer form ----
  const [fromAccId, setFromAccId] = useState('');
  const [toAccId, setToAccId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');

  // ---- Institution form ----
  const [instName, setInstName] = useState('');
  const [instCategory, setInstCategory] = useState('bank');

  // ---- Card / Instrument form ----
  const [cardName, setCardName] = useState('');
  const [cardType, setCardType] = useState('credit_card');
  const [cardLimit, setCardLimit] = useState('');
  const [cardCutoff, setCardCutoff] = useState('');
  const [cardDueDay, setCardDueDay] = useState('');
  const [cardInstitutionId, setCardInstitutionId] = useState('');

  // ---- Pay Card form ----
  const [payCardId, setPayCardId] = useState('');
  const [payDebitAccId, setPayDebitAccId] = useState('');
  const [payCardAmount, setPayCardAmount] = useState('');

  // ---- Savings Fund form ----
  const [fundName, setFundName] = useState('');
  const [fundTarget, setFundTarget] = useState('');
  const [fundRate, setFundRate] = useState('');
  const [fundAlloc, setFundAlloc] = useState('');

  // ---- Contribute form ----
  const [contribFundId, setContribFundId] = useState('');
  const [contribAmount, setContribAmount] = useState('');
  const [contribAccId, setContribAccId] = useState('');
  const [contribWithdraw, setContribWithdraw] = useState(false);

  // ---- Debt form ----
  const [debtName, setDebtName] = useState('');
  const [debtTotal, setDebtTotal] = useState('');
  const [debtOutstanding, setDebtOutstanding] = useState('');
  const [debtRate, setDebtRate] = useState('');
  const [debtMonthly, setDebtMonthly] = useState('');
  const [debtNextDate, setDebtNextDate] = useState('');

  // ---- Subscription form ----
  const [subName, setSubName] = useState('');
  const [subAmount, setSubAmount] = useState('');
  const [subBillingDay, setSubBillingDay] = useState('');
  const [subCategory, setSubCategory] = useState('Digital');
  const [subNextDate, setSubNextDate] = useState('');

  // =====================================================================
  // DATA FETCHING
  // =====================================================================

  const refreshFinance = useCallback(async () => {
    try {
      const { data } = await api.get(`/finance/overview?monthly_budget_limit=${budgetLimit}`);
      setOverview(data);
      if (data.accounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(String(data.accounts[0].id));
      }
      if (data.instruments.length > 0 && !selectedInstrumentId) {
        setSelectedInstrumentId(String(data.instruments[0].id));
      }
      if (onDataChange) onDataChange();
    } catch (err) {
      console.error('Error loading finance overview:', err);
    }
  }, [budgetLimit, selectedAccountId, selectedInstrumentId, onDataChange]);

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
          if (data.instruments.length > 0) {
            setSelectedInstrumentId((prev) => prev || String(data.instruments[0].id));
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

  // =====================================================================
  // HANDLERS
  // =====================================================================

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!accName.trim()) return;
    await api.post('/finance/accounts', {
      name: accName,
      type: accType,
      balance: Number(accBalance) || 0,
      currency: 'MXN',
    });
    setAccName(''); setAccBalance('');
    setShowAccModal(false);
    await refreshFinance();
  };

  const handleQuickTransaction = async (e) => {
    e.preventDefault();
    if (!txAmount) return;

    if (txType === 'income' || txPayMethod === 'account') {
      if (!selectedAccountId) return;
      await api.post('/finance/transactions', {
        account_id: Number(selectedAccountId),
        amount: Number(txAmount),
        type: txType,
        category: txCategory,
        description: txDesc || txCategory,
      });
    } else {
      // credit_charge
      if (!selectedInstrumentId) return;
      await api.post('/finance/transactions', {
        instrument_id: Number(selectedInstrumentId),
        amount: Number(txAmount),
        type: 'credit_charge',
        category: txCategory,
        description: txDesc || txCategory,
      });
    }
    setTxAmount(''); setTxDesc('');
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

  const handleCreateInstitution = async (e) => {
    e.preventDefault();
    if (!instName.trim()) return;
    await api.post('/finance/institutions', { name: instName, category: instCategory });
    setInstName('');
    setShowInstitutionModal(false);
    await refreshFinance();
  };

  const handleCreateCard = async (e) => {
    e.preventDefault();
    if (!cardName.trim()) return;
    await api.post('/finance/instruments', {
      name: cardName,
      instrument_type: cardType,
      credit_limit: Number(cardLimit) || 0,
      cutoff_day: cardCutoff ? Number(cardCutoff) : null,
      payment_due_day: cardDueDay ? Number(cardDueDay) : null,
      institution_id: cardInstitutionId ? Number(cardInstitutionId) : null,
    });
    setCardName(''); setCardLimit(''); setCardCutoff(''); setCardDueDay(''); setCardInstitutionId('');
    setShowCardModal(false);
    await refreshFinance();
  };

  const handlePayCard = async (e) => {
    e.preventDefault();
    if (!payCardId || !payDebitAccId || !payCardAmount) return;
    await api.post(`/finance/instruments/${payCardId}/pay`, {
      debit_account_id: Number(payDebitAccId),
      amount: Number(payCardAmount),
    });
    setPayCardAmount('');
    setShowPayCardModal(false);
    await refreshFinance();
  };

  const handleCreateFund = async (e) => {
    e.preventDefault();
    if (!fundName.trim()) return;
    await api.post('/finance/savings-funds', {
      name: fundName,
      target_amount: Number(fundTarget) || 0,
      annual_rate: Number(fundRate) || 0,
      monthly_allocation: Number(fundAlloc) || 0,
    });
    setFundName(''); setFundTarget(''); setFundRate(''); setFundAlloc('');
    setShowFundModal(false);
    await refreshFinance();
  };

  const handleContribute = async (e) => {
    e.preventDefault();
    if (!contribFundId || !contribAmount) return;
    await api.post(`/finance/savings-funds/${contribFundId}/contribute`, {
      amount: Number(contribAmount),
      account_id: contribAccId ? Number(contribAccId) : null,
      withdraw: contribWithdraw,
    });
    setContribAmount(''); setContribAccId('');
    setShowContributeModal(false);
    await refreshFinance();
  };

  const handleCreateDebt = async (e) => {
    e.preventDefault();
    if (!debtName.trim()) return;
    await api.post('/finance/debts', {
      name: debtName,
      total_amount: Number(debtTotal) || 0,
      outstanding_balance: Number(debtOutstanding) || 0,
      interest_rate: Number(debtRate) || 0,
      monthly_payment: Number(debtMonthly) || 0,
      next_payment_date: debtNextDate || null,
    });
    setDebtName(''); setDebtTotal(''); setDebtOutstanding(''); setDebtRate(''); setDebtMonthly(''); setDebtNextDate('');
    setShowDebtModal(false);
    await refreshFinance();
  };

  const handleCreateSub = async (e) => {
    e.preventDefault();
    if (!subName.trim()) return;
    await api.post('/finance/subscriptions', {
      name: subName,
      amount: Number(subAmount) || 0,
      billing_day: subBillingDay ? Number(subBillingDay) : null,
      category: subCategory,
      next_billing_date: subNextDate || null,
    });
    setSubName(''); setSubAmount(''); setSubBillingDay(''); setSubNextDate('');
    setShowSubModal(false);
    await refreshFinance();
  };

  const handleBudgetChange = (newLimit) => {
    const val = Number(newLimit) || 1000;
    setBudgetLimit(val);
    localStorage.setItem('locked_budget_limit', String(val));
  };

  // =====================================================================
  // DERIVED UI VALUES
  // =====================================================================

  const budgetPercent = Math.min(
    100,
    Math.round((overview.monthly_expenses / (budgetLimit || 1)) * 100)
  );
  const budgetBarColor =
    budgetPercent >= 90 ? 'bg-semantic-danger'
      : budgetPercent >= 75 ? 'bg-cempasuchil'
        : 'bg-nopal';

  const creditCards = overview.instruments.filter((i) => i.instrument_type === 'credit_card');

  if (loading) {
    return (
      <div className="text-tinta-muted font-display py-8 font-bold">
        Loading Financial Telemetry...
      </div>
    );
  }

  // =====================================================================
  // RENDER
  // =====================================================================

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-tinta/20 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-display text-tinta">
            Financial Engine
          </h1>
          <p className="text-tinta-muted text-sm">
            Real-time liquidity · Credit · Savings · Safe-to-Spend
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

      {/* ── Executive KPI Bar (4 cards) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <RetroCard>
          <div className="flex items-center justify-between text-tinta-muted text-xs font-bold uppercase tracking-wider mb-1">
            <span>Liquidez Total</span>
            <Wallet className="w-4 h-4 text-nopal" />
          </div>
          <p className="text-xl font-extrabold font-display text-tinta">
            {fmtMXN(overview.total_balance)}
          </p>
        </RetroCard>

        <RetroCard>
          <div className="flex items-center justify-between text-tinta-muted text-xs font-bold uppercase tracking-wider mb-1">
            <span>Deuda TDC</span>
            <AlertTriangle className="w-4 h-4 text-semantic-danger" />
          </div>
          <p className="text-xl font-extrabold font-display text-semantic-danger">
            {fmtMXN(overview.credit_debt_total)}
          </p>
        </RetroCard>

        <RetroCard>
          <div className="flex items-center justify-between text-tinta-muted text-xs font-bold uppercase tracking-wider mb-1">
            <span>En Cajitas</span>
            <PiggyBank className="w-4 h-4 text-oliva" />
          </div>
          <p className="text-xl font-extrabold font-display text-oliva">
            {fmtMXN(overview.savings_total)}
          </p>
        </RetroCard>

        <RetroCard variant="nopal">
          <div className="flex justify-between text-crema/80 text-xs font-bold uppercase mb-1">
            <span>Safe / Día</span>
            <ShieldCheck className="w-4 h-4 text-cempasuchil" />
          </div>
          <p className="text-2xl font-extrabold font-display text-crema">
            ${overview.safe_to_spend_daily}
          </p>
          <p className="text-xs text-crema/80 mt-1">
            Liquidez neta: ${overview.net_liquidity}
          </p>
        </RetroCard>
      </div>

      {/* ── Budget Bar ── */}
      <RetroCard className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <div>
            <span className="font-bold font-display text-base text-tinta">
              Ejecución Presupuestal Mensual
            </span>
            <span className="text-tinta-muted font-semibold ml-2">
              ({budgetPercent}% usado)
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

      {/* ── Tab Navigation ── */}
      <div className="flex gap-1 bg-crema-sunken p-1.5 rounded-xl border-2 border-tinta">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${activeTab === tab.id
                  ? 'bg-cempasuchil text-crema border border-tinta shadow-vintage-sm'
                  : 'text-tinta-muted hover:bg-maiz-soft'
                }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TAB A: Cuentas & Libro Mayor
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'ledger' && (
        <div className="space-y-6">
          <OrnamentalDivider label="Cuentas Activas" />
          {overview.accounts.length === 0 ? (
            <RetroCard variant="dashed" className="p-8 text-center">
              <p className="text-tinta-muted text-sm mb-4 font-medium">
                Sin cuentas aún. Crea tu primera cuenta (BBVA, Nu, Efectivo, GBM+).
              </p>
              <RetroButton onClick={() => setShowAccModal(true)} variant="primary">
                + Crear Primera Cuenta
              </RetroButton>
            </RetroCard>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {overview.accounts.map((acc) => (
                <RetroCard key={acc.id} className="flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold font-display text-base text-tinta">{acc.name}</span>
                    <RetroBadge variant="nopal" className="uppercase">{acc.type}</RetroBadge>
                  </div>
                  <p className="text-xl font-extrabold font-display text-tinta">
                    {fmtMXN(acc.balance)}{' '}
                    <span className="text-xs text-tinta-muted font-sans font-semibold">
                      {acc.currency}
                    </span>
                  </p>
                </RetroCard>
              ))}
            </div>
          )}

          <OrnamentalDivider label="Actividad Reciente" />
          {overview.recent_transactions.length === 0 ? (
            <p className="text-tinta-muted text-sm text-center py-4 font-medium">
              Sin transacciones registradas aún.
            </p>
          ) : (
            <RetroCard className="p-0 overflow-hidden divide-y-2 divide-tinta/15">
              {overview.recent_transactions.map((tx) => {
                const isExpense =
                  tx.type === 'expense' ||
                  tx.type === 'transfer_out' ||
                  tx.type === 'credit_payment';
                const isCredit = tx.type === 'credit_charge';
                return (
                  <div
                    key={tx.id}
                    className="p-4 flex items-center justify-between hover:bg-maiz-soft/40 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xl border border-tinta ${isCredit
                            ? 'bg-cempasuchil/15 text-cempasuchil-dark'
                            : isExpense
                              ? 'bg-semantic-danger/15 text-semantic-danger'
                              : 'bg-nopal/15 text-nopal'
                          }`}
                      >
                        {isCredit ? (
                          <CreditCard className="w-4 h-4" />
                        ) : isExpense ? (
                          <ArrowDownRight className="w-4 h-4" />
                        ) : (
                          <TrendingUp className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-tinta">
                          {tx.description || tx.category}
                        </p>
                        <span className="text-xs font-medium text-tinta-muted">{tx.category}</span>
                      </div>
                    </div>
                    <span
                      className={`font-extrabold font-display text-sm ${isCredit
                          ? 'text-cempasuchil-dark'
                          : isExpense
                            ? 'text-semantic-danger'
                            : 'text-nopal'
                        }`}
                    >
                      {isExpense ? '-' : isCredit ? '⬆' : '+'}
                      {fmtMXN(tx.amount)}
                    </span>
                  </div>
                );
              })}
            </RetroCard>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB B: Tarjetas & Instituciones
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'cards' && (
        <div className="space-y-6">
          {/* Institutions */}
          <div className="flex items-center justify-between">
            <OrnamentalDivider label="Instituciones Financieras" />
            <RetroButton
              onClick={() => setShowInstitutionModal(true)}
              variant="secondary"
            >
              <Building2 className="w-4 h-4 text-tinta" /> + Institución
            </RetroButton>
          </div>
          {overview.institutions.length === 0 ? (
            <RetroCard variant="dashed" className="text-center py-6">
              <p className="text-tinta-muted text-sm">
                Sin instituciones. Agrega tu banco o fintech (BBVA, Nu, GBM...).
              </p>
            </RetroCard>
          ) : (
            <div className="flex flex-wrap gap-2">
              {overview.institutions.map((inst) => (
                <RetroBadge key={inst.id} variant="cempasuchil" className="text-sm px-3 py-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {inst.name}
                  <span className="opacity-60 ml-1 text-xs">({inst.category})</span>
                </RetroBadge>
              ))}
            </div>
          )}

          {/* Credit Cards */}
          <div className="flex items-center justify-between">
            <OrnamentalDivider label="Tarjetas de Crédito" />
            <RetroButton onClick={() => setShowCardModal(true)} variant="secondary">
              <CreditCard className="w-4 h-4 text-nopal" /> + Tarjeta
            </RetroButton>
          </div>
          {creditCards.length === 0 ? (
            <RetroCard variant="dashed" className="text-center py-6">
              <p className="text-tinta-muted text-sm">
                Sin tarjetas de crédito. Registra tu Nu, Liverpool, BBVA TDC...
              </p>
            </RetroCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {creditCards.map((card) => {
                const usagePct = card.credit_limit > 0
                  ? Math.min(100, (card.current_debt / card.credit_limit) * 100)
                  : 0;
                const barColor =
                  usagePct >= 90 ? 'bg-semantic-danger'
                    : usagePct >= 70 ? 'bg-cempasuchil'
                      : 'bg-nopal';
                return (
                  <RetroCard key={card.id}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold font-display text-tinta">{card.name}</span>
                      <RetroBadge variant="cempasuchil">TDC</RetroBadge>
                    </div>
                    <div className="flex items-center gap-4 text-sm mb-3">
                      <span className="text-tinta-muted">Deuda: <span className="font-bold text-semantic-danger">{fmtMXN(card.current_debt)}</span></span>
                      <span className="text-tinta-muted">Límite: <span className="font-bold text-tinta">{fmtMXN(card.credit_limit)}</span></span>
                    </div>
                    <div className="w-full h-2.5 bg-crema-sunken border border-tinta/30 rounded-full overflow-hidden mb-3">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                        style={{ width: `${usagePct}%` }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {card.cutoff_day && (
                        <RetroBadge variant="maiz">
                          <CalendarClock className="w-3 h-3" />
                          Corte: día {card.cutoff_day}
                        </RetroBadge>
                      )}
                      {card.payment_due_day && (
                        <RetroBadge variant="oliva">
                          <Banknote className="w-3 h-3" />
                          Pago: día {card.payment_due_day}
                        </RetroBadge>
                      )}
                    </div>
                    <RetroButton
                      onClick={() => {
                        setPayCardId(String(card.id));
                        setPayCardAmount(String(card.current_debt));
                        setPayDebitAccId(overview.accounts[0] ? String(overview.accounts[0].id) : '');
                        setShowPayCardModal(true);
                      }}
                      variant="accent"
                      className="w-full"
                    >
                      <Banknote className="w-4 h-4" /> Pagar Tarjeta
                    </RetroButton>
                  </RetroCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB C: Cajitas, Deudas & Suscripciones
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'savings' && (
        <div className="space-y-6">
          {/* Savings Funds */}
          <div className="flex items-center justify-between">
            <OrnamentalDivider label="Cajitas & Fondos de Ahorro" />
            <RetroButton onClick={() => setShowFundModal(true)} variant="secondary">
              <PiggyBank className="w-4 h-4 text-oliva" /> + Cajita
            </RetroButton>
          </div>
          {overview.savings_funds.length === 0 ? (
            <RetroCard variant="dashed" className="text-center py-6">
              <p className="text-tinta-muted text-sm">
                Sin fondos de ahorro. Crea tu Cajita Nu, GBM Smart Cash...
              </p>
            </RetroCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {overview.savings_funds.map((fund) => {
                const pct = fund.target_amount > 0
                  ? Math.min(100, (fund.current_saved / fund.target_amount) * 100)
                  : 0;
                return (
                  <RetroCard key={fund.id}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold font-display text-tinta">{fund.name}</span>
                      {fund.annual_rate > 0 && (
                        <RetroBadge variant="oliva">
                          <TrendingUp className="w-3 h-3" />
                          {(fund.annual_rate * 100).toFixed(1)}% anual
                        </RetroBadge>
                      )}
                    </div>
                    <p className="text-xl font-extrabold font-display text-oliva mb-1">
                      {fmtMXN(fund.current_saved)}
                    </p>
                    <p className="text-xs text-tinta-muted mb-2">
                      Meta: {fmtMXN(fund.target_amount)} · {pct.toFixed(0)}% alcanzado
                    </p>
                    <div className="w-full h-2 bg-crema-sunken border border-tinta/30 rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full rounded-full bg-oliva transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <RetroButton
                      onClick={() => {
                        setContribFundId(String(fund.id));
                        setContribWithdraw(false);
                        setShowContributeModal(true);
                      }}
                      variant="oliva"
                      className="w-full"
                    >
                      <PiggyBank className="w-4 h-4" /> Aportar / Retirar
                    </RetroButton>
                  </RetroCard>
                );
              })}
            </div>
          )}

          {/* Debts */}
          <div className="flex items-center justify-between">
            <OrnamentalDivider label="Préstamos & Deudas" />
            <RetroButton onClick={() => setShowDebtModal(true)} variant="secondary">
              <Banknote className="w-4 h-4 text-semantic-danger" /> + Deuda
            </RetroButton>
          </div>
          {overview.debts.length === 0 ? (
            <RetroCard variant="dashed" className="text-center py-4">
              <p className="text-tinta-muted text-sm">Sin deudas registradas.</p>
            </RetroCard>
          ) : (
            <div className="space-y-3">
              {overview.debts.map((debt) => (
                <RetroCard key={debt.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-tinta">{debt.name}</p>
                    <p className="text-xs text-tinta-muted">
                      Saldo: <span className="font-semibold text-semantic-danger">{fmtMXN(debt.outstanding_balance)}</span>
                      {debt.next_payment_date && ` · Próximo pago: ${debt.next_payment_date}`}
                    </p>
                  </div>
                  <RetroBadge variant={debt.status === 'paid_off' ? 'oliva' : 'cempasuchil'}>
                    {debt.status === 'paid_off' ? 'Liquidado' : 'Activo'}
                  </RetroBadge>
                </RetroCard>
              ))}
            </div>
          )}

          {/* Subscriptions */}
          <div className="flex items-center justify-between">
            <OrnamentalDivider label="Suscripciones Recurrentes" />
            <RetroButton onClick={() => setShowSubModal(true)} variant="secondary">
              <Repeat2 className="w-4 h-4 text-tinta" /> + Suscripción
            </RetroButton>
          </div>
          {overview.subscriptions.length === 0 ? (
            <RetroCard variant="dashed" className="text-center py-4">
              <p className="text-tinta-muted text-sm">Sin suscripciones registradas.</p>
            </RetroCard>
          ) : (
            <RetroCard className="p-0 overflow-hidden divide-y-2 divide-tinta/15">
              {overview.subscriptions.map((sub) => (
                <div key={sub.id} className="p-4 flex items-center justify-between hover:bg-maiz-soft/40 transition">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl border border-tinta bg-cempasuchil/10 text-cempasuchil-dark">
                      <Repeat2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-tinta">{sub.name}</p>
                      <span className="text-xs font-medium text-tinta-muted">
                        {sub.category}
                        {sub.billing_day ? ` · Día ${sub.billing_day}` : ''}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold font-display text-sm text-semantic-danger">
                      -{fmtMXN(sub.amount)}
                    </span>
                    <RetroBadge
                      variant={sub.status === 'active' ? 'nopal' : 'default'}
                      className="block mt-1"
                    >
                      {sub.status}
                    </RetroBadge>
                  </div>
                </div>
              ))}
            </RetroCard>
          )}
        </div>
      )}

      {/* ── Floating Action Button ── */}
      {overview.accounts.length > 0 && (
        <button
          onClick={() => setShowTxModal(true)}
          title="Quick Transaction"
          className="fixed bottom-20 md:bottom-8 right-6 w-14 h-14 bg-cempasuchil hover:bg-cempasuchil-dark text-crema border-2 border-tinta rounded-full shadow-vintage flex items-center justify-center transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none z-40"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════════════ */}

      {/* Quick Transaction */}
      <RetroModal isOpen={showTxModal} onClose={() => setShowTxModal(false)} title="Entrada Rápida">
        <form onSubmit={handleQuickTransaction} className="space-y-4">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2 bg-crema-sunken p-1.5 rounded-xl border-2 border-tinta">
            {['expense', 'income'].map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setTxType(t)}
                className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${txType === t
                    ? t === 'expense'
                      ? 'bg-semantic-danger text-crema border border-tinta shadow-vintage-sm'
                      : 'bg-nopal text-crema border border-tinta shadow-vintage-sm'
                    : 'text-tinta-muted'
                  }`}
              >
                {t === 'expense' ? 'Gasto (-)' : 'Ingreso (+)'}
              </button>
            ))}
          </div>

          {/* Pay method (only for expense) */}
          {txType === 'expense' && (
            <div className="grid grid-cols-2 gap-2 bg-crema-sunken p-1 rounded-xl border border-tinta/40">
              {['account', 'card'].map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setTxPayMethod(m)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition ${txPayMethod === m
                      ? 'bg-cempasuchil text-crema shadow-vintage-sm'
                      : 'text-tinta-muted'
                    }`}
                >
                  {m === 'account' ? '🏦 Cuenta' : '💳 TDC'}
                </button>
              ))}
            </div>
          )}

          {/* Amount */}
          <input
            type="number"
            step="0.01"
            required
            autoFocus
            placeholder="0.00"
            value={txAmount}
            onChange={(e) => setTxAmount(e.target.value)}
            className="w-full bg-crema border-2 border-tinta rounded-xl px-4 py-3 text-2xl font-extrabold font-display text-tinta focus:outline-none focus:ring-2 focus:ring-nopal"
          />

          {/* Account or Card selector */}
          {(txType === 'income' || txPayMethod === 'account') ? (
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2.5 text-sm font-semibold text-tinta"
            >
              {overview.accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.name} ({fmtMXN(acc.balance)})</option>
              ))}
            </select>
          ) : (
            <select
              value={selectedInstrumentId}
              onChange={(e) => setSelectedInstrumentId(e.target.value)}
              className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2.5 text-sm font-semibold text-tinta"
            >
              {overview.instruments.filter((i) => i.instrument_type === 'credit_card').map((c) => (
                <option key={c.id} value={c.id}>{c.name} (Deuda: {fmtMXN(c.current_debt)})</option>
              ))}
            </select>
          )}

          {/* Category */}
          <div className="flex flex-wrap gap-2">
            {QUICK_CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat}
                onClick={() => setTxCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${txCategory === cat
                    ? 'bg-nopal text-crema border-tinta shadow-vintage-sm'
                    : 'bg-crema text-tinta-muted border-tinta/40 hover:bg-maiz-soft'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Nota (ej. Tacos, Uber, Filamento)"
            value={txDesc}
            onChange={(e) => setTxDesc(e.target.value)}
            className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2.5 text-sm text-tinta placeholder:text-tinta-soft"
          />
          <RetroButton type="submit" variant="accent" className="w-full py-3">
            Guardar Transacción
          </RetroButton>
        </form>
      </RetroModal>

      {/* New Account */}
      <RetroModal isOpen={showAccModal} onClose={() => setShowAccModal(false)} title="Nueva Cuenta">
        <form onSubmit={handleCreateAccount} className="space-y-4">
          <input type="text" required placeholder="Nombre (ej. BBVA Débito, Nu, GBM+)" value={accName} onChange={(e) => setAccName(e.target.value)} className="w-full bg-crema border-2 border-tinta rounded-xl px-4 py-2.5 text-sm font-medium text-tinta" />
          <select value={accType} onChange={(e) => setAccType(e.target.value)} className="w-full bg-crema border-2 border-tinta rounded-xl px-4 py-2.5 text-sm font-semibold text-tinta">
            <option value="debit">Débito / Cheques</option>
            <option value="cash">Efectivo</option>
            <option value="investment">Inversión (GBM+ / Cajita Nu)</option>
          </select>
          <input type="number" step="0.01" placeholder="Saldo Inicial (0.00)" value={accBalance} onChange={(e) => setAccBalance(e.target.value)} className="w-full bg-crema border-2 border-tinta rounded-xl px-4 py-2.5 text-sm font-medium text-tinta" />
          <RetroButton type="submit" variant="primary" className="w-full py-3">Crear Cuenta</RetroButton>
        </form>
      </RetroModal>

      {/* Transfer */}
      <RetroModal isOpen={showTransferModal} onClose={() => setShowTransferModal(false)} title="Transferir Fondos">
        <form onSubmit={handleTransfer} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted">Origen</label>
            <select value={fromAccId} onChange={(e) => setFromAccId(e.target.value)} className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2.5 text-sm font-semibold text-tinta mt-1">
              {overview.accounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.name} ({fmtMXN(acc.balance)})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted">Destino</label>
            <select value={toAccId} onChange={(e) => setToAccId(e.target.value)} className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2.5 text-sm font-semibold text-tinta mt-1">
              {overview.accounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.name} ({fmtMXN(acc.balance)})</option>)}
            </select>
          </div>
          <input type="number" step="0.01" required placeholder="Monto ($)" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} className="w-full bg-crema border-2 border-tinta rounded-xl px-4 py-2.5 text-sm font-medium text-tinta" />
          <RetroButton type="submit" variant="primary" className="w-full py-3">Ejecutar Transferencia</RetroButton>
        </form>
      </RetroModal>

      {/* New Institution */}
      <RetroModal isOpen={showInstitutionModal} onClose={() => setShowInstitutionModal(false)} title="Nueva Institución">
        <form onSubmit={handleCreateInstitution} className="space-y-4">
          <input type="text" required placeholder="Nombre (ej. BBVA, Nu, GBM, Liverpool)" value={instName} onChange={(e) => setInstName(e.target.value)} className="w-full bg-crema border-2 border-tinta rounded-xl px-4 py-2.5 text-sm font-medium text-tinta" />
          <select value={instCategory} onChange={(e) => setInstCategory(e.target.value)} className="w-full bg-crema border-2 border-tinta rounded-xl px-4 py-2.5 text-sm font-semibold text-tinta">
            <option value="bank">Banco</option>
            <option value="fintech">Fintech</option>
            <option value="broker">Broker / Casa de Bolsa</option>
            <option value="retail">Tienda / Retail</option>
          </select>
          <RetroButton type="submit" variant="primary" className="w-full py-3">Agregar Institución</RetroButton>
        </form>
      </RetroModal>

      {/* New Card */}
      <RetroModal isOpen={showCardModal} onClose={() => setShowCardModal(false)} title="Nueva Tarjeta">
        <form onSubmit={handleCreateCard} className="space-y-4">
          <input type="text" required placeholder="Nombre (ej. Nu Crédito, Liverpool Visa)" value={cardName} onChange={(e) => setCardName(e.target.value)} className="w-full bg-crema border-2 border-tinta rounded-xl px-4 py-2.5 text-sm font-medium text-tinta" />
          <select value={cardType} onChange={(e) => setCardType(e.target.value)} className="w-full bg-crema border-2 border-tinta rounded-xl px-4 py-2.5 text-sm font-semibold text-tinta">
            <option value="credit_card">Tarjeta de Crédito</option>
            <option value="debit_card">Tarjeta de Débito</option>
          </select>
          {overview.institutions.length > 0 && (
            <select value={cardInstitutionId} onChange={(e) => setCardInstitutionId(e.target.value)} className="w-full bg-crema border-2 border-tinta rounded-xl px-4 py-2.5 text-sm font-semibold text-tinta">
              <option value="">— Sin institución —</option>
              {overview.institutions.map((inst) => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
            </select>
          )}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-bold text-tinta-muted block mb-1">Límite ($)</label>
              <input type="number" step="0.01" placeholder="10,000" value={cardLimit} onChange={(e) => setCardLimit(e.target.value)} className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta" />
            </div>
            <div>
              <label className="text-xs font-bold text-tinta-muted block mb-1">Día Corte</label>
              <input type="number" min="1" max="31" placeholder="5" value={cardCutoff} onChange={(e) => setCardCutoff(e.target.value)} className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta" />
            </div>
            <div>
              <label className="text-xs font-bold text-tinta-muted block mb-1">Día Pago</label>
              <input type="number" min="1" max="31" placeholder="25" value={cardDueDay} onChange={(e) => setCardDueDay(e.target.value)} className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta" />
            </div>
          </div>
          <RetroButton type="submit" variant="accent" className="w-full py-3">Registrar Tarjeta</RetroButton>
        </form>
      </RetroModal>

      {/* Pay Card */}
      <RetroModal isOpen={showPayCardModal} onClose={() => setShowPayCardModal(false)} title="Pagar Tarjeta de Crédito">
        <form onSubmit={handlePayCard} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted">Tarjeta a Pagar</label>
            <select value={payCardId} onChange={(e) => setPayCardId(e.target.value)} className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2.5 text-sm font-semibold text-tinta mt-1">
              {creditCards.map((c) => <option key={c.id} value={c.id}>{c.name} (Deuda: {fmtMXN(c.current_debt)})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted">Cuenta Débito Origen</label>
            <select value={payDebitAccId} onChange={(e) => setPayDebitAccId(e.target.value)} className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2.5 text-sm font-semibold text-tinta mt-1">
              {overview.accounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.name} ({fmtMXN(acc.balance)})</option>)}
            </select>
          </div>
          <input type="number" step="0.01" required placeholder="Monto a pagar ($)" value={payCardAmount} onChange={(e) => setPayCardAmount(e.target.value)} className="w-full bg-crema border-2 border-tinta rounded-xl px-4 py-2.5 text-sm font-medium text-tinta" />
          <RetroButton type="submit" variant="accent" className="w-full py-3">Liquidar Pago</RetroButton>
        </form>
      </RetroModal>

      {/* New Savings Fund */}
      <RetroModal isOpen={showFundModal} onClose={() => setShowFundModal(false)} title="Nueva Cajita / Fondo">
        <form onSubmit={handleCreateFund} className="space-y-4">
          <input type="text" required placeholder="Nombre (ej. Cajita Nu, GBM Smart Cash)" value={fundName} onChange={(e) => setFundName(e.target.value)} className="w-full bg-crema border-2 border-tinta rounded-xl px-4 py-2.5 text-sm font-medium text-tinta" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-tinta-muted block mb-1">Meta ($)</label>
              <input type="number" step="0.01" placeholder="50,000" value={fundTarget} onChange={(e) => setFundTarget(e.target.value)} className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta" />
            </div>
            <div>
              <label className="text-xs font-bold text-tinta-muted block mb-1">Tasa Anual (%)</label>
              <input type="number" step="0.01" placeholder="14.5" value={fundRate} onChange={(e) => setFundRate(e.target.value ? String(Number(e.target.value) / 100) : '')} className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta" />
            </div>
          </div>
          <RetroButton type="submit" variant="oliva" className="w-full py-3">Crear Cajita</RetroButton>
        </form>
      </RetroModal>

      {/* Contribute / Withdraw */}
      <RetroModal isOpen={showContributeModal} onClose={() => setShowContributeModal(false)} title="Aportación / Retiro">
        <form onSubmit={handleContribute} className="space-y-4">
          <div className="grid grid-cols-2 gap-2 bg-crema-sunken p-1.5 rounded-xl border-2 border-tinta">
            {[false, true].map((isWithdraw) => (
              <button type="button" key={String(isWithdraw)} onClick={() => setContribWithdraw(isWithdraw)}
                className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${contribWithdraw === isWithdraw ? 'bg-cempasuchil text-crema border border-tinta shadow-vintage-sm' : 'text-tinta-muted'}`}>
                {isWithdraw ? 'Retirar' : 'Aportar'}
              </button>
            ))}
          </div>
          <select value={contribFundId} onChange={(e) => setContribFundId(e.target.value)} className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2.5 text-sm font-semibold text-tinta">
            {overview.savings_funds.map((f) => <option key={f.id} value={f.id}>{f.name} ({fmtMXN(f.current_saved)})</option>)}
          </select>
          <input type="number" step="0.01" required placeholder="Monto ($)" value={contribAmount} onChange={(e) => setContribAmount(e.target.value)} className="w-full bg-crema border-2 border-tinta rounded-xl px-4 py-2.5 text-sm font-medium text-tinta" />
          <select value={contribAccId} onChange={(e) => setContribAccId(e.target.value)} className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2.5 text-sm font-semibold text-tinta">
            <option value="">— Sin cuenta vinculada —</option>
            {overview.accounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.name} ({fmtMXN(acc.balance)})</option>)}
          </select>
          <RetroButton type="submit" variant="oliva" className="w-full py-3">{contribWithdraw ? 'Retirar de Cajita' : 'Aportar a Cajita'}</RetroButton>
        </form>
      </RetroModal>

      {/* New Debt */}
      <RetroModal isOpen={showDebtModal} onClose={() => setShowDebtModal(false)} title="Registrar Deuda / Préstamo">
        <form onSubmit={handleCreateDebt} className="space-y-4">
          <input type="text" required placeholder="Nombre (ej. Préstamo Auto BBVA)" value={debtName} onChange={(e) => setDebtName(e.target.value)} className="w-full bg-crema border-2 border-tinta rounded-xl px-4 py-2.5 text-sm font-medium text-tinta" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-tinta-muted block mb-1">Total ($)</label>
              <input type="number" step="0.01" value={debtTotal} onChange={(e) => setDebtTotal(e.target.value)} className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta" />
            </div>
            <div>
              <label className="text-xs font-bold text-tinta-muted block mb-1">Saldo Pendiente ($)</label>
              <input type="number" step="0.01" value={debtOutstanding} onChange={(e) => setDebtOutstanding(e.target.value)} className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta" />
            </div>
            <div>
              <label className="text-xs font-bold text-tinta-muted block mb-1">Tasa Anual (%)</label>
              <input type="number" step="0.01" placeholder="12.0" value={debtRate} onChange={(e) => setDebtRate(e.target.value)} className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta" />
            </div>
            <div>
              <label className="text-xs font-bold text-tinta-muted block mb-1">Pago Mensual ($)</label>
              <input type="number" step="0.01" value={debtMonthly} onChange={(e) => setDebtMonthly(e.target.value)} className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-tinta-muted block mb-1">Próximo Pago</label>
            <input type="date" value={debtNextDate} onChange={(e) => setDebtNextDate(e.target.value)} className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2.5 text-sm text-tinta" />
          </div>
          <RetroButton type="submit" variant="primary" className="w-full py-3">Registrar Deuda</RetroButton>
        </form>
      </RetroModal>

      {/* New Subscription */}
      <RetroModal isOpen={showSubModal} onClose={() => setShowSubModal(false)} title="Nueva Suscripción">
        <form onSubmit={handleCreateSub} className="space-y-4">
          <input type="text" required placeholder="Nombre (ej. Netflix, AWS, GitHub Pro)" value={subName} onChange={(e) => setSubName(e.target.value)} className="w-full bg-crema border-2 border-tinta rounded-xl px-4 py-2.5 text-sm font-medium text-tinta" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-tinta-muted block mb-1">Monto ($)</label>
              <input type="number" step="0.01" value={subAmount} onChange={(e) => setSubAmount(e.target.value)} className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta" />
            </div>
            <div>
              <label className="text-xs font-bold text-tinta-muted block mb-1">Día de Cargo</label>
              <input type="number" min="1" max="31" placeholder="15" value={subBillingDay} onChange={(e) => setSubBillingDay(e.target.value)} className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta" />
            </div>
          </div>
          <select value={subCategory} onChange={(e) => setSubCategory(e.target.value)} className="w-full bg-crema border-2 border-tinta rounded-xl px-4 py-2.5 text-sm font-semibold text-tinta">
            <option value="Digital">Digital</option>
            <option value="Cloud">Cloud / Dev</option>
            <option value="Health">Salud / Gym</option>
            <option value="Education">Educación</option>
            <option value="Entertainment">Entretenimiento</option>
          </select>
          <div>
            <label className="text-xs font-bold text-tinta-muted block mb-1">Próximo Cobro</label>
            <input type="date" value={subNextDate} onChange={(e) => setSubNextDate(e.target.value)} className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2.5 text-sm text-tinta" />
          </div>
          <RetroButton type="submit" variant="accent" className="w-full py-3">Agregar Suscripción</RetroButton>
        </form>
      </RetroModal>
    </div>
  );
}
