/**
 * Resumo — a calm, print-friendly doctor summary for one month. This is the
 * '/resumo' export route: the patient opens it, taps "Imprimir / salvar PDF",
 * and the browser's print-to-PDF yields a clean A4 document (no PDF library).
 *
 * Month comes from the URL query (?month=YYYY-MM); absent or malformed, it
 * defaults to the current month. Everything below the header is real data read
 * through the reactive hooks — proportion, cycle insight, top symptoms, and a
 * day-by-day table of logged days with infusion events folded in by date.
 */
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Btn } from '@/components/Btn';
import { Icon } from '@/components/Icon';
import { HFace } from '@/components/HFace';
import { SevDots } from '@/components/SevDots';
import { COLORS, WELLBEING } from '@/theme/tokens';
import { repo } from '@/data/repo';
import {
  useDaysInRange,
  useEventsInRange,
  useMedications,
  useProfile,
} from '@/data/hooks';
import {
  addDays,
  localDayKey,
  monthEndKey,
  monthNamePt,
  monthStartKey,
  parseDayKey,
} from '@/lib/date';
import {
  cycleCurveSeries,
  cycleStatus,
  monthRollup,
  topSymptoms,
} from '@/lib/selectors';
import type { DayLog, HealthEvent } from '@/lib/types';

/**
 * Resolve the anchor day-key from ?month=YYYY-MM. Falls back to the current
 * month when absent or malformed, so the route is always renderable.
 */
function resolveAnchor(month: string | null): string {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split('-').map(Number);
    if (m >= 1 && m <= 12) return localDayKey(new Date(y, m - 1, 1));
  }
  return localDayKey();
}

const MOOD_LABEL = { bom: 'bem', neutro: 'mais ou menos', ruim: 'difícil' } as const;

/** Short table date, e.g. 'qua, 10/06'. */
function tableDate(key: string): string {
  return format(parseDayKey(key), 'EEEEEE, dd/MM', { locale: ptBR });
}

interface DayRow {
  key: string;
  log: DayLog | null;
  infusion: HealthEvent | null;
}

