import '@testing-library/jest-dom/vitest'
import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWalletJourneyState } from './useWalletJourneyState'

type MockBalanceSummary = {
  calculatedTotalBalanceInSats: number
  calculatedAvailableBalanceInSats: number
  calculatedFrozenOrLockedBalanceInSats: number
}

type MockJar = {
  jarIndex: number
  name: string
  color: string
  balanceSummary: MockBalanceSummary
  utxos: Array<{ confirmations: number }>
}

const testState = vi.hoisted(() => ({
  walletInfo: {
    walletName: 'Satoshi' as string | null,
    isLoading: false,
    isFetching: false,
    error: null as Error | null,
    refetch: async () => await Promise.resolve(undefined),
  },
  walletBalanceSummary: {
    calculatedTotalBalanceInSats: 100_000,
    calculatedAvailableBalanceInSats: 100_000,
    calculatedFrozenOrLockedBalanceInSats: 0,
  } as MockBalanceSummary,
  jars: [
    {
      jarIndex: 0,
      name: 'Apricot',
      color: '#e2b86a',
      balanceSummary: {
        calculatedTotalBalanceInSats: 0,
        calculatedAvailableBalanceInSats: 0,
        calculatedFrozenOrLockedBalanceInSats: 0,
      },
      utxos: [{ confirmations: 6 }],
    } as MockJar,
  ],
  jmInfo: {
    version: undefined,
    queryResult: {
      isLoading: false,
      isError: false,
    },
  },
}))

vi.mock('@/context/JamWalletInfoContext', () => ({
  useJamWalletInfoContext: () => testState.walletInfo,
  useWalletBalanceSummary: () => ({
    walletBalanceSummary: testState.walletBalanceSummary,
    isLoading: false,
  }),
  useJars: () => ({
    jars: testState.jars,
    isLoading: false,
  }),
}))

vi.mock('@/hooks/useQueryJmInfo', () => ({
  useQueryJmInfo: () => testState.jmInfo,
}))

const createBalanceSummary = (total: number, available?: number): MockBalanceSummary => ({
  calculatedTotalBalanceInSats: total,
  calculatedAvailableBalanceInSats: available ?? total,
  calculatedFrozenOrLockedBalanceInSats: total - (available ?? total),
})

const createJar = (confirmations: number[]): MockJar => ({
  jarIndex: 0,
  name: 'Apricot',
  color: '#e2b86a',
  balanceSummary: createBalanceSummary(0),
  utxos: confirmations.map((value) => ({ confirmations: value })),
})

const resetMocks = () => {
  testState.walletInfo = {
    walletName: 'Satoshi',
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: async () => await Promise.resolve(undefined),
  }
  testState.walletBalanceSummary = createBalanceSummary(100_000)
  testState.jars = [createJar([6])]
  testState.jmInfo = {
    version: undefined,
    queryResult: { isLoading: false, isError: false },
  }
}

describe('useWalletJourneyState', () => {
  beforeEach(() => {
    resetMocks()
  })

  it('returns loading state when wallet is loading', () => {
    testState.walletInfo.isLoading = true

    const { result } = renderHook(() => useWalletJourneyState())

    expect(result.current.state).toBe('loading')
    expect(result.current.isLoading).toBe(true)
  })

  it('returns loading state when service is loading', () => {
    testState.jmInfo.queryResult.isLoading = true

    const { result } = renderHook(() => useWalletJourneyState())

    expect(result.current.state).toBe('loading')
    expect(result.current.isLoading).toBe(true)
  })

  it('returns service-offline when JM service query fails', () => {
    testState.jmInfo.queryResult.isError = true

    const { result } = renderHook(() => useWalletJourneyState())

    expect(result.current.state).toBe('service-offline')
    expect(result.current.isServiceOnline).toBe(false)
  })

  it('returns no-wallet when wallet name is null', () => {
    testState.walletInfo.walletName = null

    const { result } = renderHook(() => useWalletJourneyState())

    expect(result.current.state).toBe('no-wallet')
  })

  it('returns action-required when wallet has an error', () => {
    testState.walletInfo.error = new Error('wallet load failed')

    const { result } = renderHook(() => useWalletJourneyState())

    expect(result.current.state).toBe('action-required')
  })

  it('returns empty-wallet when total balance is zero', () => {
    testState.walletBalanceSummary = createBalanceSummary(0)
    testState.jars = [createJar([])]

    const { result } = renderHook(() => useWalletJourneyState())

    expect(result.current.state).toBe('empty-wallet')
    expect(result.current.hasFunds).toBe(false)
  })

  it('returns awaiting-confirmation when funds exist but available balance is zero with low confirmations', () => {
    testState.walletBalanceSummary = createBalanceSummary(100_000, 0)
    testState.jars = [createJar([1, 2])]

    const { result } = renderHook(() => useWalletJourneyState())

    expect(result.current.state).toBe('awaiting-confirmation')
    expect(result.current.hasFunds).toBe(true)
    expect(result.current.hasUnconfirmedUtxos).toBe(true)
  })

  it('returns ready when wallet has actionable balance', () => {
    const { result } = renderHook(() => useWalletJourneyState())

    expect(result.current.state).toBe('ready')
    expect(result.current.hasFunds).toBe(true)
    expect(result.current.isServiceOnline).toBe(true)
    expect(result.current.isLoading).toBe(false)
  })

  it('correctly derives hasUnconfirmedUtxos when some utxos are below threshold', () => {
    testState.jars = [createJar([1, 10])]

    const { result } = renderHook(() => useWalletJourneyState())

    expect(result.current.hasUnconfirmedUtxos).toBe(true)
  })

  it('correctly derives hasUnconfirmedUtxos as false when all utxos are confirmed', () => {
    testState.jars = [createJar([6, 10, 100])]

    const { result } = renderHook(() => useWalletJourneyState())

    expect(result.current.hasUnconfirmedUtxos).toBe(false)
  })

  it('prioritizes service-offline over no-wallet', () => {
    testState.walletInfo.walletName = null
    testState.jmInfo.queryResult.isError = true

    const { result } = renderHook(() => useWalletJourneyState())

    expect(result.current.state).toBe('service-offline')
  })
})
