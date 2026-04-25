import { useCallback, useState } from 'react'
import {
  AlertTriangleIcon,
  ClockIcon,
  DownloadIcon,
  SparklesIcon,
  WalletIcon,
  WifiOffIcon,
  XIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { routes } from '@/constants/routes'
import {
  assertExhaustiveJourneyState,
  type WalletJourneyInfo,
  type WalletJourneyState,
} from '@/hooks/useWalletJourneyState'
import { cn } from '@/lib/utils'

const DISMISS_STORAGE_KEY = 'jam-journey-card-dismissed'

function readDismissedStates(): Set<string> {
  try {
    const raw = window.localStorage.getItem(DISMISS_STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function persistDismissedState(state: WalletJourneyState): void {
  try {
    const current = readDismissedStates()
    current.add(state)
    window.localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify([...current]))
  } catch {
  }
}

type JourneyContent = {
  icon: React.ReactNode
  title: string
  description: string
  cta?: { label: string; action: () => void }
  colorClasses: string
  iconContainerClasses: string
}

function useJourneyContent(
  state: WalletJourneyState,
  onRetry?: () => void,
): JourneyContent | null {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const iconSize = 'size-5'

  switch (state) {
    case 'loading':
      return null

    case 'no-wallet':
      return {
        icon: <WalletIcon className={iconSize} />,
        title: t('current_wallet.journey_card.no_wallet.title'),
        description: t('current_wallet.journey_card.no_wallet.description'),
        cta: {
          label: t('current_wallet.journey_card.no_wallet.cta'),
          action: () => void navigate(routes.createWallet),
        },
        colorClasses: 'border-amber-500/20 shadow-lg shadow-amber-500/10',
        iconContainerClasses: 'bg-amber-500/15 text-amber-400',
      }

    case 'service-offline':
      return {
        icon: <WifiOffIcon className={iconSize} />,
        title: t('current_wallet.journey_card.service_offline.title'),
        description: t('current_wallet.journey_card.service_offline.description'),
        cta: onRetry
          ? {
              label: t('current_wallet.journey_card.service_offline.cta'),
              action: onRetry,
            }
          : undefined,
        colorClasses: 'border-red-500/20 shadow-lg shadow-red-500/5',
        iconContainerClasses: 'bg-red-500/15 text-red-400',
      }

    case 'empty-wallet':
      return {
        icon: <DownloadIcon className={iconSize} />,
        title: t('current_wallet.journey_card.empty_wallet.title'),
        description: t('current_wallet.journey_card.empty_wallet.description'),
        cta: {
          label: t('current_wallet.journey_card.empty_wallet.cta'),
          action: () => void navigate(routes.receive),
        },
        colorClasses: 'border-amber-500/20 shadow-lg shadow-amber-500/10',
        iconContainerClasses: 'bg-amber-500/15 text-amber-400',
      }

    case 'awaiting-confirmation':
      return {
        icon: <ClockIcon className={cn(iconSize, 'animate-journey-pulse')} />,
        title: t('current_wallet.journey_card.awaiting_confirmation.title'),
        description: t('current_wallet.journey_card.awaiting_confirmation.description'),
        colorClasses: 'border-blue-500/20 shadow-lg shadow-blue-500/5',
        iconContainerClasses: 'bg-blue-500/15 text-blue-400',
      }

    case 'action-required':
      return {
        icon: <AlertTriangleIcon className={iconSize} />,
        title: t('current_wallet.journey_card.action_required.title'),
        description: t('current_wallet.journey_card.action_required.description'),
        cta: {
          label: t('current_wallet.journey_card.action_required.cta'),
          action: () => void navigate(routes.settings),
        },
        colorClasses: 'border-orange-500/20 shadow-lg shadow-orange-500/5',
        iconContainerClasses: 'bg-orange-500/15 text-orange-400',
      }

    case 'ready':
      return {
        icon: <SparklesIcon className={iconSize} />,
        title: t('current_wallet.journey_card.ready.title'),
        description: t('current_wallet.journey_card.ready.description'),
        cta: {
          label: t('current_wallet.journey_card.ready.cta'),
          action: () => void navigate(routes.send),
        },
        colorClasses: 'border-emerald-500/20 shadow-lg shadow-emerald-500/10',
        iconContainerClasses: 'bg-emerald-500/15 text-emerald-400',
      }

    default:
      return assertExhaustiveJourneyState(state)
  }
}
export interface JourneyCardProps {
  journey: WalletJourneyInfo
  onRetry?: () => void
}

export function JourneyCard({ journey, onRetry }: JourneyCardProps) {
  const { t } = useTranslation()

  const [dismissedStates, setDismissedStates] = useState<Set<string>>(() => readDismissedStates())

  const content = useJourneyContent(journey.state, onRetry)

  const handleDismiss = useCallback(() => {
    persistDismissedState(journey.state)
    setDismissedStates((prev) => new Set([...prev, journey.state]))
  }, [journey.state])

  if (!content || dismissedStates.has(journey.state)) {
    return null
  }

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="journey-card"
      className={cn(
        'animate-in fade-in slide-in-from-bottom-2 relative mx-auto w-full max-w-xl overflow-hidden rounded-xl border p-5 duration-500',
        'bg-gradient-to-r from-[#1e2127] to-[#181b20]',
        content.colorClasses,
      )}
    >
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-3 right-3 rounded-md p-1 text-white/40 transition-colors hover:text-white/80"
        aria-label={t('current_wallet.journey_card.dismiss_label')}
      >
        <XIcon className="size-4" />
      </button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
        <div
          className={cn(
            'flex size-11 flex-shrink-0 items-center justify-center rounded-xl transition-colors duration-300',
            content.iconContainerClasses,
          )}
        >
          {content.icon}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-white">{content.title}</h3>
          <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{content.description}</p>
        </div>

        {content.cta && (
          <Button
            size="sm"
            variant="outline"
            onClick={content.cta.action}
            className="flex-shrink-0 border-white/10 text-xs font-medium text-white hover:border-white/25 hover:bg-white/5"
          >
            {content.cta.label}
          </Button>
        )}
      </div>
    </div>
  )
}
