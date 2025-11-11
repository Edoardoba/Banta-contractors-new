/**
 * Utilità per calcolo e visualizzazione affidabilità professionisti
 */

import pool from '@/lib/db'

export interface ReliabilityStats {
  reliability_score: number
  total_bookings: number
  completed_bookings: number
  cancelled_bookings: number
  no_show_count: number
  completion_rate: number
  cancellation_rate: number
  status: 'new' | 'verified' | 'premium' | 'suspended'
  status_label: string
  status_color: string
  badge_emoji: string
}

/**
 * Ottieni statistiche affidabilità professionista
 */
export async function getProfessionalReliabilityStats(
  professionalId: number
): Promise<ReliabilityStats | null> {
  const result = await pool.query(
    `SELECT
      reliability_score,
      total_bookings,
      completed_bookings,
      cancelled_bookings,
      no_show_count,
      status,
      CASE
        WHEN total_bookings = 0 THEN 100.0
        ELSE ROUND((completed_bookings::NUMERIC / total_bookings::NUMERIC) * 100, 2)
      END as completion_rate,
      CASE
        WHEN total_bookings = 0 THEN 0.0
        ELSE ROUND((cancelled_bookings::NUMERIC / total_bookings::NUMERIC) * 100, 2)
      END as cancellation_rate
    FROM professionals
    WHERE id = $1`,
    [professionalId]
  )

  if (result.rows.length === 0) {
    return null
  }

  const data = result.rows[0]

  return {
    ...data,
    completion_rate: parseFloat(data.completion_rate),
    cancellation_rate: parseFloat(data.cancellation_rate),
    ...getStatusMetadata(data.status),
  }
}

/**
 * Ottieni metadata per status
 */
export function getStatusMetadata(
  status: 'new' | 'verified' | 'premium' | 'suspended'
): {
  status_label: string
  status_color: string
  badge_emoji: string
} {
  switch (status) {
    case 'premium':
      return {
        status_label: 'Top Rated',
        status_color: '#FFD700', // Gold
        badge_emoji: '⭐',
      }
    case 'verified':
      return {
        status_label: 'Verificato',
        status_color: '#10B981', // Green
        badge_emoji: '✅',
      }
    case 'new':
      return {
        status_label: 'Nuovo',
        status_color: '#3B82F6', // Blue
        badge_emoji: '🔰',
      }
    case 'suspended':
      return {
        status_label: 'Sospeso',
        status_color: '#EF4444', // Red
        badge_emoji: '⛔',
      }
    default:
      return {
        status_label: 'Sconosciuto',
        status_color: '#6B7280', // Gray
        badge_emoji: '❓',
      }
  }
}

/**
 * Calcola score color (per UI progressbar)
 */
export function getScoreColor(score: number): string {
  if (score >= 90) return '#10B981' // Green
  if (score >= 70) return '#3B82F6' // Blue
  if (score >= 50) return '#F59E0B' // Orange
  if (score >= 40) return '#EF4444' // Red
  return '#991B1B' // Dark Red
}

/**
 * Ottieni tutti i professionisti ordinati per affidabilità
 */
export async function getProfessionalsByReliability(
  minScore: number = 0,
  limit: number = 50
): Promise<any[]> {
  const result = await pool.query(
    `SELECT
      id,
      name,
      category,
      reliability_score,
      status,
      total_bookings,
      completed_bookings,
      rating,
      review_count,
      CASE
        WHEN total_bookings = 0 THEN 100.0
        ELSE ROUND((completed_bookings::NUMERIC / total_bookings::NUMERIC) * 100, 2)
      END as completion_rate
    FROM professionals
    WHERE reliability_score >= $1
      AND status != 'suspended'
    ORDER BY
      CASE status
        WHEN 'premium' THEN 1
        WHEN 'verified' THEN 2
        WHEN 'new' THEN 3
        ELSE 4
      END,
      reliability_score DESC,
      rating DESC
    LIMIT $2`,
    [minScore, limit]
  )

  return result.rows.map((row) => ({
    ...row,
    completion_rate: parseFloat(row.completion_rate),
    ...getStatusMetadata(row.status),
  }))
}

/**
 * Ottieni log affidabilità professionista
 */
export async function getReliabilityLog(
  professionalId: number,
  limit: number = 20
): Promise<any[]> {
  const result = await pool.query(
    `SELECT
      id,
      booking_id,
      previous_score,
      new_score,
      score_change,
      reason,
      notes,
      created_at
    FROM reliability_log
    WHERE professional_id = $1
    ORDER BY created_at DESC
    LIMIT $2`,
    [professionalId, limit]
  )

  return result.rows
}

/**
 * Calcola prossimo status potenziale
 */
export function calculateNextStatus(stats: ReliabilityStats): {
  next_status: string | null
  requirements: string[]
  progress: number
} {
  const { status, reliability_score, total_bookings, completion_rate } = stats

  if (status === 'suspended') {
    return {
      next_status: 'new',
      requirements: [
        'Porta reliability_score sopra 60',
        `Attuale: ${reliability_score}/100`,
      ],
      progress: (reliability_score / 60) * 100,
    }
  }

  if (status === 'new') {
    const bookingsNeeded = Math.max(0, 10 - total_bookings)
    const scoreNeeded = Math.max(0, 90 - reliability_score)

    return {
      next_status: 'verified',
      requirements: [
        `Completa ${bookingsNeeded} prenotazioni aggiuntive (${total_bookings}/10)`,
        `Mantieni score sopra 90 (attuale: ${reliability_score})`,
        `Mantieni completion rate > 90% (attuale: ${completion_rate.toFixed(1)}%)`,
      ],
      progress: Math.min(100, (total_bookings / 10) * 100),
    }
  }

  if (status === 'verified') {
    const bookingsNeeded = Math.max(0, 50 - total_bookings)
    const scoreNeeded = Math.max(0, 95 - reliability_score)

    return {
      next_status: 'premium',
      requirements: [
        `Completa ${bookingsNeeded} prenotazioni aggiuntive (${total_bookings}/50)`,
        `Porta score sopra 95 (attuale: ${reliability_score})`,
        `Mantieni completion rate > 95% (attuale: ${completion_rate.toFixed(1)}%)`,
      ],
      progress: Math.min(100, (total_bookings / 50) * 100),
    }
  }

  // Già premium
  return {
    next_status: null,
    requirements: ['Hai raggiunto il massimo livello! Continua così! 🎉'],
    progress: 100,
  }
}

/**
 * Formatta ragione cambio score per UI
 */
export function formatScoreChangeReason(reason: string): {
  label: string
  icon: string
  color: string
} {
  const reasons: Record<
    string,
    { label: string; icon: string; color: string }
  > = {
    completed_booking: {
      label: 'Prenotazione Completata',
      icon: '✅',
      color: 'green',
    },
    no_show: {
      label: 'No-Show Cliente',
      icon: '❌',
      color: 'red',
    },
    late_cancellation: {
      label: 'Cancellazione Ultimo Minuto',
      icon: '🚫',
      color: 'orange',
    },
    cancellation_with_notice: {
      label: 'Cancellazione con Preavviso',
      icon: '⚠️',
      color: 'yellow',
    },
    confirmation_timeout: {
      label: 'Timeout Conferma (2h)',
      icon: '⏰',
      color: 'red',
    },
  }

  return (
    reasons[reason] || {
      label: reason,
      icon: '📝',
      color: 'gray',
    }
  )
}
