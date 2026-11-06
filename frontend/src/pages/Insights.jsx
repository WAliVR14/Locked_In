import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import {
  LineChart,
  Wallet,
  CheckCircle2,
  Flame,
  Dumbbell,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Moon,
  Clock,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import {
  RetroCard,
  RetroButton,
  RetroBadge,
  OrnamentalDivider,
} from '../components/ui/RetroUI';

const fmtMXN = (val) =>
  Number(val || 0).toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  });

export default function Insights({ onDataChange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInsights = useCallback(async () => {
    try {
      const res = await api.get('/insights/dashboard');
      setData(res.data);
      if (onDataChange) onDataChange();
    } catch (err) {
      console.error('Error fetching insights telemetry:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onDataChange]);

  useEffect(() => {
    let isMounted = true;
    api
      .get('/insights/dashboard')
      .then((res) => {
        if (isMounted) setData(res.data);
      })
      .catch((err) => console.error('Initial insights fetch error:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchInsights();
  };

  if (loading) {
    return (
      <div className="text-tinta-muted font-display py-16 text-center font-bold text-lg">
        Compilando Telemetría Analítica de los 6 Dominios...
      </div>
    );
  }

  if (!data) {
    return (
      <RetroCard variant="dashed" className="p-8 text-center max-w-lg mx-auto">
        <AlertCircle className="w-10 h-10 text-semantic-danger mx-auto mb-2" />
        <h3 className="font-display font-bold text-tinta text-lg">No se pudo cargar la analítica</h3>
        <p className="text-xs text-tinta-muted mt-1">Verifica la conexión con el servidor.</p>
        <RetroButton onClick={fetchInsights} variant="primary" className="mt-4">
          Reintentar
        </RetroButton>
      </RetroCard>
    );
  }

  const { finance, tasks, habits, bio_gym } = data;
  const totalVolume = Math.max(1, finance.month_income + finance.month_expenses);
  const incomePct = Math.min(100, Math.round((finance.month_income / totalVolume) * 100));
  const expensePct = 100 - incomePct;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-tinta/20 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LineChart className="w-5 h-5 text-nopal" />
            <span className="text-xs uppercase font-extrabold tracking-widest text-nopal-dark">
              Dominio 6 · Analítica & Business Intelligence
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-display text-tinta">
            Insights & Master Telemetry
          </h1>
          <p className="text-tinta-muted text-sm mt-0.5">
            Métricas cruzadas de consumo, tasa de ahorro, ejecución de tareas y carga física.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <RetroBadge variant="cempasuchil">
            <Sparkles className="w-3.5 h-3.5" /> Real-Time Engine
          </RetroBadge>
          <RetroButton
            onClick={handleManualRefresh}
            variant="ghost"
            disabled={refreshing}
            className="py-2 px-3 text-xs"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Actualizar
          </RetroButton>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <RetroCard variant="highlighted">
          <div className="flex items-center justify-between text-tinta-muted text-xs font-bold uppercase tracking-wider mb-1">
            <span>Burn Rate Diario</span>
            <TrendingDown className="w-4 h-4 text-cempasuchil" />
          </div>
          <p className="text-2xl font-extrabold font-display text-cempasuchil">
            {fmtMXN(finance.daily_burn_rate)}
          </p>
          <p className="text-[11px] text-tinta-muted mt-1 font-semibold">Gasto promedio / día en el mes</p>
        </RetroCard>

        <RetroCard>
          <div className="flex items-center justify-between text-tinta-muted text-xs font-bold uppercase tracking-wider mb-1">
            <span>Tasa de Ahorro</span>
            <TrendingUp className="w-4 h-4 text-nopal" />
          </div>
          <p className="text-2xl font-extrabold font-display text-nopal">
            {finance.savings_rate_pct}%
          </p>
          <p className="text-[11px] text-tinta-muted mt-1 font-semibold">
            {finance.net_savings >= 0 ? `+${fmtMXN(finance.net_savings)} neto` : `${fmtMXN(finance.net_savings)} déficit`}
          </p>
        </RetroCard>

        <RetroCard>
          <div className="flex items-center justify-between text-tinta-muted text-xs font-bold uppercase tracking-wider mb-1">
            <span>Liquidez Neta</span>
            <Wallet className="w-4 h-4 text-oliva" />
          </div>
          <p className="text-2xl font-extrabold font-display text-tinta">
            {fmtMXN(finance.net_worth_liquid)}
          </p>
          <p className="text-[11px] text-tinta-muted mt-1 font-semibold">Activos líquidos - Deuda TDC</p>
        </RetroCard>

        <RetroCard>
          <div className="flex items-center justify-between text-tinta-muted text-xs font-bold uppercase tracking-wider mb-1">
            <span>Disciplina Hábitos</span>
            <Flame className="w-4 h-4 text-cempasuchil" />
          </div>
          <p className="text-2xl font-extrabold font-display text-tinta">
            {habits.max_streak}{' '}
            <span className="text-xs font-sans text-tinta-muted">días racha</span>
          </p>
          <p className="text-[11px] text-tinta-muted mt-1 font-semibold">
            {habits.checked_today} de {habits.total_habits} hoy ({habits.habits_today_pct}%)
          </p>
        </RetroCard>
      </div>

      {/* Main Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Flow: Income vs Expenses */}
        <RetroCard className="p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-tinta/10 pb-3">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-nopal" />
              <h2 className="text-lg font-bold font-display text-tinta">Flujo de Caja del Mes</h2>
            </div>
            <RetroBadge variant="nopal">
              Neto: {fmtMXN(finance.net_savings)}
            </RetroBadge>
          </div>

          {/* Comparative Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-tinta">
              <span className="flex items-center gap-1.5 text-nopal">
                <span className="w-2.5 h-2.5 rounded-full bg-nopal inline-block" />
                Ingresos: {fmtMXN(finance.month_income)} ({incomePct}%)
              </span>
              <span className="flex items-center gap-1.5 text-cempasuchil">
                <span className="w-2.5 h-2.5 rounded-full bg-cempasuchil inline-block" />
                Gastos: {fmtMXN(finance.month_expenses)} ({expensePct}%)
              </span>
            </div>

            <div className="w-full h-4 bg-crema-sunken rounded-full overflow-hidden flex border-2 border-tinta/30 shadow-vintage-sm">
              <div
                style={{ width: `${incomePct}%` }}
                className="bg-nopal h-full transition-all duration-500"
                title={`Ingresos: ${incomePct}%`}
              />
              <div
                style={{ width: `${expensePct}%` }}
                className="bg-cempasuchil h-full transition-all duration-500"
                title={`Gastos: ${expensePct}%`}
              />
            </div>
          </div>

          <OrnamentalDivider label="Top Categorías de Gasto" />

          {/* Category Breakdown */}
          {finance.top_categories.length === 0 ? (
            <p className="text-xs text-tinta-muted text-center py-4">No hay gastos registrados este mes.</p>
          ) : (
            <div className="space-y-2.5">
              {finance.top_categories.map((item) => {
                const pct = Math.min(100, Math.round((item.amount / Math.max(1, finance.month_expenses)) * 100));
                return (
                  <div key={item.category} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-tinta">
                      <span>{item.category}</span>
                      <span className="font-mono text-tinta-muted">
                        {fmtMXN(item.amount)} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-crema-sunken rounded-full overflow-hidden border border-tinta/20">
                      <div
                        style={{ width: `${pct}%` }}
                        className="bg-cempasuchil-light h-full rounded-full transition-all duration-300"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </RetroCard>

        {/* Task Execution & Productivity */}
        <RetroCard className="p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-tinta/10 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-nopal" />
              <h2 className="text-lg font-bold font-display text-tinta">Rendimiento en Tareas</h2>
            </div>
            <RetroBadge variant="oliva">
              Semanal: {tasks.completed_this_week} completadas
            </RetroBadge>
          </div>

          {/* Efficiency Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-tinta">
              <span>Tasa de Completitud General</span>
              <span className="text-nopal font-extrabold">{tasks.completion_rate_pct}%</span>
            </div>
            <div className="w-full h-3.5 bg-crema-sunken rounded-full overflow-hidden border-2 border-tinta/30 shadow-vintage-sm">
              <div
                style={{ width: `${tasks.completion_rate_pct}%` }}
                className="bg-nopal h-full transition-all duration-500 rounded-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-3 bg-crema-sunken/60 rounded-xl border border-tinta/20 text-center">
              <span className="text-xs uppercase font-extrabold text-tinta-muted block">Total</span>
              <span className="text-xl font-black font-display text-tinta">{tasks.total_tasks}</span>
            </div>
            <div className="p-3 bg-crema-sunken/60 rounded-xl border border-tinta/20 text-center">
              <span className="text-xs uppercase font-extrabold text-nopal block">Hechas</span>
              <span className="text-xl font-black font-display text-nopal">{tasks.completed_tasks}</span>
            </div>
            <div className="p-3 bg-crema-sunken/60 rounded-xl border border-tinta/20 text-center">
              <span className="text-xs uppercase font-extrabold text-semantic-danger block">Atrasadas</span>
              <span className="text-xl font-black font-display text-semantic-danger">{tasks.overdue_tasks}</span>
            </div>
          </div>

          <OrnamentalDivider label="Foco Urgente" />

          <div className="flex items-center justify-between p-3.5 bg-crema-paper rounded-xl border-2 border-tinta shadow-vintage-sm">
            <div>
              <p className="text-xs font-bold text-tinta uppercase tracking-wider">Tareas de Alta Prioridad Pendientes</p>
              <p className="text-xs text-tinta-muted mt-0.5">Elementos que requieren tu atención inmediata hoy.</p>
            </div>
            <RetroBadge variant={tasks.high_priority_pending > 0 ? 'cempasuchil' : 'nopal'}>
              {tasks.high_priority_pending} pendientes
            </RetroBadge>
          </div>
        </RetroCard>

        {/* Bio, Gym & Physical Telemetry */}
        <RetroCard className="p-6 space-y-5 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-tinta/10 pb-3">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-nopal" />
              <h2 className="text-lg font-bold font-display text-tinta">Carga de Entrenamiento & Biometría (Últimos 7 días)</h2>
            </div>
            <RetroBadge variant="nopal">
              {bio_gym.weekly_sessions} Sesiones · {bio_gym.weekly_minutes} mins
            </RetroBadge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-crema-sunken/50 rounded-xl border border-tinta/20">
              <div className="flex items-center gap-2 text-xs font-bold text-tinta-muted uppercase mb-1">
                <Clock className="w-4 h-4 text-nopal" />
                <span>Volumen Semanal</span>
              </div>
              <p className="text-2xl font-black font-display text-tinta">{bio_gym.weekly_minutes} <span className="text-xs font-sans text-tinta-muted">min</span></p>
            </div>

            <div className="p-4 bg-crema-sunken/50 rounded-xl border border-tinta/20">
              <div className="flex items-center gap-2 text-xs font-bold text-tinta-muted uppercase mb-1">
                <Moon className="w-4 h-4 text-oliva" />
                <span>Promedio Sueño</span>
              </div>
              <p className="text-2xl font-black font-display text-oliva">{bio_gym.avg_sleep_hours} <span className="text-xs font-sans text-tinta-muted">hrs</span></p>
            </div>

            <div className="p-4 bg-crema-sunken/50 rounded-xl border border-tinta/20">
              <div className="flex items-center gap-2 text-xs font-bold text-tinta-muted uppercase mb-1">
                <TrendingUp className="w-4 h-4 text-cempasuchil" />
                <span>Peso Corporal</span>
              </div>
              <p className="text-2xl font-black font-display text-tinta">{bio_gym.latest_weight_kg} <span className="text-xs font-sans text-tinta-muted">kg</span></p>
            </div>

            <div className="p-4 bg-crema-sunken/50 rounded-xl border border-tinta/20">
              <div className="flex items-center gap-2 text-xs font-bold text-tinta-muted uppercase mb-1">
                <Flame className="w-4 h-4 text-cempasuchil" />
                <span>Sesiones Activas</span>
              </div>
              <p className="text-2xl font-black font-display text-nopal">{bio_gym.weekly_sessions} <span className="text-xs font-sans text-tinta-muted">veces</span></p>
            </div>
          </div>

          {/* Type Distribution */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-bold uppercase tracking-wider text-tinta-muted block">
              Distribución por Modalidad de Entrenamiento
            </span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(bio_gym.workout_type_distribution).length === 0 ? (
                <span className="text-xs text-tinta-muted">Sin entrenamientos registrados en los últimos 7 días.</span>
              ) : (
                Object.entries(bio_gym.workout_type_distribution).map(([type, count]) => (
                  <div
                    key={type}
                    className="flex items-center gap-2 bg-crema-paper border-2 border-tinta px-3 py-1.5 rounded-lg shadow-vintage-sm text-xs font-bold text-tinta"
                  >
                    <span>{type}</span>
                    <RetroBadge variant="nopal" className="text-[10px] py-0 px-1.5">
                      {count} {count === 1 ? 'sesión' : 'sesiones'}
                    </RetroBadge>
                  </div>
                ))
              )}
            </div>
          </div>
        </RetroCard>
      </div>
    </div>
  );
}

