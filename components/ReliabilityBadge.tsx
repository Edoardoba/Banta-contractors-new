import React from 'react'
import { CheckCircle2, Shield, Star, AlertCircle } from 'lucide-react'

interface ReliabilityBadgeProps {
  status: 'new' | 'verified' | 'premium' | 'suspended'
  reliability_score?: number
  completion_rate?: number
  total_bookings?: number
  size?: 'sm' | 'md' | 'lg'
  showTooltip?: boolean
}

export default function ReliabilityBadge({
  status,
  reliability_score = 100,
  completion_rate = 100,
  total_bookings = 0,
  size = 'md',
  showTooltip = true,
}: ReliabilityBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'premium':
        return {
          label: 'Top Rated',
          emoji: '⭐',
          icon: Star,
          bgColor: 'bg-gradient-to-r from-yellow-400 to-yellow-600',
          textColor: 'text-white',
          borderColor: 'border-yellow-400',
        }
      case 'verified':
        return {
          label: 'Verificato',
          emoji: '✅',
          icon: CheckCircle2,
          bgColor: 'bg-gradient-to-r from-green-500 to-emerald-600',
          textColor: 'text-white',
          borderColor: 'border-green-500',
        }
      case 'new':
        return {
          label: 'Nuovo',
          emoji: '🔰',
          icon: Shield,
          bgColor: 'bg-gradient-to-r from-blue-500 to-blue-600',
          textColor: 'text-white',
          borderColor: 'border-blue-500',
        }
      case 'suspended':
        return {
          label: 'Sospeso',
          emoji: '⛔',
          icon: AlertCircle,
          bgColor: 'bg-gradient-to-r from-red-500 to-red-600',
          textColor: 'text-white',
          borderColor: 'border-red-500',
        }
      default:
        return {
          label: 'Nuovo',
          emoji: '🔰',
          icon: Shield,
          bgColor: 'bg-gray-500',
          textColor: 'text-white',
          borderColor: 'border-gray-500',
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }

  const tooltipContent = `
    ${config.label}
    Affidabilità: ${reliability_score}/100
    Tasso completamento: ${completion_rate.toFixed(1)}%
    ${total_bookings} prenotazioni totali
  `.trim()

  return (
    <div className="relative inline-flex group">
      <div
        className={`
          ${config.bgColor}
          ${config.textColor}
          ${sizeClasses[size]}
          rounded-full
          font-semibold
          inline-flex
          items-center
          gap-1.5
          shadow-sm
          transition-all
          hover:shadow-md
          cursor-help
        `}
        title={showTooltip ? tooltipContent : undefined}
      >
        <Icon className={iconSizes[size]} />
        <span>{config.label}</span>
      </div>

      {showTooltip && (
        <div
          className="
            absolute
            bottom-full
            left-1/2
            transform
            -translate-x-1/2
            mb-2
            px-3
            py-2
            bg-gray-900
            text-white
            text-xs
            rounded-lg
            whitespace-nowrap
            opacity-0
            group-hover:opacity-100
            transition-opacity
            pointer-events-none
            z-50
            shadow-lg
          "
        >
          <div className="space-y-1">
            <div className="font-semibold border-b border-gray-700 pb-1">
              {config.label}
            </div>
            <div>Affidabilità: {reliability_score}/100</div>
            <div>Completamento: {completion_rate.toFixed(1)}%</div>
            <div>{total_bookings} prenotazioni</div>
          </div>
          {/* Arrow */}
          <div
            className="
              absolute
              top-full
              left-1/2
              transform
              -translate-x-1/2
              w-0
              h-0
              border-l-4
              border-l-transparent
              border-r-4
              border-r-transparent
              border-t-4
              border-t-gray-900
            "
          />
        </div>
      )}
    </div>
  )
}
