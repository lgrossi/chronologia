/**
 * Registro — the daily check-in overlay (SCREENS.md §2, proto-registro.jsx).
 *
 * The most important, most logic-heavy screen. Progressive disclosure: a good
 * day is one mood tap + "não, tranquilo" + save; symptoms only appear when the
 * gate is "sim". Works for ANY dateKey (today or a backfilled past day) — it
 * pre-fills from repo.getDay(dateKey) on mount.
 *
 * Persistence: builds a DayLog and writes it via repo.putDay. Committing a NEW
 * custom symptom also persists it via repo.putSymptom (so it survives across
 * days) and pre-selects it at 'leve'.
 */
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { COLORS } from '@/theme/tokens';
import type { DayLog, Mood, Severity } from '@/lib/types';
import { SNAPS, sampleSev, baseSev, nextSeverity } from '@/lib/severity';
import { formatLongPt, localDayKey } from '@/lib/date';
import { repo } from '@/data/repo';
import { useSymptoms } from '@/data/hooks';
import { Icon } from '@/components/Icon';
import { HFace } from '@/components/HFace';
import { Btn } from '@/components/Btn';
import { IntensitySlider } from '@/components/IntensitySlider';
import { WaveCounter } from '@/components/WaveCounter';
import { SymptomRow } from '@/components/SymptomRow';

export interface RegistroProps {
  /** The day being logged, `yyyy-mm-dd`. Drives load + save. */
  dateKey: string;
  /** Dismiss the overlay without saving. */
  onClose: () => void;
  /** Saved successfully; hadSymptoms is true when the gate was "sim". */
  onSaved: (hadSymptoms: boolean) => void;
}

type Gate = 'sim' | 'nao' | null;

const MOOD_OPTIONS: ReadonlyArray<[Mood, string]> = [
  ['bom', 'bem'],
  ['neutro', 'mais ou menos'],
  ['ruim', 'difícil'],
];

