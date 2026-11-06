import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import {
  Dumbbell,
  Plus,
  Flame,
  Moon,
  Scale,
  Clock,
  Heart,
  Footprints,
  Activity,
  Trash2,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  RetroCard,
  RetroButton,
  RetroBadge,
  OrnamentalDivider,
  RetroModal,
} from '../components/ui/RetroUI';

const DEFAULT_BLOCKS_TEMPLATE = [
  {
    name: 'Bloque 1 - Fuerza Principal',
    block_order: 1,
    exercises: [
      { name: 'Press de Banca', sets: 4, reps: 6, weight: 80, notes: 'RPE 8, buena técnica, listo para subir' },
      { name: 'Fondos en Paralelas', sets: 3, reps: 10, weight: 0, notes: 'Sin dolor, rango completo' },
    ],
  },
  {
    name: 'Bloque 2 - Accesorios',
    block_order: 2,
    exercises: [
      { name: 'Press Militar Mancuernas', sets: 3, reps: 10, weight: 22, notes: 'Última serie pesada, sentí tirón leve en hombro' },
      { name: 'Elevaciones Laterales', sets: 4, reps: 15, weight: 12, notes: 'Control en la bajada, buen bombeo' },
    ],
  },
  {
    name: 'Bloque 3 - Core & Finisher',
    block_order: 3,
    exercises: [
      { name: 'Plancha Abdominal', sets: 3, reps: 45, weight: 0, notes: '45 segundos sostenidos' },
    ],
  },
];

