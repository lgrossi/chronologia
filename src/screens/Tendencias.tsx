/**
 * Tendências — a gentle monthly read of the diary, framed for a doctor.
 *
 * The whole point is calm: a positive lead, plain language, muted wellbeing
 * colors, and the SACRED severity ink (moderado) used only for the cycle curve
 * where it genuinely encodes discomfort. No alarm-red, no anxiety.
 *
 * Everything is derived from real data: monthRollup → ProportionBar,
 * cycleCurveSeries (anchored to the last infusion before month end) → CycleCurve,
 * topSymptoms → bars. The shown month is clamped to [earliest logged month,
 * current month]; nav arrows disable at the clamps.
 */
import { useEffect, useMemo, useState } from 'react';
import { Btn } from '@/components/Btn';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { repo } from '@/data/repo';
import { useDaysInRange, useEventsInRange, useMedications } from '@/data/hooks';
import {
  addDays,
  capitalize,
  daysInMonth,
  localDayKey,
  monthNamePt,
  monthStartKey,
  parseDayKey,
} from '@/lib/date';
import {
  cycleCurveSeries,
  monthRollup,
  topSymptoms,
  type CyclePoint,
} from '@/lib/selectors';
import type { HealthEvent } from '@/lib/types';
import { COLORS, SEV, WELLBEING } from '@/theme/tokens';

export interface TendenciasProps {
  /** Open the doctor-summary flow (a future export overlay). */
  onExport: () => void;
}

/** First day-key of the next calendar month after the month containing `key`. */
function nextMonthStartKey(key: string): string {
  const d = parseDayKey(key);
  return localDayKey(new Date(d.getFullYear(), d.getMonth() + 1, 1));
}