/** Section heading — display font, 17/600 (matches the prototype's H). */
function H({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: 17,
        fontWeight: 600,
        marginBottom: 11,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Registro({ dateKey, onClose, onSaved }: RegistroProps) {
  const symptoms = useSymptoms();

  const [mood, setMood] = useState<Mood | null>(null);
  const [gate, setGate] = useState<Gate>(null);
  const [sevIdx, setSevIdx] = useState(1);
  const [count, setCount] = useState(2);
  // name -> chosen severity; absence means "not selected".
  const [sevByName, setSevByName] = useState<Record<string, Severity>>({});
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [loaded, setLoaded] = useState(false);

  // Pre-fill from the existing log (edit / backfill). Runs once per dateKey.
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    repo.getDay(dateKey).then((log) => {
      if (cancelled) return;
      if (log) {
        setMood(log.mood);
        setGate(log.overallSeverity ? 'sim' : 'nao');
        setCount(log.waveCount > 0 ? log.waveCount : 2);
        const idx = log.overallSeverity
          ? SNAPS.findIndex((s) => baseSev(s.p) === log.overallSeverity)
          : 1;
        setSevIdx(idx >= 0 ? idx : 1);
        const map: Record<string, Severity> = {};
        for (const s of log.symptoms) map[s.name] = s.severity;
        setSevByName(map);
        setNote(log.note ?? '');
      } else {
        setMood(null);
        setGate(null);
        setSevIdx(1);
        setCount(2);
        setSevByName({});
        setNote('');
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [dateKey]);

  const snap = SNAPS[sevIdx] ?? SNAPS[0];
  const waveColor = sampleSev(snap.p);

  const cycle = (name: string) => {
    setSevByName((prev) => {
      const next = nextSeverity(prev[name] ?? null);
      const m = { ...prev };
      if (next == null) delete m[name];
      else m[name] = next;
      return m;
    });
  };

  const commitCustom = async () => {
    const name = draft.trim();
    setDraft('');
    setAdding(false);
    if (!name) return;
    // Persist the new symptom so it appears on future days, then pre-select it.
    await repo.putSymptom({ id: crypto.randomUUID(), name, isPreset: false, archived: false });
    setSevByName((prev) => ({ ...prev, [name]: 'leve' }));
  };

  const handleSave = async () => {
    if (mood == null || gate == null) return;
    const hadSymptoms = gate === 'sim';
    const log: DayLog = {
      date: dateKey,
      mood,
      overallSeverity: hadSymptoms ? baseSev(snap.p) : null,
      waveCount: hadSymptoms ? count : 0,
      symptoms: hadSymptoms
        ? symptoms.flatMap((s) => {
            const sev = sevByName[s.name];
            return sev ? [{ name: s.name, severity: sev }] : [];
          })
        : [],
      note: note.trim() ? note.trim() : undefined,
    };
    await repo.putDay(log);
    onSaved(hadSymptoms);
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: COLORS.paper,
        zIndex: 50,
        overflowY: 'auto',
      }}
    >
      <div style={{ padding: '54px 20px 40px', maxWidth: 480, margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 18,
          }}
        >
          <button onClick={onClose} aria-label="voltar" style={iconBtn}>
            <Icon name="chevL" size={22} color={COLORS.ink} />
          </button>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>
            {formatLongPt(dateKey)}
          </div>
          <div style={{ width: 44 }} />
        </div>

        {!loaded ? null : (
          <>
            {/* (1) Mood */}
            <div
              style={{
                background: COLORS.accentSoft,
                border: `1.5px solid ${COLORS.line}`,
                borderRadius: 20,
                padding: 18,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 18,
                  fontWeight: 600,
                  textAlign: 'center',
                  marginBottom: 16,
                }}
              >
                {dateKey === localDayKey() ? 'Como você passou hoje?' : 'Como foi esse dia?'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 18 }}>
                {MOOD_OPTIONS.map(([m, lbl]) => {
                  const on = mood === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setMood(m)}
                      aria-pressed={on}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                        padding: 0,
                      }}
                    >
                      <span
                        style={{
                          width: 58,
                          height: 58,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: on ? COLORS.accent : 'transparent',
                          border: on ? 'none' : `2px solid ${COLORS.line}`,
                          transition: 'all .15s',
                        }}
                      >
                        <HFace mood={m} size={38} color={on ? COLORS.onAccent : COLORS.soft} />
                      </span>
                      <span
                        style={{
                          fontSize: 11.5,
                          color: on ? COLORS.ink : COLORS.faint,
                          fontWeight: on ? 700 : 500,
                        }}
                      >
                        {lbl}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* (2) Gate */}
            {mood && (
              <div style={{ animation: 'fadeIn .2s' }}>
                <H>Teve algo para anotar?</H>
                <div style={{ display: 'flex', gap: 10, marginBottom: gate ? 20 : 8 }}>
                  {(
                    [
                      ['nao', 'não, tranquilo'],
                      ['sim', 'sim, tive sintomas'],
                    ] as ReadonlyArray<[Gate, string]>
                  ).map(([g, lbl]) => {
                    const on = gate === g;
                    return (
                      <button
                        key={g}
                        onClick={() => setGate(g)}
                        aria-pressed={on}
                        style={{
                          flex: 1,
                          textAlign: 'center',
                          padding: '14px 8px',
                          borderRadius: 14,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sans)',
                          fontSize: 15,
                          fontWeight: on ? 700 : 500,
                          background: on
                            ? g === 'sim'
                              ? COLORS.accentSoft
                              : COLORS.accent
                            : COLORS.card,
                          color: on ? (g === 'sim' ? COLORS.accent : COLORS.onAccent) : COLORS.soft,
                          border:
                            on && g === 'sim'
                              ? `2px solid ${COLORS.accent}`
                              : `1.5px solid ${COLORS.line}`,
                        }}
                      >
                        {lbl}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* (3) Report */}
            {gate === 'sim' && (
              <div style={{ animation: 'fadeIn .25s' }}>
                <H style={{ marginBottom: 2 }}>As ondas de hoje</H>
                <div style={{ fontSize: 13, color: COLORS.faint, marginBottom: 12 }}>
                  a cor é a força · você desenha quantas
                </div>
                <div
                  style={{
                    background: COLORS.card,
                    border: `1.5px solid ${COLORS.line}`,
                    borderRadius: 20,
                    padding: 16,
                    marginBottom: 18,
                    boxShadow: `0 2px 0 ${COLORS.line}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      marginBottom: 14,
                    }}
                  >
                    <span style={{ fontSize: 13.5, color: COLORS.soft }}>intensidade</span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{snap.label}</span>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <IntensitySlider index={sevIdx} onChange={setSevIdx} />
                  </div>
                  <div style={{ borderTop: `1.5px dashed ${COLORS.line}`, paddingTop: 15 }}>
                    <WaveCounter count={count} onChange={setCount} color={waveColor} />
                  </div>
                </div>

                <H>Sintomas</H>
                <div
                  style={{
                    background: COLORS.card,
                    border: `1.5px solid ${COLORS.line}`,
                    borderRadius: 20,
                    padding: 6,
                    marginBottom: 14,
                    boxShadow: `0 2px 0 ${COLORS.line}`,
                  }}
                >
                  {symptoms.map((s, i) => (
                    <div
                      key={s.id}
                      style={{
                        borderBottom:
                          i < symptoms.length - 1 ? `1.5px solid ${COLORS.line}` : 'none',
                      }}
                    >
                      <SymptomRow
                        name={s.name}
                        severity={sevByName[s.name] ?? null}
                        onCycle={() => cycle(s.name)}
                      />
                    </div>
                  ))}
                </div>

                {adding ? (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                    <input
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void commitCustom();
                      }}
                      placeholder="novo sintoma…"
                      style={{
                        flex: 1,
                        padding: '13px 15px',
                        borderRadius: 14,
                        border: `1.5px solid ${COLORS.accent}`,
                        fontFamily: 'var(--font-sans)',
                        fontSize: 15,
                        background: COLORS.card,
                        color: COLORS.ink,
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => void commitCustom()}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        border: 'none',
                        background: COLORS.accent,
                        color: COLORS.onAccent,
                        fontSize: 16,
                        fontFamily: 'var(--font-sans)',
                        cursor: 'pointer',
                      }}
                    >
                      ok
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAdding(true)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '13px 16px',
                      borderRadius: 14,
                      border: `1.5px dashed ${COLORS.line}`,
                      color: COLORS.soft,
                      marginBottom: 18,
                      background: 'transparent',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    <Icon name="plus" size={18} color={COLORS.soft} />
                    <span style={{ fontSize: 14.5 }}>adicionar outro sintoma</span>
                  </button>
                )}
              </div>
            )}

            {/* (4) Note */}
            {mood && (
              <div style={{ marginBottom: 18 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '13px 15px',
                    borderRadius: 14,
                    border: `1.5px solid ${COLORS.line}`,
                    background: COLORS.card,
                  }}
                >
                  <Icon name="pencil" size={17} color={COLORS.soft} />
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="uma nota do dia (opcional)"
                    rows={note ? 3 : 1}
                    style={{
                      flex: 1,
                      border: 'none',
                      outline: 'none',
                      resize: 'none',
                      background: 'transparent',
                      fontFamily: 'var(--font-sans)',
                      fontSize: 14.5,
                      color: COLORS.ink,
                      lineHeight: 1.5,
                    }}
                  />
                </div>
              </div>
            )}

            {/* (5) Save */}
            {gate && (
              <Btn primary onClick={() => void handleSave()}>
                {gate === 'sim' ? 'guardar o dia' : 'guardar — foi um bom dia'}
                <Icon name="check" size={18} color={COLORS.onAccent} strokeWidth={2.6} />
              </Btn>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const iconBtn: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: '50%',
  border: `1.5px solid ${COLORS.line}`,
  background: COLORS.card,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};
