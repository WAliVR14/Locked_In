# backend/app/services/ai_coach.py
from datetime import datetime, timezone
from typing import Dict, Any, List
from fastapi import HTTPException
from sqlmodel import Session, select

from app.models.entities import WorkoutLog, WorkoutBlock, Exercise


def generate_workout_feedback(workout_id: int, session: Session, user_id: int) -> Dict[str, Any]:
    """
    Simulated Gemini AI Coach engine analyzing structured workout telemetry.
    Parses workout blocks, volume, sets, reps, and physical/RPE notes to
    deliver tailored progression advice and injury risk mitigation.
    """
    workout = session.exec(
        select(WorkoutLog).where(
            WorkoutLog.id == workout_id,
            WorkoutLog.user_id == user_id,
        )
    ).first()

    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")

    blocks = session.exec(
        select(WorkoutBlock)
        .where(WorkoutBlock.workout_id == workout.id, WorkoutBlock.user_id == user_id)
        .order_by(WorkoutBlock.block_order.asc())
    ).all()

    exercises = session.exec(
        select(Exercise)
        .where(Exercise.workout_id == workout.id, Exercise.user_id == user_id)
        .order_by(Exercise.order_index.asc())
    ).all()

    # Fatigue and overload keyword dictionaries
    fatigue_keywords = ["tirón", "tiron", "dolor", "molestia", "pesado", "fallo", "calambre", "límite", "limite", "costó", "costo", "apenas"]
    overload_keywords = ["fácil", "facil", "sobrado", "subir", "liviano", "rpe 7", "rpe 6", "fluido", "cómodo", "comodo", "rápido", "rapido"]

    suggestions: List[Dict[str, str]] = []
    overload_count = 0
    fatigue_count = 0

    for ex in exercises:
        note = (ex.notes or "").lower()
        has_fatigue = any(kw in note for kw in fatigue_keywords)
        has_overload = any(kw in note for kw in overload_keywords)

        if has_fatigue:
            fatigue_count += 1
            suggestions.append({
                "exercise": ex.name,
                "action": "Mantener peso o Descarga (-10%)",
                "notes_context": ex.notes or "Fatiga detectada",
                "justification": f"Reportaste '{ex.notes}'. Prioriza control excéntrico y descanso articular antes de incrementar carga.",
            })
        elif has_overload:
            overload_count += 1
            inc = 2.5 if "press" in ex.name.lower() or "militar" in ex.name.lower() else 5.0
            new_target = ex.weight + inc if ex.weight > 0 else 2.5
            suggestions.append({
                "exercise": ex.name,
                "action": f"Sobrecarga Progresiva (+{inc}kg -> {new_target}kg)",
                "notes_context": ex.notes or "Sensación fluida",
                "justification": f"Sensación reportada como favorable ('{ex.notes}'). Tu sistema neuromuscular está adaptado para subir peso.",
            })
        else:
            if ex.weight > 0:
                suggestions.append({
                    "exercise": ex.name,
                    "action": f"Consolidar {ex.sets}x{ex.reps} @ {ex.weight}kg",
                    "notes_context": ex.notes or "Sin observaciones",
                    "justification": "Registra notas de RPE en tu próxima sesión para afinar la recomendación de incremento.",
                })

    # Global Coach Verdict
    if fatigue_count > 0:
        overall_assessment = (
            f"Sesión completada con signos de estrés mecánico en {fatigue_count} ejercicio(s). "
            "Recomendado protocolo de movilidad y sueño reparador de 8h."
        )
        coach_verdict = "Cuidado con la Fatiga Acumulada: Modera el volumen en la próxima sesión."
    elif overload_count > 0:
        overall_assessment = (
            f"Excelente capacidad de esfuerzo. Detectada ventana de sobrecarga en {overload_count} ejercicio(s). "
            "Estás en condiciones óptimas para buscar récords personales en la próxima semana."
        )
        coach_verdict = "Luz Verde para Progresión de Fuerza: ¡Aumenta las cargas planificadas!"
    else:
        overall_assessment = (
            f"Entrenamiento {workout.type} sólido de {workout.duration_minutes} minutos. "
            f"Registraste {len(exercises)} ejercicios en {len(blocks) or 1} bloque(s)."
        )
        coach_verdict = "Consistencia y Rango de Movimiento Óptimos."

    return {
        "workout_id": workout.id,
        "title": workout.title,
        "type": workout.type,
        "duration_minutes": workout.duration_minutes,
        "blocks_count": len(blocks),
        "exercises_count": len(exercises),
        "overall_assessment": overall_assessment,
        "coach_verdict": coach_verdict,
        "suggestions": suggestions,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

