import { useMemo } from 'react'
import { useJamWalletInfoContext, useJars, useWalletBalanceSummary } from '@/context/JamWalletInfoContext'
import { useQueryJmInfo } from '@/hooks/useQueryJmInfo'
import {
  DEFAULT_MIN_CONFIRMATIONS_FOR_READY,
  deriveWalletJourneyState,
  type WalletJourneyState,
} from '@/lib/walletJourneyState'

export type { WalletJourneyState } from '@/lib/walletJourneyState'

export interface WalletJourneyInfo {
  state: WalletJourneyState
  hasFunds: boolean
  hasUnconfirmedUtxos: boolean
  isServiceOnline: boolean
  isLoading: boolean
}

export function assertExhaustiveJourneyState(state: never): never {
  throw new Error(`Unhandled journey state: ${String(state)}`)
}

export function useWalletJourneyState(): WalletJourneyInfo {
  const { walletName, isLoading, error } = useJamWalletInfoContext()
  const { walletBalanceSummary } = useWalletBalanceSummary()
  const { jars } = useJars()
  const { queryResult: jmInfoQueryResult } = useQueryJmInfo()

  return useMemo(() => {
    const utxoConfirmations = jars.flatMap((jar) => jar.utxos.map((utxo) => utxo.confirmations))

    const state = deriveWalletJourneyState({
      isWalletLoading: isLoading,
      isServiceLoading: jmInfoQueryResult.isLoading,
      walletName,
      hasServiceError: jmInfoQueryResult.isError,
      hasWalletError: error !== null,
      walletTotalBalanceInSats: walletBalanceSummary.calculatedTotalBalanceInSats,
      walletAvailableBalanceInSats: walletBalanceSummary.calculatedAvailableBalanceInSats,
      utxoConfirmations,
    })

    return {
      state,
      hasFunds: walletBalanceSummary.calculatedTotalBalanceInSats > 0,
      hasUnconfirmedUtxos: utxoConfirmations.some((c) => c < DEFAULT_MIN_CONFIRMATIONS_FOR_READY),
      isServiceOnline: !jmInfoQueryResult.isError,
      isLoading: isLoading || jmInfoQueryResult.isLoading,
    }
  }, [walletName, isLoading, error, walletBalanceSummary, jars, jmInfoQueryResult.isLoading, jmInfoQueryResult.isError])
}
