import '@testing-library/jest-dom/vitest'
import { renderHook, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCheatsheetSteps } from './useCheatsheetSteps'

const COMPLETED_STEPS_KEY = 'jam-cheatsheet-completed-steps'

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

const testState = vi.hoisted(() => ({
  journey: {
    state: 'ready' as string,
    hasFunds: true,
    hasUnconfirmedUtxos: false,
    isServiceOnline: true,
    isLoading: false,
  },
  fidelityBondSummary: { fbOutputs: [] as Array<Record<string, unknown>> },
  jmSessionState: null as { maker_running?: boolean } | null,
}))

vi.mock('@/hooks/useWalletJourneyState', () => ({
  useWalletJourneyState: () => testState.journey,
}))

vi.mock('@/context/JamWalletInfoContext', () => ({
  useJamWalletInfoContext: () => ({
    fidelityBondSummary: testState.fidelityBondSummary,
  }),
}))

vi.mock('@/store/jmSessionStore', () => ({
  jmSessionStore: {
    getState: () => ({ state: testState.jmSessionState }),
    subscribe: () => () => {},
    getInitialState: () => ({ state: testState.jmSessionState }),
  },
}))

vi.mock('zustand', async () => {
  const actual = await vi.importActual<typeof import('zustand')>('zustand')
  return {
    ...actual,
    useStore: (_store: unknown, selector?: (s: unknown) => unknown) => {
      const s = { state: testState.jmSessionState }
      return selector ? selector(s) : s
    },
  }
})

const resetMocks = () => {
  testState.journey = {
    state: 'ready',
    hasFunds: true,
    hasUnconfirmedUtxos: false,
    isServiceOnline: true,
    isLoading: false,
  }
  testState.fidelityBondSummary = { fbOutputs: [] }
  testState.jmSessionState = null
  storageMock.clear()
}

describe('useCheatsheetSteps', () => {
  beforeEach(() => {
    resetMocks()
  })

  it('marks step 1 as current when wallet has no funds', () => {
    testState.journey.hasFunds = false

    const { result } = renderHook(() => useCheatsheetSteps())

    expect(result.current.steps[0].status).toBe('current')
    expect(result.current.steps[1].status).toBe('upcoming')
  })

  it('marks step 1 as completed and step 2 as current when wallet is funded', () => {
    testState.journey.hasFunds = true

    const { result } = renderHook(() => useCheatsheetSteps())

    expect(result.current.steps[0].status).toBe('completed')
    expect(result.current.steps[1].status).toBe('current')
  })

  it('marks step 3 as completed when fidelity bond exists', () => {
    testState.journey.hasFunds = true
    testState.fidelityBondSummary.fbOutputs = [{ value: 100_000 }]
    storageMock.setItem(COMPLETED_STEPS_KEY, JSON.stringify([2]))

    const { result } = renderHook(() => useCheatsheetSteps())

    expect(result.current.steps[2].status).toBe('completed')
  })

  it('marks step 4 as completed when maker is running', () => {
    testState.journey.hasFunds = true
    testState.jmSessionState = { maker_running: true }
    storageMock.setItem(COMPLETED_STEPS_KEY, JSON.stringify([2, 3]))

    const { result } = renderHook(() => useCheatsheetSteps())

    expect(result.current.steps[3].status).toBe('completed')
  })

  it('step 6 (rinse and repeat) is never completed', () => {
    storageMock.setItem(COMPLETED_STEPS_KEY, JSON.stringify([2, 3, 4, 5]))

    const { result } = renderHook(() => useCheatsheetSteps())

    expect(result.current.steps[5].status).not.toBe('completed')
  })

  it('persists step completion to localStorage via markStepCompleted', () => {
    const { result } = renderHook(() => useCheatsheetSteps())

    act(() => {
      result.current.markStepCompleted(2)
    })

    const stored = JSON.parse(storageMock.getItem(COMPLETED_STEPS_KEY) || '[]') as number[]
    expect(stored).toContain(2)
  })

  it('returns exactly 6 steps', () => {
    const { result } = renderHook(() => useCheatsheetSteps())

    expect(result.current.steps).toHaveLength(6)
    expect(result.current.steps.map((s) => s.number)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('only one step is current at a time', () => {
    const { result } = renderHook(() => useCheatsheetSteps())

    const currentSteps = result.current.steps.filter((s) => s.status === 'current')
    expect(currentSteps).toHaveLength(1)
  })
})
