/**
 * IntensitySlider — the 5-stop register slider. A gradient track (leve →
 * moderado → grave) with five tap targets at 0/25/50/75/100%. The selected
 * stop is a 24px knob bordered in the interpolated color; the rest are 11px
 * hollow dots. Under-labels: leve / moderado / grave.
 *
 * Color/snap math lives in src/lib/severity.ts (pure, unit-tested). This
 * component is presentation + index selection only.
 */
import { SEV, COLORS } from '@/theme/tokens';
import { SNAPS, sampleSev } from '@/lib/severity';

export interface IntensitySliderProps {
  /** Selected stop, 0–4. */
  index: number;
  onChange: (index: number) => void;
}

export function IntensitySlider({ index, onChange }: IntensitySliderProps) {
  const snap = SNAPS[index] ?? SNAPS[0];
  const knobColor = sampleSev(snap.p);

  return (
    <div>
      {/* gradient track + five snap targets */}
      <div style={{ position: 'relative', height: 26, marginBottom: 8 }}>
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 4,
            right: 4,
            height: 7,
            borderRadius: 5,
            background: `linear-gradient(90deg, ${SEV.leve}, ${SEV.moderado}, ${SEV.grave})`,
          }}
        />
        {SNAPS.map((s, i) => (
          <button
            key={i}
            type="button"
            aria-label={s.label}
            aria-pressed={i === index}
            onClick={() => onChange(i)}
            style={{
              position: 'absolute',
              top: 0,
              left: `calc(${s.p * 100}% - 13px)`,
              width: 26,
              height: 26,
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {i === index ? (
              <span
                style={{
                  display: 'block',
                  width: 24,
                  height: 24,
                  margin: 1,
                  borderRadius: '50%',
                  background: COLORS.card,
                  border: `3px solid ${knobColor}`,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                }}
              />
            ) : (
              <span
                style={{
                  display: 'block',
                  width: 11,
                  height: 11,
                  margin: 7.5,
                  borderRadius: '50%',
                  background: COLORS.card,
                  border: `2px solid ${COLORS.faint}`,
                }}
              />
            )}
          </button>
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          color: COLORS.soft,
        }}
      >
        <span>leve</span>
        <span>moderado</span>
        <span>grave</span>
      </div>
    </div>
  );
}