export function Resumo() {
  const [params] = useSearchParams();
  const anchor = resolveAnchor(params.get('month'));
  const from = monthStartKey(anchor);
  const to = monthEndKey(anchor);
  const year = parseDayKey(anchor).getFullYear();

  const days = useDaysInRange(from, to);
  const events = useEventsInRange(from, to);
  const profile = useProfile();
  const meds = useMedications();

  const med = meds[0] ?? null;
  // Most recent infusion within the month anchors the cycle insight.
  const infusions = events.filter((e) => e.type === 'infusao');
  const inMonthInfusion = infusions.length ? infusions[infusions.length - 1] : null;

  // The 8-week (56-day) cycle routinely spans two calendar months, so when no
  // infusion falls in the printed month, reach back for the cycle that was
  // already running when the month began (mirrors Tendencias' anchor logic) —
  // otherwise the headline doctor handout shows no cycle reading.
  const [priorInfusion, setPriorInfusion] = useState<HealthEvent | null>(null);
  useEffect(() => {
    if (inMonthInfusion) {
      setPriorInfusion(null);
      return;
    }
    let alive = true;
    void (async () => {
      const before = addDays(from, -1);
      const all = await repo.listEvents(addDays(from, -400), before);
      const past = all.filter((e) => e.type === 'infusao');
      const latest = past.length ? past.reduce((a, b) => (a.date > b.date ? a : b)) : null;
      if (alive) setPriorInfusion(latest);
    })();
    return () => {
      alive = false;
    };
  }, [inMonthInfusion, from]);

  const lastInfusion = inMonthInfusion ?? priorInfusion;

  const roll = monthRollup(days);
  const total = roll.bom + roll.mid + roll.ruim;
  const top = topSymptoms(days, 6);
  const status = cycleStatus(to, lastInfusion, med);
  const curve = cycleCurveSeries(days, lastInfusion, med);

  // Cycle insight sentence: the highest-severity logged day and where in the
  // cycle it landed — the calm, doctor-facing framing.
  const peak = curve.reduce<{ dayN: number; severity: number } | null>(
    (acc, p) => (acc && acc.severity >= p.severity ? acc : p),
    null,
  );

  // Day rows: every day in the month that has a log OR an infusion event.
  const logByKey = new Map(days.map((d) => [d.date, d]));
  const infusionByKey = new Map<string, HealthEvent>();
  for (const e of infusions) infusionByKey.set(e.date, e);
  const rows: DayRow[] = [];
  for (let k = from; k <= to; k = addDays(k, 1)) {
    const log = logByKey.get(k) ?? null;
    const infusion = infusionByKey.get(k) ?? null;
    if (log || infusion) rows.push({ key: k, log, infusion });
  }

  const patientLine = [
    profile.name,
    profile.condition,
    med ? med.name : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="resumo-page" style={styles.page}>
      <style>{PRINT_CSS}</style>

      {/* Action bar — hidden in print. */}
      <div className="resumo-actions" style={styles.actions}>
        <Link to="/tendencias" style={styles.back}>
          <Icon name="chevL" size={18} color={COLORS.soft} />
          <span>voltar</span>
        </Link>
        <div style={{ width: 220 }}>
          <Btn primary onClick={() => window.print()}>
            <Icon name="list" size={18} color={COLORS.onAccent} />
            Imprimir / salvar PDF
          </Btn>
        </div>
      </div>

      <article className="resumo-doc" style={styles.doc}>
        <header style={styles.header}>
          <div style={styles.wordmark}>Chronologia</div>
          <h1 style={styles.title}>
            Resumo — <span style={{ textTransform: 'capitalize' }}>{monthNamePt(anchor)}</span> {year}
          </h1>
          <div style={styles.patient}>{patientLine}</div>
        </header>

        {/* Proportion of the month. */}
        <section style={styles.section}>
          <h2 style={styles.h2}>O mês em proporção</h2>
          {total > 0 ? (
            <>
              <div style={styles.bar}>
                <div style={{ flex: roll.bom || 0.0001, background: WELLBEING.bom }} />
                <div style={{ flex: roll.mid || 0.0001, background: WELLBEING.mid }} />
                <div style={{ flex: roll.ruim || 0.0001, background: WELLBEING.ruim }} />
              </div>
              <div style={styles.legend}>
                <span><b style={{ color: COLORS.ink }}>{roll.bom}</b> bons</span>
                <span><b style={{ color: COLORS.ink }}>{roll.mid}</b> +/–</span>
                <span><b style={{ color: COLORS.ink }}>{roll.ruim}</b> difíceis</span>
                <span style={{ color: COLORS.faint }}>{total} dia(s) registrado(s)</span>
              </div>
            </>
          ) : (
            <p style={styles.empty}>Nenhum dia registrado neste mês.</p>
          )}
        </section>

        {/* Cycle insight. */}
        <section style={styles.section}>
          <h2 style={styles.h2}>Ao longo do ciclo</h2>
          <p style={styles.prose}>{cycleSentence(med, lastInfusion, status, peak)}</p>
        </section>

        {/* Top symptoms. */}
        <section style={styles.section}>
          <h2 style={styles.h2}>O que mais apareceu</h2>
          {top.length > 0 ? (
            <ul style={styles.symList}>
              {top.map((s) => (
                <li key={s.name} style={styles.symItem}>
                  <span>{s.name}</span>
                  <span style={{ color: COLORS.soft }}>{s.count} dia(s)</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={styles.empty}>Nenhum sintoma registrado neste mês.</p>
          )}
        </section>

        {/* Day-by-day table. */}
        <section style={styles.section}>
          <h2 style={styles.h2}>Dia a dia</h2>
          {rows.length > 0 ? (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Data</th>
                  <th style={styles.th}>Humor</th>
                  <th style={styles.th}>Intensidade</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Ondas</th>
                  <th style={styles.th}>Sintomas</th>
                  <th style={styles.th}>Nota</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ key, log, infusion }) => (
                  <tr
                    key={key}
                    style={infusion ? styles.rowInfusion : undefined}
                  >
                    <td style={styles.td}>
                      {tableDate(key)}
                      {infusion && <span style={styles.infusionTag}>infusão</span>}
                    </td>
                    <td style={styles.td}>
                      {log ? (
                        <span style={styles.moodCell}>
                          <HFace mood={log.mood} size={20} color={COLORS.soft} />
                          {MOOD_LABEL[log.mood]}
                        </span>
                      ) : (
                        <span style={{ color: COLORS.faint }}>—</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {log?.overallSeverity ? (
                        <SevDots sev={log.overallSeverity} size={12} />
                      ) : (
                        <span style={{ color: COLORS.faint }}>tranquilo</span>
                      )}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      {log && log.overallSeverity ? log.waveCount : <span style={{ color: COLORS.faint }}>—</span>}
                    </td>
                    <td style={styles.td}>
                      {log && log.symptoms.length > 0 ? (
                        log.symptoms.map((s) => `${s.name} (${s.severity})`).join(', ')
                      ) : (
                        <span style={{ color: COLORS.faint }}>—</span>
                      )}
                    </td>
                    <td style={{ ...styles.td, color: COLORS.soft }}>
                      {log?.note ? log.note : <span style={{ color: COLORS.faint }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={styles.empty}>Nenhum dia registrado neste mês.</p>
          )}
        </section>

        <footer style={styles.footer}>
          Chronologia · gerado em {format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </footer>
      </article>
    </div>
  );
}

/** Plain-language, non-alarming cycle framing for the doctor. */
function cycleSentence(
  med: ReturnType<typeof useMedications>[number] | null,
  lastInfusion: HealthEvent | null,
  status: ReturnType<typeof cycleStatus>,
  peak: { dayN: number; severity: number } | null,
): string {
  if (!med || !lastInfusion) {
    return 'Sem infusão registrada neste mês para acompanhar o ciclo.';
  }
  const where = status.overdue
    ? `A próxima dose já passou do prazo (ciclo de ${status.total} dias).`
    : `No fim do mês, estava no dia ${status.dayN} de ${status.total} do ciclo, faltando ${status.daysLeft} para a próxima dose.`;
  if (peak && peak.severity > 0) {
    return `${where} O desconforto mais forte apareceu por volta do dia ${peak.dayN} do ciclo — um bom assunto para a próxima consulta.`;
  }
  return `${where} O ciclo correu tranquilo, sem picos de desconforto registrados.`;
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: COLORS.paper,
    color: COLORS.ink,
    fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
    padding: '24px 20px 64px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  actions: {
    width: '100%',
    maxWidth: 760,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  back: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    color: COLORS.soft,
    textDecoration: 'none',
    fontSize: 15,
    minHeight: 44,
  },
  doc: {
    width: '100%',
    maxWidth: 760,
    background: '#FFFFFF',
    border: `1.5px solid ${COLORS.line}`,
    borderRadius: 14,
    padding: '40px 44px',
    boxShadow: '0 2px 0 #E3DAC6',
  },
  header: {
    borderBottom: `2px solid ${COLORS.line}`,
    paddingBottom: 18,
    marginBottom: 24,
  },
  wordmark: {
    fontFamily: "'Schibsted Grotesk', system-ui, sans-serif",
    fontSize: 14,
    fontWeight: 600,
    color: COLORS.accent,
    marginBottom: 6,
  },
  title: {
    fontFamily: "'Schibsted Grotesk', system-ui, sans-serif",
    fontSize: 28,
    fontWeight: 700,
    margin: 0,
    lineHeight: 1.2,
  },
  patient: {
    fontSize: 15,
    color: COLORS.soft,
    marginTop: 8,
  },
  section: {
    marginBottom: 26,
  },
  h2: {
    fontFamily: "'Schibsted Grotesk', system-ui, sans-serif",
    fontSize: 16,
    fontWeight: 600,
    margin: '0 0 12px',
    color: COLORS.ink,
  },
  bar: {
    display: 'flex',
    height: 24,
    borderRadius: 8,
    overflow: 'hidden',
    border: `1.5px solid ${COLORS.line}`,
  },
  legend: {
    display: 'flex',
    gap: 18,
    flexWrap: 'wrap',
    marginTop: 10,
    fontSize: 13.5,
    color: COLORS.soft,
  },
  prose: {
    fontSize: 14.5,
    lineHeight: 1.5,
    color: COLORS.soft,
    margin: 0,
  },
  empty: {
    fontSize: 14,
    color: COLORS.faint,
    fontStyle: 'italic',
    margin: 0,
  },
  symList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  symItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 14.5,
    borderBottom: `1px solid ${COLORS.lineSoft}`,
    paddingBottom: 7,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  th: {
    textAlign: 'left',
    fontWeight: 700,
    color: COLORS.soft,
    borderBottom: `2px solid ${COLORS.line}`,
    padding: '8px 10px',
    whiteSpace: 'nowrap',
  },
  td: {
    borderBottom: `1px solid ${COLORS.lineSoft}`,
    padding: '8px 10px',
    verticalAlign: 'top',
  },
  rowInfusion: {
    background: COLORS.accentSoft,
  },
  moodCell: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
  infusionTag: {
    display: 'inline-block',
    marginLeft: 8,
    fontSize: 11,
    fontWeight: 700,
    color: COLORS.accent,
  },
  footer: {
    marginTop: 28,
    paddingTop: 16,
    borderTop: `1px solid ${COLORS.lineSoft}`,
    fontSize: 12,
    color: COLORS.faint,
    textAlign: 'center',
  },
};

/**
 * Print rules: drop the device chrome and the action bar, flatten the document
 * card to plain paper, and keep table rows from splitting across pages so the
 * PDF reads like a real clinical handout.
 */
const PRINT_CSS = `
@media print {
  @page { margin: 14mm; }
  body { background: #fff !important; }
  nav, .resumo-actions { display: none !important; }
  .resumo-page { padding: 0 !important; background: #fff !important; }
  .resumo-doc { box-shadow: none !important; border: none !important; border-radius: 0 !important; padding: 0 !important; max-width: none !important; }
  tr { break-inside: avoid; }
  section { break-inside: avoid; }
}
`;
