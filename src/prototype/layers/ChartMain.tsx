import { useLobbyParticipants } from '../../hooks/useLobbyParticipants'
import type { BetState, Phase } from '../../lib/gameTypes'
import { ChartCanvas, type ExitMarker } from './ChartCanvas'
import { PlayersAside } from './PlayersAside'

interface Point {
  t: number
  m: number
}

interface Props {
  points: Point[]
  multiplier: number
  phase: Phase
  crashPoint: number | null
  countdown: number
  bet: BetState
  roundId: number
}

export function ChartMain({
  points,
  multiplier,
  phase,
  crashPoint,
  countdown,
  bet,
  roundId,
}: Props) {
  const lobby = useLobbyParticipants({
    phase,
    multiplier,
    crashPoint,
    bet,
    roundId,
    countdown,
  })

  const exitMarkers: ExitMarker[] = lobby.rows
    .filter((r) => r.status === 'cashed' && r.mult != null)
    .map((r) => ({
      key: r.key,
      name: r.name,
      avatarHue: r.avatarHue,
      mult: r.mult!,
      isPlayer: r.isPlayer,
    }))

  return (
    <section className="ChartMain">
      <div className="ChartMain__left">
        <ChartCanvas
          points={points}
          multiplier={multiplier}
          phase={phase}
          crashPoint={crashPoint}
          countdown={countdown}
          bet={bet}
          exitMarkers={exitMarkers}
        />
      </div>

      <PlayersAside
        totalCount={lobby.totalCount}
        totalFunds={lobby.totalFunds}
        rows={lobby.rows}
        countBump={lobby.countBump}
      />
    </section>
  )
}