export function Tendencias({ onExport }: TendenciasProps) {
  const todayMonthStart = monthStartKey(localDayKey());
  const [monthStart, setMonthStart] = useState(todayMonthStart);

  // Earliest logged month, discovered once. Until known we clamp prev-nav to the
  // current month so the user can't wander into empty history.
  const [earliestMonth, setEarliestMonth] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void (async () => {
      // A generous historical window — five years back covers any real diary.
      const from = localDayKey(
        new Date(parseDayKey(todayMonthStart).getFullYear() - 5, 0, 1),
      );
      const to = addDays(nextMonthStartKey(todayMonthStart), -1);
      const [days, events] = await Promise.all([
        repo.daysInRange(from, to),
        repo.listEvents(from, to),
      ]);
      const keys = [...days.map((d) => d.date), ...events.map((e) => e.date)];
      if (!alive || keys.length === 0) return;
      const earliest = keys.reduce((a, b) => (a < b ? a : b));
      setEarliestMonth(monthStartKey(earliest));
    })();
    return () => {
      alive = false;
    };
  }, [todayMonthStart]);

  const monthEnd = addDays(nextMonthStartKey(monthStart), -1);
  const days = useDaysInRange(monthStart, monthEnd);
  const events = useEventsInRange(monthStart, monthEnd);
  const medications = useMedications();

  const atOldest = earliestMonth == null || monthStart <= earliestMonth;
  const atNewest = monthStart >= todayMonthStart;

  const goPrev = () => {
    if (atOldest) return;
    setMonthStart(monthStartKey(addDays(monthStart, -1)));
  };
  const goNext = () => {
    if (atNewest) return;
    setMonthStart(nextMonthStartKey(monthStart));
  };

  const roll = useMemo(() => monthRollup(days), [days]);
  const total = roll.bom + roll.mid + roll.ruim;
  const top = useMemo(() => topSymptoms(days), [days]);

  // Cycle curve: anchor on the most recent infusion AT OR BEFORE the month end,
  // so a cycle that began in a prior month still reads correctly this month.
  const med = medications[0] ?? null;
  const inMonthInfusion = useMemo(() => {
    const infusions = events.filter((e) => e.type === 'infusao');
    return infusions.length ? infusions[infusions.length - 1] : null;
  }, [events]);

  // Prefer an infusion logged this month; otherwise reach back for the cycle
  // that was already running when the month began (a cycle is 8 weeks, so it
  // routinely spans two calendar months).
  const [priorInfusion, setPriorInfusion] = useState<HealthEvent | null>(null);
  useEffect(() => {
    if (inMonthInfusion) {
      setPriorInfusion(null);
      return;
    }
    let alive = true;
    void (async () => {
      const from = addDays(monthStart, -400);
      const before = addDays(monthStart, -1);
      const all = await repo.listEvents(from, before);
      const infusions = all.filter((e) => e.type === 'infusao');
      const latest = infusions.length
        ? infusions.reduce((a, b) => (a.date > b.date ? a : b))
        : null;
      if (alive) setPriorInfusion(latest);
    })();
    return () => {
      alive = false;
    };
  }, [inMonthInfusion, monthStart]);

  const lastInfusion = inMonthInfusion ?? priorInfusion;

  const curve = useMemo(
    () => cycleCurveSeries(days, lastInfusion, med),
    [days, lastInfusion, med],
  );

  const monthName = capitalize(monthNamePt(monthStart));
  const year = monthStart.slice(0, 4);

  const empty = total === 0;
  const leadText = empty
    ? 'Ainda não há registros neste mês.'
    : roll.bom >= roll.ruim
      ? 'Mais dias tranquilos do que difíceis.'
      : 'Um mês mais desafiador — vale conversar na consulta.';

  return (
    <div className="flex flex-col">
      {/* Month nav */}
      <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
        <NavButton dir="chevL" disabled={atOldest} onClick={goPrev} />
        <div className="text-center">
          <div className="font-display" style={{ fontSize: 24, fontWeight: 700 }}>
            {monthName}
          </div>
          <div style={{ fontSize: 13, color: COLORS.faint }}>{year}</div>
        </div>
        <NavButton dir="chevR" disabled={atNewest} onClick={goNext} />
      </div>
      <div
        className="text-center"
        style={{ fontSize: 13.5, color: COLORS.faint, marginBottom: 18 }}
      >
        um olhar tranquilo sobre o mês
      </div>

      {/* Positive lead + proportion */}
      <Card
        pad={18}
        style={{ background: COLORS.accentSoft, marginBottom: 16, boxShadow: 'none' }}
      >
        <div
          className="font-display"
          style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.35, marginBottom: empty ? 0 : 14 }}
        >
          {leadText}
        </div>
        {!empty && (
          <>
            <div
              className="flex overflow-hidden"
              style={{ height: 26, borderRadius: 9, border: `1.5px solid ${COLORS.line}` }}
            >
              {roll.bom > 0 && <div style={{ flex: roll.bom, background: WELLBEING.bom }} />}
              {roll.mid > 0 && <div style={{ flex: roll.mid, background: WELLBEING.mid }} />}
              {roll.ruim > 0 && <div style={{ flex: roll.ruim, background: WELLBEING.ruim }} />}
            </div>
            <div
              className="flex justify-between"
              style={{ marginTop: 9, fontSize: 13, color: COLORS.soft }}
            >
              <span>
                <b style={{ color: COLORS.ink }}>{roll.bom}</b> bons
              </span>
              <span>
                <b style={{ color: COLORS.ink }}>{roll.mid}</b> +/–
              </span>
              <span>
                <b style={{ color: COLORS.ink }}>{roll.ruim}</b> difíceis
              </span>
            </div>
          </>
        )}
      </Card>

      {/* Cycle insight */}
      <SectionTitle>Ao longo do ciclo</SectionTitle>
      <Card pad={16} style={{ marginBottom: 16 }}>
        {curve.length > 0 && med ? (
          <>
            <CycleCurve series={curve} total={med.intervalDays} />
            <div
              className="flex justify-between"
              style={{ fontSize: 11, color: COLORS.faint, marginTop: 2, marginBottom: 11 }}
            >
              <span>infusão</span>
              <span>dia {Math.round(med.intervalDays / 2)}</span>
              <span>próxima dose</span>
            </div>
            <div style={{ fontSize: 14.5, color: COLORS.soft, lineHeight: 1.45 }}>
              <CycleSentence series={curve} total={med.intervalDays} />
            </div>
          </>
        ) : (
          <div style={{ fontSize: 14.5, color: COLORS.soft, lineHeight: 1.45 }}>
            Sem dados de ciclo para este mês. Registre uma infusão para acompanhar
            como o conforto se distribui ao longo das semanas.
          </div>
        )}
      </Card>

      {/* Top symptoms */}
      <SectionTitle>O que mais apareceu</SectionTitle>
      {top.length > 0 ? (
        <div className="flex flex-col" style={{ gap: 11, marginBottom: 18 }}>
          {top.map(({ name, count }) => (
            <div key={name} className="flex items-center" style={{ gap: 11 }}>
              <span style={{ fontSize: 14.5, width: 84 }}>{name}</span>
              <div
                className="overflow-hidden"
                style={{ flex: 1, height: 14, background: COLORS.lineSoft, borderRadius: 7 }}
              >
                <div
                  style={{
                    width: `${Math.min(100, (count / daysInMonth(monthStart)) * 100)}%`,
                    height: '100%',
                    background: COLORS.accent,
                    opacity: 0.85,
                    borderRadius: 7,
                  }}
                />
              </div>
              <span
                style={{ fontSize: 12.5, color: COLORS.soft, width: 46, textAlign: 'right' }}
              >
                {count} dias
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 14.5, color: COLORS.soft, marginBottom: 18 }}>
          Nenhum sintoma anotado neste mês.
        </div>
      )}

      <Btn onClick={onExport}>
        <Icon name="list" size={18} color={COLORS.ink} />
        levar um resumo p/ o médico
      </Btn>
    </div>
  );
}

