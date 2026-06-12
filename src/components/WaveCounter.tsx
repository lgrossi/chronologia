/**
 * WaveCounter — frequency stepper for the register flow. A − step, the live
 * HWave preview (count + interpolated color), and a + step. Count clamps 1–6.
 * Caption pluralizes onda/ondas in pt-BR.
 */
import { COLORS } from '@/theme/tokens';
import { HWave } from '@/components/HWave';

export interface WaveCounterProps {
  count: number;
  onChange: (count: number) => void;
  /** Interpolated severity color driving the wave glyphs. */
  color: string;
}

const MIN = 1;
const MAX = 6;

function stepStyle(primary: boolean) {
  return {
    width: 44,
    height: 44,
    borderRadius: 12,
    cursor: 'pointer',
    fontSize: 22,
    lineHeight: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: primary ? 'none' : `2px solid ${COLORS.line}`,
    background: primary ? COLORS.accent : COLORS.card,
    color: primary ? COLORS.onAccent : COLORS.soft,
  } as const;
}

export function WaveCounter({ count, onChange, color }: WaveCounterProps) {
  const clamped = Math.max(MIN, Math.min(MAX, count));
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          type="button"
          aria-label="menos uma onda"
          onClick={() => onChange(Math.max(MIN, clamped - 1))}
          style={stepStyle(false)}
        >
          –
        </button>
        <span style={{ minWidth: 120, display: 'flex', justifyContent: 'center' }}>
          <HWave color={color} count={clamped} h={22} w={34} sw={3.2} gap={6} />
        </span>
        <button
          type="button"
          aria-label="mais uma onda"
          onClick={() => onChange(Math.min(MAX, clamped + 1))}
          style={stepStyle(true)}
        >
          +
        </button>
      </div>
      <div style={{ fontSize: 12, color: COLORS.faint, textAlign: 'center', marginTop: 9 }}>
        {clamped} {clamped === 1 ? 'onda' : 'ondas'} hoje
      </div>
    </div>
  );
}
