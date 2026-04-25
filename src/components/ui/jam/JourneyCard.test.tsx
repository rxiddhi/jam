import type { ReactNode } from 'react'
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WalletJourneyInfo } from '@/hooks/useWalletJourneyState'
import { JourneyCard } from './JourneyCard'

const noopNavigate = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => noopNavigate,
}))

vi.mock('@/hooks/useWalletJourneyState', () => ({
  assertExhaustiveJourneyState: (state: never) => {
    throw new Error(`Unhandled journey state: ${String(state)}`)
  },
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: { children: ReactNode; onClick?: () => void; [k: string]: unknown }) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}))

const DISMISS_KEY = 'jam-journey-card-dismissed'

const storageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    get length() {
      return Object.keys(store).length
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  }
})()

Object.defineProperty(window, 'localStorage', { value: storageMock, writable: true })

const buildJourney = (overrides: Partial<WalletJourneyInfo> = {}): WalletJourneyInfo => ({
  state: 'ready',
  hasFunds: true,
  hasUnconfirmedUtxos: false,
  isServiceOnline: true,
  isLoading: false,
  ...overrides,
})

describe('<JourneyCard />', () => {
  beforeEach(() => {
    noopNavigate.mockClear()
    storageMock.clear()
  })

  it('renders nothing for loading state', () => {
    const { container } = render(<JourneyCard journey={buildJourney({ state: 'loading' })} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders the correct title for empty-wallet state', () => {
    render(<JourneyCard journey={buildJourney({ state: 'empty-wallet', hasFunds: false })} />)
    expect(screen.getByText('current_wallet.journey_card.empty_wallet.title')).toBeInTheDocument()
  })

  it('renders the correct title for ready state', () => {
    render(<JourneyCard journey={buildJourney({ state: 'ready' })} />)
    expect(screen.getByText('current_wallet.journey_card.ready.title')).toBeInTheDocument()
  })

  it('renders the correct title for service-offline state', () => {
    render(
      <JourneyCard
        journey={buildJourney({ state: 'service-offline', isServiceOnline: false })}
        onRetry={() => {}}
      />,
    )
    expect(screen.getByText('current_wallet.journey_card.service_offline.title')).toBeInTheDocument()
  })

  it('renders the correct title for awaiting-confirmation state', () => {
    render(<JourneyCard journey={buildJourney({ state: 'awaiting-confirmation', hasUnconfirmedUtxos: true })} />)
    expect(screen.getByText('current_wallet.journey_card.awaiting_confirmation.title')).toBeInTheDocument()
  })

  it('renders the correct title for action-required state', () => {
    render(<JourneyCard journey={buildJourney({ state: 'action-required' })} />)
    expect(screen.getByText('current_wallet.journey_card.action_required.title')).toBeInTheDocument()
  })

  it('renders the correct title for no-wallet state', () => {
    render(<JourneyCard journey={buildJourney({ state: 'no-wallet' })} />)
    expect(screen.getByText('current_wallet.journey_card.no_wallet.title')).toBeInTheDocument()
  })

  it('has role="status" and aria-live="polite" for accessibility', () => {
    render(<JourneyCard journey={buildJourney({ state: 'ready' })} />)
    const card = screen.getByTestId('journey-card')
    expect(card).toHaveAttribute('role', 'status')
    expect(card).toHaveAttribute('aria-live', 'polite')
  })

  it('navigates to receive page when empty-wallet CTA is clicked', async () => {
    const user = userEvent.setup()
    render(<JourneyCard journey={buildJourney({ state: 'empty-wallet', hasFunds: false })} />)

    const ctaButton = screen.getByText('current_wallet.journey_card.empty_wallet.cta')
    await user.click(ctaButton)

    expect(noopNavigate).toHaveBeenCalledWith('/receive')
  })

  it('navigates to send page when ready CTA is clicked', async () => {
    const user = userEvent.setup()
    render(<JourneyCard journey={buildJourney({ state: 'ready' })} />)

    const ctaButton = screen.getByText('current_wallet.journey_card.ready.cta')
    await user.click(ctaButton)

    expect(noopNavigate).toHaveBeenCalledWith('/send')
  })

  it('calls onRetry when service-offline CTA is clicked', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(
      <JourneyCard journey={buildJourney({ state: 'service-offline', isServiceOnline: false })} onRetry={onRetry} />,
    )

    const ctaButton = screen.getByText('current_wallet.journey_card.service_offline.cta')
    await user.click(ctaButton)

    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('dismisses the card and persists state to localStorage', async () => {
    const user = userEvent.setup()
    render(<JourneyCard journey={buildJourney({ state: 'ready' })} />)

    const dismissButton = screen.getByLabelText('current_wallet.journey_card.dismiss_label')
    await user.click(dismissButton)

    expect(screen.queryByTestId('journey-card')).not.toBeInTheDocument()

    const stored = JSON.parse(window.localStorage.getItem(DISMISS_KEY) || '[]') as string[]
    expect(stored).toContain('ready')
  })

  it('shows the card for a different state after one state is dismissed', async () => {
    const user = userEvent.setup()

    const { unmount } = render(<JourneyCard journey={buildJourney({ state: 'ready' })} />)
    const dismissButton = screen.getByLabelText('current_wallet.journey_card.dismiss_label')
    await user.click(dismissButton)
    unmount()

    render(<JourneyCard journey={buildJourney({ state: 'empty-wallet', hasFunds: false })} />)
    expect(screen.getByText('current_wallet.journey_card.empty_wallet.title')).toBeInTheDocument()
  })
})