export default function Health({ onDataChange }) {
  const [workouts, setWorkouts] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [summary, setSummary] = useState({
    weekly_minutes: 0,
    weekly_workouts_count: 0,
    weekly_calories: 0,
    avg_sleep_hours: 7.5,
    latest_weight_kg: 72.5,
  });
  const [loading, setLoading] = useState(true);

  // Calendar / Day filter
  const [selectedDate, setSelectedDate] = useState('');
  const [todayStr] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [yesterdayStr] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  });

  // AI Feedback state per workout: { [workoutId]: feedbackObject }
  const [aiFeedback, setAiFeedback] = useState({});
  const [loadingAi, setLoadingAi] = useState({});

  // Expanded blocks per workout: { [workoutId]: boolean }
  const [expandedWorkouts, setExpandedWorkouts] = useState({});

  // Modal: New Workout
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [workoutTitle, setWorkoutTitle] = useState('');
  const [workoutType, setWorkoutType] = useState('Strength');
  const [workoutDuration, setWorkoutDuration] = useState(60);
  const [workoutCalories, setWorkoutCalories] = useState('420');
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [workoutDate, setWorkoutDate] = useState(new Date().toISOString().split('T')[0]);
  const [workoutBlocks, setWorkoutBlocks] = useState(DEFAULT_BLOCKS_TEMPLATE);

  // Modal: New Metric
  const [showMetricModal, setShowMetricModal] = useState(false);
  const [metricType, setMetricType] = useState('SleepHours');
  const [metricValue, setMetricValue] = useState('');

  const fetchHealthData = useCallback(async (dateFilter = selectedDate) => {
    try {
      const params = dateFilter ? { target_date: dateFilter } : {};
      const [workoutsRes, metricsRes, summaryRes] = await Promise.all([
        api.get('/health-metrics/workouts', { params }),
        api.get('/health-metrics/metrics'),
        api.get('/health-metrics/summary'),
      ]);
      setWorkouts(workoutsRes.data);
      setMetrics(metricsRes.data);
      setSummary(summaryRes.data);
      if (onDataChange) onDataChange();
    } catch (err) {
      console.error('Error fetching health telemetry:', err);
    } finally {
      setLoading(false);
    }
  }, [onDataChange, selectedDate]);

  useEffect(() => {
    let isMounted = true;
    api
      .get('/health-metrics/workouts', {
        params: selectedDate ? { target_date: selectedDate } : {},
      })
      .then((res) => {
        if (isMounted) setWorkouts(res.data);
      })
      .catch((err) => console.error('Error fetching filtered workouts:', err));

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      api.get('/health-metrics/workouts'),
      api.get('/health-metrics/metrics'),
      api.get('/health-metrics/summary'),
    ])
      .then(([wRes, mRes, sRes]) => {
        if (isMounted) {
          setWorkouts(wRes.data);
          setMetrics(mRes.data);
          setSummary(sRes.data);
        }
      })
      .catch((err) => console.error('Initial health fetch error:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Block Manipulation Handlers
  const handleAddBlock = () => {
    const nextNum = workoutBlocks.length + 1;
    setWorkoutBlocks([
      ...workoutBlocks,
      {
        name: `Bloque ${nextNum} - Accesorios`,
        block_order: nextNum,
        exercises: [{ name: '', sets: 3, reps: 10, weight: 0, notes: '' }],
      },
    ]);
  };

  const handleRemoveBlock = (blockIndex) => {
    setWorkoutBlocks(workoutBlocks.filter((_, idx) => idx !== blockIndex));
  };

  const handleBlockNameChange = (blockIndex, newName) => {
    setWorkoutBlocks(
      workoutBlocks.map((b, idx) => (idx === blockIndex ? { ...b, name: newName } : b))
    );
  };

  const handleAddExercise = (blockIndex) => {
    setWorkoutBlocks(
      workoutBlocks.map((b, idx) =>
        idx === blockIndex
          ? {
              ...b,
              exercises: [
                ...b.exercises,
                { name: '', sets: 3, reps: 10, weight: 0, notes: '' },
              ],
            }
          : b
      )
    );
  };

  const handleRemoveExercise = (blockIndex, exerciseIndex) => {
    setWorkoutBlocks(
      workoutBlocks.map((b, idx) =>
        idx === blockIndex
          ? {
              ...b,
              exercises: b.exercises.filter((_, exIdx) => exIdx !== exerciseIndex),
            }
          : b
      )
    );
  };

  const handleExerciseChange = (blockIndex, exerciseIndex, field, value) => {
    setWorkoutBlocks(
      workoutBlocks.map((b, idx) =>
        idx === blockIndex
          ? {
              ...b,
              exercises: b.exercises.map((ex, exIdx) =>
                exIdx === exerciseIndex ? { ...ex, [field]: value } : ex
              ),
            }
          : b
      )
    );
  };

  const handleCreateWorkout = async (e) => {
    e.preventDefault();
    if (!workoutTitle.trim()) return;

    // Filter out empty exercises
    const cleanBlocks = workoutBlocks
      .map((b, bIdx) => ({
        name: b.name || `Bloque ${bIdx + 1}`,
        block_order: bIdx + 1,
        exercises: b.exercises
          .filter((ex) => ex.name.trim().length > 0)
          .map((ex, exIdx) => ({
            name: ex.name.trim(),
            sets: Number(ex.sets) || 3,
            reps: Number(ex.reps) || 10,
            weight: Number(ex.weight) || 0,
            notes: ex.notes ? ex.notes.trim() : null,
            order_index: exIdx + 1,
          })),
      }))
      .filter((b) => b.exercises.length > 0);

    try {
      await api.post('/health-metrics/workouts', {
        title: workoutTitle.trim(),
        type: workoutType,
        duration_minutes: Number(workoutDuration) || 45,
        calories_burned: workoutCalories ? Number(workoutCalories) : null,
        notes: workoutNotes.trim() || null,
        date: workoutDate || null,
        blocks: cleanBlocks.length > 0 ? cleanBlocks : null,
      });

      setWorkoutTitle('');
      setWorkoutNotes('');
      setWorkoutDuration(60);
      setWorkoutCalories('420');
      setWorkoutBlocks(DEFAULT_BLOCKS_TEMPLATE);
      setShowWorkoutModal(false);
      await fetchHealthData();
    } catch (err) {
      console.error('Error creating workout:', err);
    }
  };

  const handleDeleteWorkout = async (id) => {
    if (!window.confirm('¿Deseas eliminar este registro de entrenamiento?')) return;
    try {
      await api.delete(`/health-metrics/workouts/${id}`);
      await fetchHealthData();
    } catch (err) {
      console.error('Error deleting workout:', err);
    }
  };

  const handleRequestAIFeedback = async (workoutId) => {
    setLoadingAi((prev) => ({ ...prev, [workoutId]: true }));
    try {
      const res = await api.post(`/health-metrics/workouts/${workoutId}/ai-coach`);
      setAiFeedback((prev) => ({ ...prev, [workoutId]: res.data }));
    } catch (err) {
      console.error('Error requesting AI coach feedback:', err);
    } finally {
      setLoadingAi((prev) => ({ ...prev, [workoutId]: false }));
    }
  };

  const toggleWorkoutExpand = (workoutId) => {
    setExpandedWorkouts((prev) => ({
      ...prev,
      [workoutId]: !prev[workoutId],
    }));
  };

  const handleCreateMetric = async (e) => {
    e.preventDefault();
    if (!metricValue) return;

    let unit = 'hours';
    if (metricType === 'Weight') unit = 'kg';
    if (metricType === 'HeartRate') unit = 'bpm';

    try {
      await api.post('/health-metrics/metrics', {
        metric_type: metricType,
        value: Number(metricValue),
        unit,
      });
      setMetricValue('');
      setShowMetricModal(false);
      await fetchHealthData();
    } catch (err) {
      console.error('Error logging health metric:', err);
    }
  };

  const getWorkoutIcon = (type) => {
    switch (type) {
      case 'Cardio':
        return <Footprints className="w-5 h-5 text-cempasuchil" />;
      case 'Calisthenics':
        return <Activity className="w-5 h-5 text-nopal" />;
      case 'Flexibility':
        return <Heart className="w-5 h-5 text-oliva" />;
      case 'Strength':
      default:
        return <Dumbbell className="w-5 h-5 text-nopal" />;
    }
  };

  const getWorkoutBadge = (type) => {
    switch (type) {
      case 'Cardio':
        return <RetroBadge variant="cempasuchil">Cardio & Trail</RetroBadge>;
      case 'Calisthenics':
        return <RetroBadge variant="maiz">Calistenia</RetroBadge>;
      case 'Flexibility':
        return <RetroBadge variant="oliva">Flexibilidad</RetroBadge>;
      case 'Strength':
      default:
        return <RetroBadge variant="nopal">Fuerza / Gym</RetroBadge>;
    }
  };

  if (loading) {
    return (
      <div className="text-tinta-muted font-display py-12 text-center font-bold">
        Cargando Telemetría Biológica & Entrenamientos...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-tinta/20 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Dumbbell className="w-5 h-5 text-nopal" />
            <span className="text-xs uppercase font-extrabold tracking-widest text-nopal-dark">
              Bio & Gym · Rendimiento Físico & IA
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-display text-tinta">
            Health, Blocks & Gemini Coach
          </h1>
          <p className="text-tinta-muted text-sm mt-0.5">
            Estructura modular de bloques de fuerza, análisis RPE y recomendaciones automáticas de progresión.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <RetroButton onClick={() => setShowMetricModal(true)} variant="secondary">
            <Scale className="w-4 h-4 text-oliva" /> + Métrica
          </RetroButton>
          <RetroButton onClick={() => setShowWorkoutModal(true)} variant="primary">
            <Plus className="w-4 h-4" /> + Entrenamiento por Bloques
          </RetroButton>
        </div>
      </div>

      {/* Top Telemetry KPI Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <RetroCard variant="highlighted">
          <div className="flex items-center justify-between text-tinta-muted text-xs font-bold uppercase tracking-wider mb-1">
            <span>Volumen Semanal</span>
            <Clock className="w-4 h-4 text-cempasuchil" />
          </div>
          <p className="text-2xl font-extrabold font-display text-tinta">
            {summary.weekly_minutes}{' '}
            <span className="text-xs font-sans text-tinta-muted">min</span>
          </p>
        </RetroCard>

        <RetroCard>
          <div className="flex items-center justify-between text-tinta-muted text-xs font-bold uppercase tracking-wider mb-1">
            <span>Sesiones Semana</span>
            <Flame className="w-4 h-4 text-nopal" />
          </div>
          <p className="text-2xl font-extrabold font-display text-nopal">
            {summary.weekly_workouts_count}{' '}
            <span className="text-xs font-sans text-tinta-muted">sesiones</span>
          </p>
        </RetroCard>

        <RetroCard>
          <div className="flex items-center justify-between text-tinta-muted text-xs font-bold uppercase tracking-wider mb-1">
            <span>Promedio Sueño</span>
            <Moon className="w-4 h-4 text-oliva" />
          </div>
          <p className="text-2xl font-extrabold font-display text-oliva">
            {summary.avg_sleep_hours}{' '}
            <span className="text-xs font-sans text-tinta-muted">hrs / noche</span>
          </p>
        </RetroCard>

        <RetroCard>
          <div className="flex items-center justify-between text-tinta-muted text-xs font-bold uppercase tracking-wider mb-1">
            <span>Peso Corporal</span>
            <Scale className="w-4 h-4 text-cempasuchil" />
          </div>
          <p className="text-2xl font-extrabold font-display text-tinta">
            {summary.latest_weight_kg}{' '}
            <span className="text-xs font-sans text-tinta-muted">kg</span>
          </p>
        </RetroCard>
      </div>

      {/* Day Selector / Calendar Filter Bar */}
      <RetroCard className="p-3.5 flex flex-wrap items-center justify-between gap-3 bg-crema-paper">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-nopal" />
          <span className="text-xs font-bold uppercase tracking-wider text-tinta">
            Filtrar Rutinas por Fecha:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedDate('')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition border ${
              selectedDate === ''
                ? 'bg-nopal text-crema border-tinta shadow-vintage-sm'
                : 'bg-crema text-tinta-muted border-tinta/30 hover:bg-maiz-soft'
            }`}
          >
            Todas ({workouts.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(todayStr)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition border ${
              selectedDate === todayStr
                ? 'bg-nopal text-crema border-tinta shadow-vintage-sm'
                : 'bg-crema text-tinta-muted border-tinta/30 hover:bg-maiz-soft'
            }`}
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(yesterdayStr)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition border ${
              selectedDate === yesterdayStr
                ? 'bg-nopal text-crema border-tinta shadow-vintage-sm'
                : 'bg-crema text-tinta-muted border-tinta/30 hover:bg-maiz-soft'
            }`}
          >
            Ayer
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-crema border-2 border-tinta rounded-lg px-2.5 py-0.5 text-xs text-tinta font-semibold focus:outline-none focus:ring-1 focus:ring-nopal"
          />
        </div>
      </RetroCard>

      {/* Main Grid: Left (Workouts List), Right (Quick Entry & Metrics) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Workouts History (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-nopal" />
              <h2 className="text-xl font-bold font-display text-tinta">
                Bitácora de Entrenamientos por Bloques
              </h2>
              <RetroBadge variant="default" className="text-xs">
                {workouts.length} {workouts.length === 1 ? 'sesión' : 'sesiones'}
              </RetroBadge>
            </div>
          </div>

          {workouts.length === 0 ? (
            <RetroCard variant="dashed" className="p-8 text-center">
              <p className="text-tinta-muted text-sm font-bold">
                No se encontraron entrenamientos para la fecha seleccionada.
              </p>
              <p className="text-xs text-tinta-muted mt-1">
                Registra tu rutina utilizando la estructura por bloques para habilitar el feedback de IA.
              </p>
            </RetroCard>
          ) : (
            <div className="space-y-4">
              {workouts.map((workout) => {
                const isExpanded = expandedWorkouts[workout.id] ?? true;
                const feedback = aiFeedback[workout.id];
                const isAiLoading = loadingAi[workout.id];

                return (
                  <RetroCard
                    key={workout.id}
                    className="p-4 space-y-3.5 hover:bg-crema-paper transition-all"
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-tinta/10 pb-2.5">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-crema-sunken border-2 border-tinta flex items-center justify-center shrink-0">
                          {getWorkoutIcon(workout.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold font-display text-base text-tinta">
                              {workout.title}
                            </span>
                            {getWorkoutBadge(workout.type)}
                          </div>
                          {workout.notes && (
                            <p className="text-xs text-tinta-muted mt-0.5">{workout.notes}</p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-tinta-muted font-medium mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-cempasuchil" />
                              {workout.duration_minutes} min
                            </span>
                            {workout.calories_burned && (
                              <span className="flex items-center gap-1">
                                <Flame className="w-3.5 h-3.5 text-semantic-danger" />
                                {workout.calories_burned} kcal
                              </span>
                            )}
                            <span className="flex items-center gap-1 font-mono">
                              <Calendar className="w-3 h-3 text-nopal" />
                              {workout.date}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <RetroButton
                          onClick={() => handleRequestAIFeedback(workout.id)}
                          variant="oliva"
                          disabled={isAiLoading}
                          className="py-1 px-2.5 text-xs"
                          title="Obtener sugerencias de progresión del Gemini AI Coach"
                        >
                          <Sparkles className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
                          {isAiLoading ? 'Analizando...' : 'Feedback IA'}
                        </RetroButton>

                        <button
                          type="button"
                          onClick={() => toggleWorkoutExpand(workout.id)}
                          className="p-1.5 text-tinta-muted hover:text-tinta rounded-lg border border-tinta/20 bg-crema-sunken"
                          title={isExpanded ? 'Colapsar bloques' : 'Expandir bloques'}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteWorkout(workout.id)}
                          className="p-1.5 text-tinta-muted hover:text-semantic-danger rounded-lg transition"
                          title="Eliminar sesión"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* AI Coach Feedback Card (if requested) */}
                    {feedback && (
                      <div className="p-3.5 rounded-xl border-2 border-nopal bg-crema-sunken/80 space-y-2 shadow-vintage-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-nopal font-bold text-xs uppercase tracking-wider">
                            <Sparkles className="w-4 h-4" />
                            <span>Gemini AI Coach Assessment</span>
                          </div>
                          <RetroBadge variant="nopal" className="text-[10px]">
                            {feedback.coach_verdict}
                          </RetroBadge>
                        </div>
                        <p className="text-xs text-tinta font-medium leading-relaxed">
                          {feedback.overall_assessment}
                        </p>

                        {feedback.suggestions && feedback.suggestions.length > 0 && (
                          <div className="space-y-1.5 pt-1.5 border-t border-tinta/10">
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-tinta-muted block">
                              Progresiones y Ajustes Recomendados:
                            </span>
                            {feedback.suggestions.map((s, idx) => (
                              <div
                                key={idx}
                                className="p-2 rounded-lg bg-crema-paper border border-tinta/20 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                              >
                                <div className="space-y-0.5">
                                  <span className="font-bold text-tinta">{s.exercise}:</span>{' '}
                                  <span className="text-tinta-muted text-[11px]">{s.justification}</span>
                                </div>
                                <RetroBadge
                                  variant={s.action.includes('Sobrecarga') ? 'cempasuchil' : 'oliva'}
                                  className="text-[10px] shrink-0 self-start sm:self-center"
                                >
                                  {s.action}
                                </RetroBadge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Structured Blocks & Exercises */}
                    {isExpanded && workout.blocks && workout.blocks.length > 0 && (
                      <div className="space-y-2.5 pt-1">
                        {workout.blocks.map((block, bIdx) => (
                          <div
                            key={bIdx}
                            className="p-3 rounded-xl border border-tinta/25 bg-crema-sunken/40 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold text-tinta uppercase tracking-wide">
                                {block.name}
                              </span>
                              <RetroBadge variant="default" className="text-[10px]">
                                {block.exercises.length} {block.exercises.length === 1 ? 'ejercicio' : 'ejercicios'}
                              </RetroBadge>
                            </div>

                            <div className="space-y-1.5">
                              {block.exercises.map((ex, exIdx) => (
                                <div
                                  key={exIdx}
                                  className="p-2 rounded-lg bg-crema-paper border border-tinta/20 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-tinta">{ex.name}</span>
                                    <span className="font-mono text-tinta-muted bg-crema px-1.5 py-0.5 rounded border border-tinta/20 text-[11px]">
                                      {ex.sets} × {ex.reps} @ {ex.weight} kg
                                    </span>
                                  </div>
                                  {ex.notes && (
                                    <div className="text-[11px] text-tinta-muted italic bg-crema-sunken px-2 py-0.5 rounded border border-tinta/10">
                                      📝 "{ex.notes}"
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </RetroCard>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Quick Add & Biometric Telemetry */}
        <div className="space-y-6">
          {/* Quick Workout Button Prompt */}
          <RetroCard className="space-y-3 p-4">
            <div className="flex items-center gap-2 border-b-2 border-tinta/10 pb-2">
              <Flame className="w-5 h-5 text-cempasuchil" />
              <h3 className="font-extrabold font-display text-base text-tinta">
                Estructura por Bloques
              </h3>
            </div>
            <p className="text-xs text-tinta-muted leading-relaxed">
              Registra tu sesión con la estructura hiper-personalizable (Bloque 1: Fuerza, Bloque 2: Accesorios, Bloque 3: Core) para habilitar recomendaciones precisas de peso y fatiga.
            </p>
            <RetroButton
              onClick={() => setShowWorkoutModal(true)}
              variant="primary"
              className="w-full py-2.5 text-xs"
            >
              <Plus className="w-4 h-4" /> Configurar Sesión en Bloques
            </RetroButton>
          </RetroCard>

          {/* Biometrics List Widget */}
          <RetroCard className="space-y-3">
            <div className="flex items-center justify-between border-b-2 border-tinta/10 pb-2">
              <div className="flex items-center gap-2">
                <Moon className="w-5 h-5 text-oliva" />
                <h3 className="font-extrabold font-display text-base text-tinta">
                  Biometría & Recuperación
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMetricModal(true)}
                className="text-xs font-bold text-nopal hover:underline"
              >
                + Registrar
              </button>
            </div>

            <div className="space-y-2">
              {metrics.slice(0, 5).map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-tinta/20 bg-crema"
                >
                  <div className="flex items-center gap-2">
                    {m.metric_type === 'SleepHours' ? (
                      <Moon className="w-4 h-4 text-oliva" />
                    ) : m.metric_type === 'Weight' ? (
                      <Scale className="w-4 h-4 text-cempasuchil" />
                    ) : (
                      <Heart className="w-4 h-4 text-semantic-danger" />
                    )}
                    <span className="text-xs font-bold text-tinta">
                      {m.metric_type === 'SleepHours'
                        ? 'Sueño'
                        : m.metric_type === 'Weight'
                        ? 'Peso'
                        : 'FC Reposo'}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-extrabold font-display text-tinta">
                      {m.value} {m.unit}
                    </span>
                    <span className="text-[10px] text-tinta-muted block">{m.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </RetroCard>
        </div>
      </div>

      {/* Modal: Structured Workout by Blocks */}
      <RetroModal
        isOpen={showWorkoutModal}
        onClose={() => setShowWorkoutModal(false)}
        title="Registrar Sesión de Entrenamiento por Bloques"
      >
        <form onSubmit={handleCreateWorkout} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* General Workout Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1">
                Título del Entrenamiento
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Ej. Push-Pull-Legs (Fuerza e Hipertrofia)"
                value={workoutTitle}
                onChange={(e) => setWorkoutTitle(e.target.value)}
                className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta font-semibold focus:outline-none focus:ring-2 focus:ring-nopal"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1">
                Fecha
              </label>
              <input
                type="date"
                required
                value={workoutDate}
                onChange={(e) => setWorkoutDate(e.target.value)}
                className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm font-semibold text-tinta"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1">
                Tipo
              </label>
              <select
                value={workoutType}
                onChange={(e) => setWorkoutType(e.target.value)}
                className="w-full bg-crema border-2 border-tinta rounded-xl px-2.5 py-2 text-xs font-semibold text-tinta"
              >
                <option value="Strength">Fuerza / Gym</option>
                <option value="Cardio">Cardio / Trail</option>
                <option value="Calisthenics">Calistenia</option>
                <option value="Flexibility">Flexibilidad / Yoga</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1">
                Duración (min)
              </label>
              <input
                type="number"
                min="5"
                max="300"
                required
                value={workoutDuration}
                onChange={(e) => setWorkoutDuration(e.target.value)}
                className="w-full bg-crema border-2 border-tinta rounded-xl px-2.5 py-2 text-xs font-semibold text-tinta"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1">
                Calorías (kcal)
              </label>
              <input
                type="number"
                placeholder="420"
                value={workoutCalories}
                onChange={(e) => setWorkoutCalories(e.target.value)}
                className="w-full bg-crema border-2 border-tinta rounded-xl px-2.5 py-2 text-xs text-tinta font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1">
              Notas Generales de la Sesión
            </label>
            <input
              type="text"
              placeholder="Ej. Gimnasio FORVIA HELLA, descanso de 90s entre series..."
              value={workoutNotes}
              onChange={(e) => setWorkoutNotes(e.target.value)}
              className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-xs text-tinta"
            />
          </div>

          <OrnamentalDivider label="Estructura de Bloques & Ejercicios" />

          {/* Dynamic Blocks Section */}
          <div className="space-y-4">
            {workoutBlocks.map((block, bIdx) => (
              <div
                key={bIdx}
                className="p-3.5 rounded-xl border-2 border-tinta bg-crema-sunken/60 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={block.name}
                    onChange={(e) => handleBlockNameChange(bIdx, e.target.value)}
                    className="font-bold text-xs uppercase tracking-wider text-tinta bg-crema border border-tinta/30 rounded-lg px-2.5 py-1 flex-1 focus:ring-1 focus:ring-nopal"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddExercise(bIdx)}
                      className="px-2 py-1 text-[11px] font-bold bg-nopal text-crema rounded-lg shadow-vintage-sm hover:bg-nopal-light"
                    >
                      + Ejercicio
                    </button>
                    {workoutBlocks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveBlock(bIdx)}
                        className="p-1 text-semantic-danger hover:bg-semantic-danger/10 rounded"
                        title="Eliminar bloque"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Exercises in this block */}
                <div className="space-y-2">
                  {block.exercises.map((ex, exIdx) => (
                    <div
                      key={exIdx}
                      className="p-2.5 rounded-lg border border-tinta/20 bg-crema space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Nombre del Ejercicio (ej. Press de Banca, Dominadas)"
                          value={ex.name}
                          onChange={(e) =>
                            handleExerciseChange(bIdx, exIdx, 'name', e.target.value)
                          }
                          className="flex-1 bg-crema-paper border border-tinta/40 rounded px-2 py-1 text-xs font-bold text-tinta"
                        />
                        {block.exercises.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveExercise(bIdx, exIdx)}
                            className="p-1 text-tinta-muted hover:text-semantic-danger"
                            title="Quitar ejercicio"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] font-bold uppercase text-tinta-muted block">
                            Series
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={ex.sets}
                            onChange={(e) =>
                              handleExerciseChange(bIdx, exIdx, 'sets', e.target.value)
                            }
                            className="w-full bg-crema-paper border border-tinta/40 rounded px-2 py-0.5 text-xs font-semibold text-tinta"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-tinta-muted block">
                            Reps
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={ex.reps}
                            onChange={(e) =>
                              handleExerciseChange(bIdx, exIdx, 'reps', e.target.value)
                            }
                            className="w-full bg-crema-paper border border-tinta/40 rounded px-2 py-0.5 text-xs font-semibold text-tinta"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-tinta-muted block">
                            Peso (kg)
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            value={ex.weight}
                            onChange={(e) =>
                              handleExerciseChange(bIdx, exIdx, 'weight', e.target.value)
                            }
                            className="w-full bg-crema-paper border border-tinta/40 rounded px-2 py-0.5 text-xs font-semibold text-tinta"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase text-tinta-muted block mb-0.5">
                          Contexto Físico / RPE / Fatiga (Clave para IA)
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. 'Me costó subir', 'sentí tirón', 'muy fluido, subir peso', 'RPE 8'..."
                          value={ex.notes}
                          onChange={(e) =>
                            handleExerciseChange(bIdx, exIdx, 'notes', e.target.value)
                          }
                          className="w-full bg-crema-paper border border-tinta/40 rounded px-2 py-1 text-xs text-tinta placeholder:text-tinta-muted/70"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddBlock}
              className="w-full py-2 border-2 border-dashed border-tinta/40 rounded-xl text-xs font-bold text-nopal hover:bg-maiz-soft/50 transition flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Añadir Nuevo Bloque de Ejercicios
            </button>
          </div>

          <OrnamentalDivider label="Guardar" />

          <RetroButton type="submit" variant="primary" className="w-full py-2.5">
            Guardar Entrenamiento Completo
          </RetroButton>
        </form>
      </RetroModal>

      {/* Modal: New Metric */}
      <RetroModal
        isOpen={showMetricModal}
        onClose={() => setShowMetricModal(false)}
        title="Registrar Métrica Biológica"
      >
        <form onSubmit={handleCreateMetric} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1">
              Tipo de Métrica
            </label>
            <select
              value={metricType}
              onChange={(e) => setMetricType(e.target.value)}
              className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm font-semibold text-tinta"
            >
              <option value="SleepHours">Horas de Sueño (horas)</option>
              <option value="Weight">Peso Corporal (kg)</option>
              <option value="HeartRate">Frecuencia Cardíaca Reposo (bpm)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1">
              Valor
            </label>
            <input
              type="number"
              step="0.1"
              required
              autoFocus
              placeholder="Ej. 7.5 (sueño) o 72.5 (peso)"
              value={metricValue}
              onChange={(e) => setMetricValue(e.target.value)}
              className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta font-semibold"
            />
          </div>

          <RetroButton type="submit" variant="accent" className="w-full py-2.5">
            Guardar Métrica
          </RetroButton>
        </form>
      </RetroModal>
    </div>
  );
}
