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
} from 'lucide-react';
import {
  RetroCard,
  RetroButton,
  RetroBadge,
  OrnamentalDivider,
  RetroModal,
} from '../components/ui/RetroUI';

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

  // Modal: New Workout
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [workoutTitle, setWorkoutTitle] = useState('');
  const [workoutType, setWorkoutType] = useState('Strength');
  const [workoutDuration, setWorkoutDuration] = useState(45);
  const [workoutCalories, setWorkoutCalories] = useState('');
  const [workoutNotes, setWorkoutNotes] = useState('');

  // Modal: New Metric
  const [showMetricModal, setShowMetricModal] = useState(false);
  const [metricType, setMetricType] = useState('SleepHours');
  const [metricValue, setMetricValue] = useState('');

  const fetchHealthData = useCallback(async () => {
    try {
      const [workoutsRes, metricsRes, summaryRes] = await Promise.all([
        api.get('/health-metrics/workouts'),
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
  }, [onDataChange]);

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

  const handleCreateWorkout = async (e) => {
    e.preventDefault();
    if (!workoutTitle.trim()) return;

    try {
      await api.post('/health-metrics/workouts', {
        title: workoutTitle.trim(),
        type: workoutType,
        duration_minutes: Number(workoutDuration),
        calories_burned: workoutCalories ? Number(workoutCalories) : null,
        notes: workoutNotes.trim() || null,
      });
      setWorkoutTitle('');
      setWorkoutNotes('');
      setWorkoutCalories('');
      setWorkoutDuration(45);
      setShowWorkoutModal(false);
      await fetchHealthData();
    } catch (err) {
      console.error('Error creating workout:', err);
    }
  };

  const handleDeleteWorkout = async (id) => {
    try {
      await api.delete(`/health-metrics/workouts/${id}`);
      await fetchHealthData();
    } catch (err) {
      console.error('Error deleting workout:', err);
    }
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
              Bio & Gym · Rendimiento Físico
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-display text-tinta">
            Health & Wearables Telemetry
          </h1>
          <p className="text-tinta-muted text-sm mt-0.5">
            Registro de cargas de entrenamiento, recuperación nocturna y biometría corporal.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <RetroButton onClick={() => setShowMetricModal(true)} variant="secondary">
            <Scale className="w-4 h-4 text-oliva" /> + Métrica
          </RetroButton>
          <RetroButton onClick={() => setShowWorkoutModal(true)} variant="primary">
            <Plus className="w-4 h-4" /> + Entrenamiento
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
            <Scale className="w-4 h-4 text-maiz-dark" />
          </div>
          <p className="text-2xl font-extrabold font-display text-tinta">
            {summary.latest_weight_kg}{' '}
            <span className="text-xs font-sans text-tinta-muted">kg</span>
          </p>
        </RetroCard>
      </div>

      {/* Main Grid: Left (Workouts List), Right (Quick Entry & Metrics) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Workouts History (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-nopal" />
              <h2 className="text-xl font-bold font-display text-tinta">
                Bitácora de Entrenamientos
              </h2>
              <RetroBadge variant="default" className="text-xs">
                {workouts.length} registrados
              </RetroBadge>
            </div>
          </div>

          {workouts.length === 0 ? (
            <RetroCard variant="dashed" className="p-8 text-center">
              <p className="text-tinta-muted text-sm">
                No hay entrenamientos registrados aún. Registra tu primera sesión de fuerza o cardio.
              </p>
            </RetroCard>
          ) : (
            <div className="space-y-3">
              {workouts.map((workout) => (
                <RetroCard
                  key={workout.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-maiz-soft/30 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-crema-sunken border-2 border-tinta flex items-center justify-center shrink-0">
                      {getWorkoutIcon(workout.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold font-display text-base text-tinta">
                          {workout.title}
                        </span>
                        {getWorkoutBadge(workout.type)}
                      </div>
                      {workout.notes && (
                        <p className="text-xs text-tinta-muted mb-1">{workout.notes}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-tinta-muted font-medium">
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
                        <span>{workout.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleDeleteWorkout(workout.id)}
                      className="p-1.5 text-tinta-muted hover:text-semantic-danger rounded-lg transition"
                      title="Eliminar sesión"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </RetroCard>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Quick Add & Biometric Telemetry */}
        <div className="space-y-6">
          {/* Quick Workout Form Widget */}
          <RetroCard className="space-y-3">
            <div className="flex items-center gap-2 border-b-2 border-tinta/10 pb-2">
              <Flame className="w-5 h-5 text-cempasuchil" />
              <h3 className="font-extrabold font-display text-base text-tinta">
                Registro Rápido de Sesión
              </h3>
            </div>

            <form onSubmit={handleCreateWorkout} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-tinta-muted block mb-1">
                  Nombre de la Sesión
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Torso / Push Pesado, Trote 6K"
                  value={workoutTitle}
                  onChange={(e) => setWorkoutTitle(e.target.value)}
                  className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-xs font-semibold text-tinta focus:outline-none focus:ring-2 focus:ring-nopal"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-tinta-muted block mb-1">
                    Disciplina
                  </label>
                  <select
                    value={workoutType}
                    onChange={(e) => setWorkoutType(e.target.value)}
                    className="w-full bg-crema border-2 border-tinta rounded-xl px-2.5 py-1.5 text-xs font-semibold text-tinta"
                  >
                    <option value="Strength">Fuerza</option>
                    <option value="Cardio">Cardio</option>
                    <option value="Calisthenics">Calistenia</option>
                    <option value="Flexibility">Movilidad</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-tinta-muted block mb-1">
                    Duración (min)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    required
                    value={workoutDuration}
                    onChange={(e) => setWorkoutDuration(e.target.value)}
                    className="w-full bg-crema border-2 border-tinta rounded-xl px-2.5 py-1.5 text-xs font-semibold text-tinta"
                  />
                </div>
              </div>

              <input
                type="text"
                placeholder="Notas (Gimnasio FORVIA, RPE, etc.)..."
                value={workoutNotes}
                onChange={(e) => setWorkoutNotes(e.target.value)}
                className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-1.5 text-xs text-tinta"
              />

              <RetroButton type="submit" variant="primary" className="w-full py-2 text-xs">
                Registrar Entrenamiento
              </RetroButton>
            </form>
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

      {/* Modal: Detailed New Workout */}
      <RetroModal
        isOpen={showWorkoutModal}
        onClose={() => setShowWorkoutModal(false)}
        title="Registrar Sesión de Entrenamiento"
      >
        <form onSubmit={handleCreateWorkout} className="space-y-4">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1">
                Tipo
              </label>
              <select
                value={workoutType}
                onChange={(e) => setWorkoutType(e.target.value)}
                className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm font-semibold text-tinta"
              >
                <option value="Strength">Fuerza / Pesas</option>
                <option value="Cardio">Cardio / Running</option>
                <option value="Calisthenics">Calistenia</option>
                <option value="Flexibility">Flexibilidad / Yoga</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1">
                Duración (minutos)
              </label>
              <input
                type="number"
                min="5"
                max="300"
                required
                value={workoutDuration}
                onChange={(e) => setWorkoutDuration(e.target.value)}
                className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm font-semibold text-tinta"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1">
              Calorías Quemadas (estimadas)
            </label>
            <input
              type="number"
              placeholder="420"
              value={workoutCalories}
              onChange={(e) => setWorkoutCalories(e.target.value)}
              className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-tinta-muted block mb-1">
              Notas & Sensaciones
            </label>
            <textarea
              rows={2}
              placeholder="Gimnasio FORVIA HELLA, sensaciones musculares, series clave..."
              value={workoutNotes}
              onChange={(e) => setWorkoutNotes(e.target.value)}
              className="w-full bg-crema border-2 border-tinta rounded-xl px-3 py-2 text-sm text-tinta"
            />
          </div>

          <OrnamentalDivider label="Guardar" />

          <RetroButton type="submit" variant="primary" className="w-full py-2.5">
            Guardar Entrenamiento
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

