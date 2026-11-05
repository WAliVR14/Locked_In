import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import {
  Compass,
  Plus,
  Target,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import {
  RetroCard,
  RetroButton,
  RetroBadge,
  OrnamentalDivider,
  RetroModal,
} from '../components/ui/RetroUI';

export default function Strategy({ onDataChange }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal: New Goal
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [goalCategory, setGoalCategory] = useState('Career');
  const [goalHorizon, setGoalHorizon] = useState('medium');
  const [goalPriority, setGoalPriority] = useState(2);
  const [goalProgress, setGoalProgress] = useState(0);

  // Modal: Link Task to Goal
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState(2);
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskTimeBlock, setTaskTimeBlock] = useState('');

  const fetchGoals = useCallback(async () => {
    try {
      const res = await api.get('/strategy/goals');
      setGoals(res.data);
      if (onDataChange) onDataChange();
    } catch (err) {
      console.error('Error fetching strategy goals:', err);
    } finally {
      setLoading(false);
    }
  }, [onDataChange]);

  useEffect(() => {
    let isMounted = true;
    api
      .get('/strategy/goals')
      .then((res) => {
        if (isMounted) {
          setGoals(res.data);
        }
      })
      .catch((err) => console.error('Initial strategy fetch error:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;

    try {
      await api.post('/strategy/goals', {
        title: goalTitle.trim(),
        description: goalDesc.trim() || null,
        category: goalCategory,
        horizon: goalHorizon,
        priority: Number(goalPriority),
        progress_pct: Number(goalProgress),
      });
      setGoalTitle('');
      setGoalDesc('');
      setGoalProgress(0);
      setGoalPriority(2);
      setShowGoalModal(false);
      await fetchGoals();
    } catch (err) {
      console.error('Error creating goal:', err);
    }
  };

  const handleUpdateProgress = async (goalId, newProgress) => {
    const clamped = Math.max(0, Math.min(100, newProgress));
    try {
      await api.patch(`/strategy/goals/${goalId}/progress`, {
        progress_pct: clamped,
      });
      await fetchGoals();
    } catch (err) {
      console.error('Error updating goal progress:', err);
    }
  };

  const handleCreateTaskForGoal = async (e) => {
    e.preventDefault();
    if (!selectedGoal || !taskTitle.trim()) return;

    try {
      await api.post(`/strategy/goals/${selectedGoal.id}/tasks`, {
        title: taskTitle.trim(),
        description: taskDesc.trim() || null,
        priority: Number(taskPriority),
        due_date: taskDueDate || null,
        time_block: taskTimeBlock.trim() || null,
      });
      setTaskTitle('');
      setTaskDesc('');
      setTaskDueDate('');
      setTaskTimeBlock('');
      setTaskPriority(2);
      setSelectedGoal(null);
      await fetchGoals();
    } catch (err) {
      console.error('Error creating task for goal:', err);
    }
  };

  const getCategoryBadge = (category) => {
    switch (category) {
      case 'Education':
        return <RetroBadge variant="cempasuchil">Educación</RetroBadge>;
      case 'Career':
        return <RetroBadge variant="nopal">Carrera & HIL</RetroBadge>;
      case 'Business':
        return <RetroBadge variant="maiz">Negocios & 3D</RetroBadge>;
      case 'Health':
        return <RetroBadge variant="oliva">Salud & Gym</RetroBadge>;
      default:
        return <RetroBadge variant="default">{category}</RetroBadge>;
    }
  };

  const getProgressColor = (pct) => {
    if (pct >= 80) return 'bg-nopal';
    if (pct >= 50) return 'bg-cempasuchil';
    if (pct >= 25) return 'bg-maiz';
    return 'bg-semantic-danger';
  };

  if (loading) {
    return (
      <div className="text-tinta-muted font-display py-12 text-center font-bold">
        Cargando Metas y Dirección Estratégica...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-tinta/20 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Compass className="w-5 h-5 text-nopal" />
            <span className="text-xs uppercase font-extrabold tracking-widest text-nopal-dark">
              Dirección & Carrera Profesional
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-display text-tinta">
            Estrategia, OKRs & Horizontes
          </h1>
          <p className="text-tinta-muted text-sm mt-0.5">
            Alineación de objetivos a largo plazo con tareas diarias centralizadas (ADR-01).
          </p>
        </div>

        <RetroButton onClick={() => setShowGoalModal(true)} variant="primary">
          <Plus className="w-4 h-4" /> Nueva Meta OKR
        </RetroButton>
      </div>

      {/* Strategic Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <RetroCard variant="highlighted" className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-cempasuchil text-crema flex items-center justify-center border border-tinta shadow-vintage-sm">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase font-bold text-tinta-muted block">
              Metas Activas
            </span>
            <span className="text-2xl font-extrabold font-display text-tinta">
              {goals.filter((g) => g.status !== 'completed').length}
            </span>
          </div>
        </RetroCard>

        <RetroCard className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-nopal text-crema flex items-center justify-center border border-tinta shadow-vintage-sm">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase font-bold text-tinta-muted block">
              Metas Cumplidas
            </span>
            <span className="text-2xl font-extrabold font-display text-nopal">
              {goals.filter((g) => g.status === 'completed').length}
            </span>
          </div>
        </RetroCard>

        <RetroCard className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-maiz text-tinta flex items-center justify-center border border-tinta shadow-vintage-sm">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase font-bold text-tinta-muted block">
              Promedio de Avance
            </span>
            <span className="text-2xl font-extrabold font-display text-tinta">
              {goals.length > 0
                ? Math.round(goals.reduce((acc, g) => acc + g.progress_pct, 0) / goals.length)
                : 0}
              %
            </span>
          </div>
        </RetroCard>
      </div>

      <OrnamentalDivider label="Matriz de Metas & Objetivos Clave" />

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map((goal) => {
          const isDone = goal.status === 'completed' || goal.progress_pct >= 100;
          return (
            <RetroCard
              key={goal.id}
              className={`flex flex-col justify-between space-y-4 ${
                isDone ? 'border-nopal/80' : ''
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  {getCategoryBadge(goal.category)}
                  <RetroBadge variant="default" className="text-[10px] uppercase">
                    Horizonte: {goal.horizon || 'medio'}
                  </RetroBadge>
                </div>

                <h3 className="text-lg font-bold font-display text-tinta leading-snug">
                  {goal.title}
                </h3>
                {goal.description && (
                  <p className="text-xs text-tinta-muted mt-1.5 leading-relaxed">
                    {goal.description}
                  </p>
                )}
              </div>

              {/* Progress Bar & Interactive Adjuster */}
              <div className="space-y-2 pt-2 border-t border-tinta/15">
                <div className="flex items-center justify-between text-xs font-bold text-tinta">
                  <span>Progreso</span>
                  <span className="font-extrabold font-display text-sm">
                    {goal.progress_pct}%
                  </span>
                </div>

                <div className="w-full h-3 bg-crema-sunken border border-tinta/40 rounded-full overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${getProgressColor(
                      goal.progress_pct
                    )}`}
                    style={{ width: `${goal.progress_pct}%` }}
                  />
                </div>

                {/* Quick Increment / Decrement Buttons */}
                <div className="flex items-center justify-between gap-1 pt-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateProgress(goal.id, goal.progress_pct - 10)}
                      className="px-2 py-0.5 text-xs font-bold bg-crema hover:bg-maiz-soft border border-tinta/30 rounded text-tinta"
                    >
                      -10%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateProgress(goal.id, goal.progress_pct + 10)}
                      className="px-2 py-0.5 text-xs font-bold bg-crema hover:bg-maiz-soft border border-tinta/30 rounded text-tinta"
                    >
                      +10%
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUpdateProgress(goal.id, 100)}
                    className="text-xs font-bold text-nopal hover:underline"
                  >
                    Marcar 100%
                  </button>
                </div>
              </div>

              {/* Link Task Action Button */}
              <div className="pt-2">
                <RetroButton
                  onClick={() => setSelectedGoal(goal)}
                  variant="secondary"
                  className="w-full py-2 text-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-cempasuchil" /> Vincular Tarea (ADR-01)
                </RetroButton>
              </div>
            </RetroCard>
          );
        })}
      </div>

      {/* Modal: New Strategic Goal */}
      <RetroModal
        isOpen={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        title="Crear Nueva Meta OKR"
      >
        <form onSubmit={handleCreateGoal} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1">
              Título del Objetivo
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej. Certificación AWS Solutions Architect Associate"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta font-semibold focus:outline-none focus:ring-2 focus:ring-nopal"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1">
                Categoría
              </label>
              <select
                value={goalCategory}
                onChange={(e) => setGoalCategory(e.target.value)}
                className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta font-semibold focus:outline-none focus:ring-2 focus:ring-nopal"
              >
                <option value="Career">Career (Ingeniería / Automatización HIL)</option>
                <option value="Education">Education (Idiomas / Certificaciones)</option>
                <option value="Business">Business (MecaPath / 3D Print)</option>
                <option value="Health">Health (Bio / Fitness)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1">
                Prioridad
              </label>
              <select
                value={goalPriority}
                onChange={(e) => setGoalPriority(Number(e.target.value))}
                className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta font-semibold"
              >
                <option value={1}>1 - Baja</option>
                <option value={2}>2 - Media</option>
                <option value={3}>3 - Alta</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1">
                Horizonte
              </label>
              <select
                value={goalHorizon}
                onChange={(e) => setGoalHorizon(e.target.value)}
                className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta font-semibold"
              >
                <option value="short">Corto (semanas)</option>
                <option value="medium">Mediano (3-12 meses)</option>
                <option value="long">Largo (1-5 años)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1">
                Progreso Inicial (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={goalProgress}
                onChange={(e) => setGoalProgress(e.target.value)}
                className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1">
              Descripción o Criterio de Éxito
            </label>
            <textarea
              rows={2}
              placeholder="Detalles sobre entregables, métricas y resultados clave..."
              value={goalDesc}
              onChange={(e) => setGoalDesc(e.target.value)}
              className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta"
            />
          </div>

          <RetroButton type="submit" variant="primary" className="w-full py-2.5">
            Guardar Meta
          </RetroButton>
        </form>
      </RetroModal>

      {/* Modal: Link Task to Goal (ADR-01) */}
      <RetroModal
        isOpen={Boolean(selectedGoal)}
        onClose={() => setSelectedGoal(null)}
        title={`Vincular Tarea a: ${selectedGoal?.title || ''}`}
      >
        <form onSubmit={handleCreateTaskForGoal} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1">
              Acción / Tarea
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej. Completar simulador de examen módulo 4"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta font-semibold focus:outline-none focus:ring-2 focus:ring-nopal"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1">
                Fecha Límite
              </label>
              <input
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1">
                Prioridad
              </label>
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(Number(e.target.value))}
                className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta font-semibold"
              >
                <option value={1}>1 - Baja</option>
                <option value={2}>2 - Media</option>
                <option value={3}>3 - Alta</option>
                <option value={4}>4 - Urgente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1">
              Bloque de Tiempo
            </label>
            <input
              type="text"
              placeholder="16:00 - 17:30"
              value={taskTimeBlock}
              onChange={(e) => setTaskTimeBlock(e.target.value)}
              className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1">
              Notas Adicionales
            </label>
            <textarea
              rows={2}
              placeholder="Notas opcionales..."
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta"
            />
          </div>

          <RetroButton type="submit" variant="accent" className="w-full py-2.5">
            Crear y Vincular Tarea
          </RetroButton>
        </form>
      </RetroModal>
    </div>
  );
}
