import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import {
  CalendarCheck,
  CheckCircle2,
  Circle,
  Plus,
  Flame,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Wallet,
  ShoppingBag,
  Sparkles,
  Dumbbell,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  RetroCard,
  RetroButton,
  RetroBadge,
  OrnamentalDivider,
  RetroModal,
} from '../components/ui/RetroUI';

export default function Today({ onDataChange }) {
  const [data, setData] = useState({
    date: new Date().toISOString().split('T')[0],
    tasks_today: [],
    summary_counts: { total: 0, completed: 0, pending: 0 },
    habits: [],
    financial_summary: {
      total_balance: 0,
      net_liquidity: 0,
      credit_debt_total: 0,
      safe_to_spend_daily: 0,
      days_remaining_in_month: 30,
    },
    pantry_alerts: [],
    workout_completed_today: false,
  });
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showHabitModal, setShowHabitModal] = useState(false);

  // Quick task state
  const [quickTitle, setQuickTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState(2);
  const [taskTimeBlock, setTaskTimeBlock] = useState('');
  const [taskDesc, setTaskDesc] = useState('');

  // New Habit state
  const [habitName, setHabitName] = useState('');
  const [habitFrequency, setHabitFrequency] = useState('daily');

  // Edit Task state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState(2);
  const [editTimeBlock, setEditTimeBlock] = useState('');

  const fetchTodayData = useCallback(async () => {
    try {
      const res = await api.get('/today/overview');
      setData(res.data);
      if (onDataChange) onDataChange();
    } catch (err) {
      console.error('Error fetching today overview:', err);
    } finally {
      setLoading(false);
    }
  }, [onDataChange]);

  useEffect(() => {
    let isMounted = true;
    api
      .get('/today/overview')
      .then((res) => {
        if (isMounted) {
          setData(res.data);
        }
      })
      .catch((err) => console.error('Initial today fetch error:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleTask = async (taskId) => {
    // Optimistic update
    setData((prev) => {
      const updatedTasks = prev.tasks_today.map((t) => {
        if (t.id === taskId) {
          const isDone = t.status === 'completed' || t.status === 'done';
          return { ...t, status: isDone ? 'todo' : 'completed' };
        }
        return t;
      });
      const completedCount = updatedTasks.filter((t) => t.status === 'completed' || t.status === 'done').length;
      return {
        ...prev,
        tasks_today: updatedTasks,
        summary_counts: {
          total: updatedTasks.length,
          completed: completedCount,
          pending: updatedTasks.length - completedCount,
        },
      };
    });

    try {
      await api.patch(`/today/tasks/${taskId}/toggle`);
      await fetchTodayData();
    } catch (err) {
      console.error('Error toggling task:', err);
      await fetchTodayData();
    }
  };

  const handleQuickAddTask = async (e) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    try {
      await api.post('/today/tasks', {
        title: quickTitle.trim(),
        description: taskDesc.trim() || null,
        priority: Number(taskPriority),
        time_block: taskTimeBlock.trim() || null,
      });
      setQuickTitle('');
      setTaskDesc('');
      setTaskTimeBlock('');
      setShowTaskModal(false);
      await fetchTodayData();
    } catch (err) {
      console.error('Error creating task:', err);
    }
  };

  const handleToggleHabit = async (habitId) => {
    try {
      await api.post(`/today/habits/${habitId}/check`);
      await fetchTodayData();
    } catch (err) {
      console.error('Error toggling habit:', err);
    }
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setEditTitle(task.title || '');
    setEditDesc(task.description || '');
    setEditPriority(task.priority || 2);
    setEditTimeBlock(task.time_block || '');
    setShowEditModal(true);
  };

  const handleSaveEditTask = async (e) => {
    e.preventDefault();
    if (!editingTask || !editTitle.trim()) return;
    try {
      const res = await api.patch(`/today/tasks/${editingTask.id}`, {
        title: editTitle.trim(),
        description: editDesc.trim() || null,
        priority: Number(editPriority),
        time_block: editTimeBlock.trim() || null,
      });
      setData((prev) => ({
        ...prev,
        tasks_today: prev.tasks_today.map((t) => (t.id === editingTask.id ? res.data : t)),
      }));
      setShowEditModal(false);
      setEditingTask(null);
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('¿Deseas eliminar esta tarea?')) return;
    try {
      await api.delete(`/today/tasks/${taskId}`);
      setData((prev) => {
        const remaining = prev.tasks_today.filter((t) => t.id !== taskId);
        const completedCount = remaining.filter((t) => t.status === 'completed' || t.status === 'done').length;
        return {
          ...prev,
          tasks_today: remaining,
          summary_counts: {
            total: remaining.length,
            completed: completedCount,
            pending: remaining.length - completedCount,
          },
        };
      });
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const handleCreateHabit = async (e) => {
    e.preventDefault();
    if (!habitName.trim()) return;

    try {
      await api.post('/today/habits', {
        name: habitName.trim(),
        frequency: habitFrequency,
      });
      setHabitName('');
      setShowHabitModal(false);
      await fetchTodayData();
    } catch (err) {
      console.error('Error creating habit:', err);
    }
  };

  const formatMXN = (val) =>
    Number(val || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

  // Priority metadata
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 4:
        return <RetroBadge variant="cempasuchil">Urgente</RetroBadge>;
      case 3:
        return <RetroBadge variant="maiz">Alta</RetroBadge>;
      case 2:
        return <RetroBadge variant="nopal">Media</RetroBadge>;
      default:
        return <RetroBadge variant="default">Baja</RetroBadge>;
    }
  };

  // Spanish vintage date string
  const todayFormatted = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (loading) {
    return (
      <div className="text-tinta-muted font-display py-12 text-center font-bold">
        Sincronizando Cabina Today & Telemetría...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Cockpit Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-tinta/20 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-cempasuchil" />
            <span className="text-xs uppercase font-extrabold tracking-widest text-cempasuchil-dark">
              Cabina de Ejecución Diaria
            </span>
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold font-display capitalize text-tinta">
            {todayFormatted}
          </h1>
          <p className="text-tinta-muted text-sm mt-0.5">
            Agenda centralizada, telemetría financiera viva y guardianes de inventario.
          </p>
        </div>

        {/* Safe-to-Spend & Liquidity Spotlight Pill */}
        <div className="flex flex-wrap items-center gap-3">
          <RetroCard variant="highlighted" className="py-2.5 px-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cempasuchil text-crema flex items-center justify-center border border-tinta shadow-vintage-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-tinta-muted tracking-wider block">
                Safe-to-Spend Hoy
              </span>
              <span className="text-xl font-extrabold font-display text-tinta leading-none">
                {formatMXN(data.financial_summary?.safe_to_spend_daily)}
                <span className="text-xs font-semibold text-tinta-muted ml-1">/ día</span>
              </span>
            </div>
          </RetroCard>

          <RetroCard className="py-2.5 px-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-nopal text-crema flex items-center justify-center border border-tinta shadow-vintage-sm">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-tinta-muted tracking-wider block">
                Liquidez Neta
              </span>
              <span className="text-xl font-extrabold font-display text-nopal leading-none">
                {formatMXN(data.financial_summary?.net_liquidity)}
              </span>
            </div>
          </RetroCard>
        </div>
      </div>

      {/* Main Grid: Left Column (Tasks & Time-blocking), Right Column (Habits & Alerts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Tasks Agenda (2 cols on desktop) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-nopal" />
              <h2 className="text-xl font-bold font-display text-tinta">
                Tareas de Hoy
              </h2>
              <RetroBadge variant="nopal" className="ml-1">
                {data.summary_counts.completed} / {data.summary_counts.total} completadas
              </RetroBadge>
            </div>
            <RetroButton
              onClick={() => setShowTaskModal(true)}
              variant="primary"
              className="py-1.5 px-3 text-xs"
            >
              <Plus className="w-4 h-4" /> Nueva Tarea
            </RetroButton>
          </div>

          {/* Quick Add Inline Bar */}
          <form onSubmit={handleQuickAddTask} className="flex gap-2">
            <input
              type="text"
              placeholder="+ Añadir tarea rápida para hoy (ej. Revisar PR de Telemetría, Enviar reporte)..."
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              className="flex-1 bg-crema-paper border-2 border-tinta rounded-xl px-4 py-2 text-sm text-tinta placeholder:text-tinta-muted focus:outline-none focus:ring-2 focus:ring-nopal shadow-vintage-sm"
            />
            <RetroButton type="submit" variant="accent" className="shrink-0 px-4">
              Agregar
            </RetroButton>
          </form>

          {/* Tasks List */}
          {data.tasks_today.length === 0 ? (
            <RetroCard variant="dashed" className="p-8 text-center">
              <CalendarCheck className="w-10 h-10 text-tinta-muted mx-auto mb-2 opacity-60" />
              <p className="text-tinta text-base font-bold font-display">
                No tienes tareas pendientes para hoy
              </p>
              <p className="text-tinta-muted text-xs mt-1">
                Añade tareas con time-blocking o vincúlalas a tus metas estratégicas.
              </p>
            </RetroCard>
          ) : (
            <div className="space-y-2.5">
              {data.tasks_today.map((task) => {
                const isDone = task.status === 'completed' || task.status === 'done';
                return (
                  <div
                    key={task.id}
                    onClick={() => handleToggleTask(task.id)}
                    className={`p-3.5 rounded-xl border-2 border-tinta transition-all cursor-pointer flex items-center justify-between gap-3 shadow-vintage-sm ${
                      isDone
                        ? 'bg-crema-sunken/70 opacity-65 line-through'
                        : 'bg-crema-paper hover:bg-maiz-soft/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        type="button"
                        aria-label="Toggle task"
                        className="text-nopal shrink-0"
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-6 h-6 fill-nopal text-crema" />
                        ) : (
                          <Circle className="w-6 h-6 text-tinta/50 hover:text-nopal" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-bold text-tinta truncate ${
                            isDone ? 'line-through text-tinta-muted' : ''
                          }`}
                        >
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-tinta-muted truncate mt-0.5">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {task.time_block && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-tinta-muted bg-crema-sunken px-2 py-0.5 rounded-md border border-tinta/30">
                          <Clock className="w-3 h-3 text-cempasuchil" />
                          {task.time_block}
                        </span>
                      )}
                      {getPriorityBadge(task.priority)}
                      <RetroBadge variant="default" className="text-[10px] uppercase">
                        {task.source_module || 'agenda'}
                      </RetroBadge>
                      <div className="flex items-center gap-1 border-l border-tinta/20 pl-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(task);
                          }}
                          title="Editar Tarea"
                          className="p-1 hover:bg-crema-sunken rounded text-tinta-muted hover:text-nopal transition"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTask(task.id);
                          }}
                          title="Eliminar Tarea"
                          className="p-1 hover:bg-semantic-danger/10 rounded text-tinta-muted hover:text-semantic-danger transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Cross-Module Telemetry (Habits & Alerts) */}
        <div className="space-y-6">
          {/* Bio & Gym Daily Training Status Widget */}
          <RetroCard className="p-3.5 flex items-center justify-between border-2 border-tinta">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl border-2 border-tinta flex items-center justify-center ${
                  data.workout_completed_today
                    ? 'bg-nopal text-crema shadow-vintage-sm'
                    : 'bg-crema-sunken text-tinta-muted'
                }`}
              >
                <Dumbbell className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-tinta-muted block">
                  Bio & Gym · Hoy
                </span>
                <span className="text-xs font-bold text-tinta">
                  {data.workout_completed_today
                    ? 'Entrenamiento de hoy completado'
                    : 'Sesión pendiente para hoy'}
                </span>
              </div>
            </div>
            <RetroBadge variant={data.workout_completed_today ? 'nopal' : 'cempasuchil'}>
              {data.workout_completed_today ? '✓ Listo' : 'Pendiente'}
            </RetroBadge>
          </RetroCard>

          {/* Habits & Daily Streaks */}
          <RetroCard className="space-y-3">
            <div className="flex items-center justify-between border-b-2 border-tinta/10 pb-2">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-cempasuchil" />
                <h3 className="font-extrabold font-display text-base text-tinta">
                  Rachas de Hábitos
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHabitModal(true)}
                className="text-xs font-bold text-nopal hover:text-nopal-dark flex items-center gap-0.5"
              >
                <Plus className="w-3.5 h-3.5" /> Nuevo
              </button>
            </div>

            <div className="space-y-2">
              {data.habits.map((habit) => {
                const todayStr = new Date().toISOString().split('T')[0];
                const checkedToday = habit.last_completed_date === todayStr;
                return (
                  <div
                    key={habit.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-tinta/20 bg-crema"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleHabit(habit.id)}
                        className={`w-6 h-6 rounded-md border-2 border-tinta flex items-center justify-center transition-all ${
                          checkedToday
                            ? 'bg-nopal text-crema shadow-vintage-sm'
                            : 'bg-crema-paper hover:bg-maiz-soft'
                        }`}
                      >
                        {checkedToday && <CheckCircle2 className="w-4 h-4" />}
                      </button>
                      <span
                        className={`text-xs font-bold truncate ${
                          checkedToday ? 'text-tinta-muted line-through' : 'text-tinta'
                        }`}
                      >
                        {habit.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="flex items-center gap-0.5 text-xs font-extrabold text-cempasuchil">
                        <Flame className="w-3.5 h-3.5 fill-cempasuchil text-cempasuchil" />
                        {habit.current_streak}d
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </RetroCard>

          {/* Cross-Module Alerts: Pantry & Groceries */}
          <RetroCard className="space-y-3">
            <div className="flex items-center gap-2 border-b-2 border-tinta/10 pb-2">
              <ShoppingBag className="w-5 h-5 text-nopal" />
              <h3 className="font-extrabold font-display text-base text-tinta">
                Guardianes de Despensa
              </h3>
            </div>

            {data.pantry_alerts.length === 0 ? (
              <p className="text-xs text-tinta-muted text-center py-2">
                ✓ Inventario en orden. No hay caducidades ni stock bajo.
              </p>
            ) : (
              <div className="space-y-2">
                {data.pantry_alerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-tinta/30 bg-maiz-soft flex items-start gap-2 text-xs"
                  >
                    <AlertTriangle className="w-4 h-4 text-cempasuchil shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-tinta block">{alert.name}</span>
                      <span className="text-tinta-muted text-[11px]">{alert.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </RetroCard>

          {/* Strategic Focus Card */}
          <RetroCard variant="nopal" className="p-4 space-y-2">
            <h4 className="font-extrabold font-display text-sm tracking-wide text-crema flex items-center gap-1.5">
              <span>◆</span> Regla de Enfoque Diario
            </h4>
            <p className="text-xs text-crema/90 leading-relaxed">
              Prioriza un máximo de 3 victorias clave al día asociadas a tus metas de
              carrera o ingeniería. Menos fricción, máxima retención.
            </p>
          </RetroCard>
        </div>
      </div>

      {/* Modal: New Detailed Task */}
      <RetroModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title="Nueva Tarea para la Agenda"
      >
        <form onSubmit={handleQuickAddTask} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1">
              Título de la Tarea
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej. Revisar pruebas HIL en banco de pruebas"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta font-semibold focus:outline-none focus:ring-2 focus:ring-nopal"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1">
              Bloque Horario (Time-Block)
            </label>
            <input
              type="text"
              placeholder="Ej. 09:00 - 10:30"
              value={taskTimeBlock}
              onChange={(e) => setTaskTimeBlock(e.target.value)}
              className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta focus:outline-none focus:ring-2 focus:ring-nopal"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1">
              Prioridad
            </label>
            <select
              value={taskPriority}
              onChange={(e) => setTaskPriority(Number(e.target.value))}
              className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta font-semibold focus:outline-none focus:ring-2 focus:ring-nopal"
            >
              <option value={1}>1 - Baja</option>
              <option value={2}>2 - Media</option>
              <option value={3}>3 - Alta</option>
              <option value={4}>4 - Urgente</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1">
              Notas / Descripción
            </label>
            <textarea
              rows={2}
              placeholder="Detalles opcionales o enlaces..."
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta focus:outline-none focus:ring-2 focus:ring-nopal"
            />
          </div>

          <OrnamentalDivider label="Guardar" />

          <RetroButton type="submit" variant="primary" className="w-full py-2.5">
            Agendar Tarea
          </RetroButton>
        </form>
      </RetroModal>

      {/* Modal: Edit Task */}
      <RetroModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingTask(null);
        }}
        title="Editar Tarea"
      >
        <form onSubmit={handleSaveEditTask} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1">
              Título de la Tarea
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Revisar pruebas HIL en banco"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta font-semibold focus:outline-none focus:ring-2 focus:ring-nopal"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1">
              Bloque Horario (Time-Block)
            </label>
            <input
              type="text"
              placeholder="Ej. 14:00 - 15:30"
              value={editTimeBlock}
              onChange={(e) => setEditTimeBlock(e.target.value)}
              className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta focus:outline-none focus:ring-2 focus:ring-nopal"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1">
              Prioridad
            </label>
            <select
              value={editPriority}
              onChange={(e) => setEditPriority(Number(e.target.value))}
              className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta font-semibold focus:outline-none focus:ring-2 focus:ring-nopal"
            >
              <option value={1}>1 - Baja</option>
              <option value={2}>2 - Media</option>
              <option value={3}>3 - Alta</option>
              <option value={4}>4 - Urgente</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1">
              Notas / Descripción
            </label>
            <textarea
              rows={2}
              placeholder="Detalles opcionales o enlaces..."
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta focus:outline-none focus:ring-2 focus:ring-nopal"
            />
          </div>

          <OrnamentalDivider label="Actualizar" />

          <RetroButton type="submit" variant="primary" className="w-full py-2.5">
            Guardar Cambios
          </RetroButton>
        </form>
      </RetroModal>

      {/* Modal: New Habit */}
      <RetroModal
        isOpen={showHabitModal}
        onClose={() => setShowHabitModal(false)}
        title="Registrar Nuevo Hábito"
      >
        <form onSubmit={handleCreateHabit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1">
              Nombre del Hábito
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej. Anki Vocabulario C1, Meditación 10m"
              value={habitName}
              onChange={(e) => setHabitName(e.target.value)}
              className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta font-semibold focus:outline-none focus:ring-2 focus:ring-nopal"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1">
              Frecuencia
            </label>
            <select
              value={habitFrequency}
              onChange={(e) => setHabitFrequency(e.target.value)}
              className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta font-semibold focus:outline-none focus:ring-2 focus:ring-nopal"
            >
              <option value="daily">Diario (Daily)</option>
              <option value="weekly">Semanal (Weekly)</option>
            </select>
          </div>

          <RetroButton type="submit" variant="accent" className="w-full py-2.5">
            Guardar Hábito
          </RetroButton>
        </form>
      </RetroModal>
    </div>
  );
}

