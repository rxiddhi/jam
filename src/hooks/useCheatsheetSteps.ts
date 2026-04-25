import { useCallback, useMemo, useState } from 'react'
import { useStore } from 'zustand'
import { useJamWalletInfoContext } from '@/context/JamWalletInfoContext'
import { useWalletJourneyState } from '@/hooks/useWalletJourneyState'
import { jmSessionStore } from '@/store/jmSessionStore'

export type CheatsheetStepStatus = 'completed' | 'current' | 'upcoming'

export interface CheatsheetStep {
  number: number
  status: CheatsheetStepStatus
}

const COMPLETED_STEPS_STORAGE_KEY = 'jam-cheatsheet-completed-steps'

function readPersistedCompletions(): Set<number> {
  try {
    const raw = window.localStorage.getItem(COMPLETED_STEPS_STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw) as number[]) : new Set()
  } catch {
    return new Set()
  }
}

function writePersistedCompletions(steps: Set<number>): void {
  try {
    window.localStorage.setItem(COMPLETED_STEPS_STORAGE_KEY, JSON.stringify([...steps]))
  } catch {
  }
}

export function useCheatsheetSteps(): {
  steps: CheatsheetStep[]
  markStepCompleted: (step: number) => void
  markStepIncomplete: (step: number) => void
  resetProgress: () => void
} {
  const { hasFunds, hasUnconfirmedUtxos } = useWalletJourneyState()
  const { fidelityBondSummary } = useJamWalletInfoContext()
  const jmSession = useStore(jmSessionStore, (state) => state.state)

  const [persisted, setPersisted] = useState<Set<number>>(() => readPersistedCompletions())

  const hasFidelityBonds = fidelityBondSummary.fbOutputs.length > 0
  const isMakerRunning = jmSession?.maker_running === true

  const markStepCompleted = useCallback((step: number) => {
    setPersisted((prev) => {
      const next = new Set(prev)
      next.add(step)
      writePersistedCompletions(next)
      return next
    })
  }, [])

  const markStepIncomplete = useCallback((step: number) => {
    setPersisted((prev) => {
      const next = new Set(prev)
      next.delete(step)
      writePersistedCompletions(next)
      return next
    })
  }, [])

  const steps = useMemo<CheatsheetStep[]>(() => {
    const completions: boolean[] = [
      hasFunds,
      hasUnconfirmedUtxos || persisted.has(2),
      hasFidelityBonds || persisted.has(3),
      isMakerRunning || persisted.has(4),
      (jmSession?.coinjoin_in_process === true) || persisted.has(5),
      false,
    ]

    let currentFound = false
    const latestCompletedIndex = completions.lastIndexOf(true)

    return completions.map((isComplete, index): CheatsheetStep => {
      let status: CheatsheetStepStatus

      if (isComplete) {
        status = 'completed'
      } else if (!currentFound && index >= latestCompletedIndex) {
        status = 'current'
        currentFound = true
      } else {
        status = 'upcoming'
      }

      return { number: index + 1, status }
    })
  }, [hasFunds, hasFidelityBonds, isMakerRunning, persisted])

  const resetProgress = useCallback(() => {
    setPersisted(new Set())
    window.localStorage.removeItem(COMPLETED_STEPS_STORAGE_KEY)
    window.dispatchEvent(new Event('storage'))
  }, [])

  return {
    steps,
    markStepCompleted,
    markStepIncomplete,
    resetProgress,
  }
}