function NavButton({
  dir,
  disabled,
  onClick,
}: {
  dir: 'chevL' | 'chevR';
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'chevL' ? 'mês anterior' : 'próximo mês'}
      className="flex items-center justify-center"
      style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        border: `1.5px solid ${COLORS.line}`,
        background: COLORS.card,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Icon name={dir} size={20} color={disabled ? COLORS.faint : COLORS.ink} />
    </button>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div
      className="font-display"
      style={{ fontSize: 16, fontWeight: 600, marginBottom: 11 }}
    >
      {children}
    </div>
  );
}

const VB_W = 300;
const VB_H = 60;
const BASELINE_Y = 52;
const TOP_Y = 8;

/** Map a cycle point to an SVG coordinate. severity 0..3 → high baseline..low top. */
function pointXY(p: CyclePoint, total: number): { x: number; y: number } {
  const x = 4 + (Math.min(p.dayN, total) / total) * (VB_W - 8);
  const y = BASELINE_Y - (p.severity / 3) * (BASELINE_Y - TOP_Y);
  return { x, y };
}

/**
 * CycleCurve — soft area + line in the moderado ink rising as discomfort returns
 * toward the next dose, with a hollow ring at the infusion (day 0). Built from
 * the real cycleCurveSeries; a single point still renders a flat marker.
 */
function CycleCurve({ series, total }: { series: CyclePoint[]; total: number }) {
  const pts = series.map((p) => pointXY(p, total));
  // Ensure the line starts at the infusion anchor on the left even if day 0
  // wasn't logged, so the hollow ring reads as the cycle origin.
  const first = pts[0];
  const linePts = first && first.x > 4 ? [{ x: 4, y: BASELINE_Y }, ...pts] : pts;

  const linePath = linePts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L ${linePts[linePts.length - 1].x.toFixed(1)} ${BASELINE_Y} L ${linePts[0].x.toFixed(1)} ${BASELINE_Y} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ display: 'block' }}>
      <line x1="0" y1={BASELINE_Y} x2={VB_W} y2={BASELINE_Y} stroke={COLORS.line} strokeWidth="1" />
      <path d={areaPath} fill={SEV.moderado} opacity="0.12" />
      <path
        d={linePath}
        fill="none"
        stroke={SEV.moderado}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="4" cy={BASELINE_Y} r="4.5" fill="none" stroke={COLORS.ink} strokeWidth="2" />
    </svg>
  );
}

/**
 * A calm, plain-language reading of where discomfort returns in the cycle —
 * derived from the series, never alarming. Looks for the first day-N where
 * severity reaches moderado (≥2); if it never does, says so reassuringly.
 */
function CycleSentence({ series, total }: { series: CyclePoint[]; total: number }) {
  const returnPoint = series.find((p) => p.severity >= 2);
  if (!returnPoint) {
    return (
      <>
        O conforto se manteve estável ao longo de todo o ciclo neste mês — um bom
        sinal.
      </>
    );
  }
  const settled = series.filter((p) => p.dayN < returnPoint.dayN && p.severity <= 1).length;
  const early = settled > 0 ? `Os primeiros ~${returnPoint.dayN} dias foram mais leves. ` : '';
  const lateWindow = returnPoint.dayN >= total * 0.6;
  return (
    <>
      {early}O desconforto começou a voltar perto do{' '}
      <b style={{ color: COLORS.ink }}>dia {returnPoint.dayN}</b>
      {lateWindow ? ', já próximo da próxima dose' : ''} — um bom assunto para a
      próxima consulta.
    </>
  );
}
