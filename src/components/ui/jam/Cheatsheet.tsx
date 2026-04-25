import { useState, type ComponentProps, type ReactNode } from 'react'
import { CheckIcon, XIcon } from 'lucide-react'
import { useTranslation, Trans } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import PageTitle from '@/components/ui/jam/PageTitle'
import { routes } from '@/constants/routes'
import { useCheatsheetSteps, type CheatsheetStepStatus } from '@/hooks/useCheatsheetSteps'
import { cn } from '@/lib/utils'
import type { WithRequiredProperty } from '@/types/global'
import type { Dialog } from '../dialog'

type NumberedProps = {
  number: number | 'last'
  status?: CheatsheetStepStatus
}

function Numbered({ number, status = 'upcoming' }: NumberedProps) {
  const isLast = number === 'last'

  return (
    <div
      className={cn(
        'flex size-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all duration-300',
        status === 'completed' && 'bg-emerald-500/20 text-emerald-400',
        status === 'current' && 'bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/40',
        status === 'upcoming' && 'bg-foreground text-background',
      )}
    >
      {isLast || status === 'completed' ? (
        <CheckIcon className="size-4" strokeWidth={3} />
      ) : (
        <>{number}</>
      )}
    </div>
  )
}

type ListItemProps = NumberedProps & {
  title: ReactNode | string
  description: ReactNode | string
  status?: CheatsheetStepStatus
}

function ListItem({ number, title, description, status = 'upcoming' }: ListItemProps) {
  return (
    <div
      className={cn(
        'flex gap-4 rounded-lg p-3 transition-all duration-300',
        status === 'current' && 'bg-amber-500/5 ring-1 ring-amber-500/20',
        status === 'completed' && 'opacity-80',
      )}
      aria-label={status === 'current' ? 'Current step' : undefined}
    >
      <Numbered number={number} status={status} />
      <div className="flex-1">
        <h3
          className={cn(
            'mb-1 transition-colors duration-300',
            status === 'current' && 'text-foreground font-semibold',
            status === 'completed' && 'text-muted-foreground',
            status === 'upcoming' && 'text-muted-foreground',
          )}
        >
          {title}
        </h3>
        <p
          className={cn(
            'text-sm transition-colors duration-300',
            status === 'current' && 'text-muted-foreground',
            status !== 'current' && 'text-muted-foreground/70',
          )}
        >
          {description}
        </p>
      </div>
    </div>
  )
}

type CheatsheetProps = WithRequiredProperty<Omit<ComponentProps<typeof Dialog>, 'children'>, 'open' | 'onOpenChange'>

export const Cheatsheet = ({ open, onOpenChange }: CheatsheetProps) => {
  const { t } = useTranslation()
  const [isClosing, setIsClosing] = useState(false)
  const { steps, markStepCompleted, markStepIncomplete, resetProgress } = useCheatsheetSteps()

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onOpenChange(false)
    }, 333)
  }

  if (!open) {
    return <></>
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="fixed inset-0 z-0" onClick={handleClose} />
      <div
        className={`bg-background relative z-10 flex max-h-[90vh] w-full max-w-[640px] flex-col rounded-2xl shadow-2xl transition-all duration-300 ease-out dark:bg-[#181b20] ${
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        <div className="flex-shrink-0 p-6">
          <div className="flex items-center justify-between gap-2">
            <PageTitle title={t('cheatsheet.title')} />
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground text-xs"
                onClick={resetProgress}
              >
                {t('cheatsheet.button_reset_progress')}
              </Button>
              <Button onClick={handleClose} variant="ghost" size="icon" title={t('global.close')}>
                <XIcon />
                <span className="sr-only">{t('global.close')}</span>
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground mt-2 text-xs leading-relaxed sm:text-sm md:text-base">
            <Trans i18nKey="cheatsheet.description">
              Follow the steps below to increase your financial privacy. It is advisable to switch from{' '}
              <a
                className="font-semibold underline"
                href="https://jamdocs.org/glossary/#maker"
                target="_blank"
                rel="noopener noreferrer"
              >
                earning as a maker
              </a>{' '}
              to{' '}
              <a
                className="font-semibold underline"
                href="https://jamdocs.org/glossary/#taker"
                target="_blank"
                rel="noopener noreferrer"
              >
                sending as a taker
              </a>{' '}
              back and forth{''}
              <a
                className="font-medium underline"
                href="https://jamdocs.org/interface/00-cheatsheet/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Learn more.
              </a>
            </Trans>
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-10">
          <div className="flex flex-col gap-4 sm:gap-6">
            {[
              {
                number: 1,
                title: (
                  <Trans i18nKey="cheatsheet.receive.title">
                    <Link to={routes.receive} className="font-semibold underline" onClick={handleClose}>
                      <span>Fund</span>
                    </Link>{' '}
                    your wallet.
                  </Trans>
                ),
                description: t('cheatsheet.receive.description'),
              },
              {
                number: 2,
                title: (
                  <Trans i18nKey="cheatsheet.send.title">
                    <Link to={routes.send} className="font-semibold underline" onClick={handleClose}>
                      <span>Send</span>
                    </Link>{' '}
                    a collaborative transaction to another jar.
                  </Trans>
                ),
                description: t('cheatsheet.send.description'),
              },
              {
                number: 3,
                title: (
                  <Trans i18nKey="cheatsheet.bond.title">
                    Optional:
                    <Link to={routes.earn} className="font-semibold underline" onClick={handleClose}>
                      <span>Lock</span>
                    </Link>{' '}
                    funds in a fidelity bond.
                  </Trans>
                ),
                description: t('cheatsheet.bond.description'),
              },
              {
                number: 4,
                title: (
                  <Trans i18nKey="cheatsheet.earn.title">
                    <Link to={routes.earn} className="font-semibold underline" onClick={handleClose}>
                      <span>Earn</span>
                    </Link>{' '}
                    sats by providing liquidity.
                  </Trans>
                ),
                description: t('cheatsheet.earn.description'),
              },
              {
                number: 5,
                title: (
                  <Trans i18nKey="cheatsheet.schedule.title">
                    Schedule
                    <Link to={routes.sweep} className="font-semibold underline" onClick={handleClose}>
                      sweep
                    </Link>{' '}
                    transactions to empty your wallet.
                  </Trans>
                ),
                description: t('cheatsheet.schedule.description'),
              },
              {
                number: 'last',
                title: t('cheatsheet.repeat.title'),
                description: (
                  <Trans i18nKey="cheatsheet.repeat.description">
                    Still confused?{' '}
                    <a
                      className="font-medium underline"
                      href="https://jamdocs.org/interface/00-cheatsheet/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Dig into the documentation
                    </a>
                  </Trans>
                ),
              },
            ].map((stepData, idx) => {
              const step = steps[idx]
              return (
                <div key={idx} className="group relative">
                  <ListItem
                    number={stepData.number as any}
                    status={step.status}
                    title={stepData.title}
                    description={stepData.description}
                  />
                  {step.status !== 'completed' ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-3 right-3 opacity-0 transition-opacity group-hover:opacity-100"
                      title={t('cheatsheet.button_mark_completed')}
                      onClick={() => markStepCompleted(idx + 1)}
                    >
                      <CheckIcon className="size-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-3 right-3 opacity-0 transition-opacity group-hover:opacity-100"
                      title={t('cheatsheet.button_mark_incomplete')}
                      onClick={() => markStepIncomplete(idx + 1)}
                    >
                      <XIcon className="size-4" />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
