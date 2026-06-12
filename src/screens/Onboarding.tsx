/**
 * Onboarding — the first-run walkthrough (gated by Profile.onboarded === false).
 *
 * A gentle multi-step intro that collects the essentials (name, optional email,
 * condition + since-year, an optional continuous treatment, and a daily
 * reminder) and writes them through `repo` on finish. Full-screen, paper bg,
 * centered ≤480px column — it owns the whole viewport with no shell chrome.
 *
 * Chrome stays on-brand: paper/card surfaces, the single Floresta-green accent
 * for the progress bar and primary CTA, display/sans fonts, gentle pt-BR copy.
 * Severity inks are SACRED and never appear here.
 *
 * On finish (handleFinish): persists the profile with onboarded:true, optionally
 * creates one medication, persists reminder settings, and best-effort requests
 * notification permission, then calls props.onDone(). Arming the reminder is owned
 * by main.tsx's liveQuery subscription, which re-arms on every putReminders with
 * the correct isTodayLogged hook — handleFinish must not arm directly. The
 * liveQuery profile in App flips the app into the normal shell automatically.
 */
import { useState, type CSSProperties, type ReactNode } from 'react';
import { COLORS } from '@/theme/tokens';
import { repo } from '@/data/repo';
import { requestNotificationPermission } from '@/lib/reminders';
import { Card } from '@/components/Card';
import { Btn } from '@/components/Btn';
import { Icon } from '@/components/Icon';
import { HFace } from '@/components/HFace';

export interface OnboardingProps {
  /** Onboarding finished and persisted; the gate should release. */
  onDone: () => void;
}

const STEP_COUNT = 6;

/** Lightweight email sanity check — only used when an address is provided. */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

const inputStyle: CSSProperties = {
  width: '100%',
  background: COLORS.card,
  border: `1.5px solid ${COLORS.line}`,
  borderRadius: 14,
  padding: '12px 14px',
  fontSize: 16,
  color: COLORS.ink,
  outline: 'none',
  minHeight: 44,
  boxSizing: 'border-box',
};

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.soft, marginBottom: 6 }}>
      {children}
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 12.5, color: COLORS.faint, marginTop: 6, lineHeight: 1.45 }}>
      {children}
    </div>
  );
}

/** Step heading — display font, matches the in-app section headings. */
function StepTitle({ children }: { children: ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: 22,
        fontWeight: 700,
        color: COLORS.ink,
        margin: '0 0 8px',
        lineHeight: 1.25,
      }}
    >
      {children}
    </h2>
  );
}

function StepLead({ children }: { children: ReactNode }) {
  return (
    <p style={{ fontSize: 15, color: COLORS.soft, margin: '0 0 20px', lineHeight: 1.55 }}>
      {children}
    </p>
  );
}

/** Slim accent progress bar. Communicates position without severity inks. */
function Progress({ step }: { step: number }) {
  const pct = ((step + 1) / STEP_COUNT) * 100;
  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={STEP_COUNT}
      aria-valuenow={step + 1}
      style={{
        width: '100%',
        height: 4,
        borderRadius: 999,
        background: COLORS.lineSoft,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: COLORS.accent,
          borderRadius: 999,
          transition: 'width .28s ease',
        }}
      />
    </div>
  );
}

/** Back chevron, shown on every step after the first. */
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="voltar"
      style={{
        width: 44,
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        margin: '0 -10px',
        color: COLORS.soft,
      }}
    >
      <Icon name="chevL" size={24} color={COLORS.soft} />
    </button>
  );
}

export function Onboarding({ onDone }: OnboardingProps) {
  const [step, setStep] = useState(0);

  // Step 2 — identity.
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Step 3 — about.
  const [condition, setCondition] = useState('Crohn');
  const [sinceYear, setSinceYear] = useState(String(new Date().getFullYear()));

  // Step 4 — optional continuous treatment.
  const [medName, setMedName] = useState('');
  const [medWeeks, setMedWeeks] = useState('8');

  // Step 5 — daily reminder.
  const [reminderOn, setReminderOn] = useState(true);
  const [reminderTime, setReminderTime] = useState('21:00');

  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState(false);

  const trimmedName = name.trim();
  const emailValid = email.trim() === '' || looksLikeEmail(email);
  const currentYear = new Date().getFullYear();

  const next = () => setStep((s) => Math.min(STEP_COUNT - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const handleFinish = async () => {
    if (finishing) return;
    setFinishing(true);
    setFinishError(false);

    try {
      await repo.putProfile({
        name: trimmedName,
        email: email.trim() || undefined,
        condition: condition.trim() || 'Crohn',
        sinceYear: Number(sinceYear),
        onboarded: true,
      });

      if (medName.trim()) {
        const weeks = Math.max(1, Math.round(Number(medWeeks) || 1));
        await repo.putMedication({
          id: crypto.randomUUID(),
          name: medName.trim(),
          intervalDays: weeks * 7,
        });
      }

      // Persisting reminder settings re-arms the foreground nudge via main.tsx's
      // liveQuery subscription (with the correct isTodayLogged hook). We only
      // request OS permission here so the prompt stays tied to enabling it.
      await repo.putReminders({ dailyEnabled: reminderOn, dailyTime: reminderTime });

      if (reminderOn) {
        // Best-effort: a denied prompt still leaves the in-app nudge working.
        await requestNotificationPermission();
      }

      onDone();
    } catch {
      // IndexedDB can fail (quota, private mode) — surface a gentle retry rather
      // than leaving the button disabled forever.
      setFinishError(true);
      setFinishing(false);
    }
  };

  // Year options: current year back to 1970, newest first.
  const yearOptions: number[] = [];
  for (let y = currentYear; y >= 1970; y--) yearOptions.push(y);

  return (
    <div
      className="safe-top safe-bottom safe-x"
      style={{
        minHeight: '100dvh',
        background: COLORS.paper,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px var(--screen-px) 24px',
          boxSizing: 'border-box',
        }}
      >
        {/* Top row: back affordance (after step 1) + progress bar. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          {step > 0 ? <BackButton onClick={back} /> : <div style={{ width: 24, height: 44 }} />}
          <Progress step={step} />
        </div>

        {/* Body — re-keyed per step so fadeIn replays on each transition. */}
        <div
          key={step}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            animation: 'fadeIn .28s ease',
          }}
        >
          {step === 0 && <WelcomeStep onStart={next} />}

          {step === 1 && (
            <div>
              <StepTitle>Como você gostaria de ser chamado(a)?</StepTitle>
              <StepLead>É só pra deixar o seu diário mais pessoal.</StepLead>

              <div style={{ marginBottom: 16 }}>
                <FieldLabel>Seu nome</FieldLabel>
                <input
                  style={inputStyle}
                  autoFocus
                  placeholder="ex.: Marina"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <FieldLabel>Seu e-mail (opcional)</FieldLabel>
                <input
                  type="email"
                  style={{
                    ...inputStyle,
                    borderColor: emailValid ? COLORS.line : COLORS.soft,
                  }}
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {emailValid ? (
                  <Hint>Guardamos só no seu aparelho. Vai servir pra backup e sincronizar mais pra frente — ainda não tem conta.</Hint>
                ) : (
                  <Hint>Esse e-mail parece incompleto. Você pode corrigir ou deixar em branco.</Hint>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <StepTitle>Sobre você</StepTitle>
              <StepLead>Isso ajuda a dar contexto ao que você registrar.</StepLead>

              <div style={{ marginBottom: 16 }}>
                <FieldLabel>Condição</FieldLabel>
                <input
                  style={inputStyle}
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                />
              </div>

              <div>
                <FieldLabel>Convivendo desde</FieldLabel>
                <select
                  style={{ ...inputStyle, appearance: 'none' }}
                  value={sinceYear}
                  onChange={(e) => setSinceYear(e.target.value)}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <StepTitle>Faz algum tratamento contínuo?</StepTitle>
              <StepLead>
                Se você usa um medicamento de rotina, posso acompanhar o intervalo das doses. Sem
                pressa — dá pra adicionar depois.
              </StepLead>

              <div style={{ marginBottom: 16 }}>
                <FieldLabel>Nome do medicamento</FieldLabel>
                <input
                  style={inputStyle}
                  placeholder="ex.: Infliximabe"
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                />
              </div>

              <div>
                <FieldLabel>A cada (semanas)</FieldLabel>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  style={inputStyle}
                  value={medWeeks}
                  onChange={(e) => setMedWeeks(e.target.value)}
                  onBlur={(e) => {
                    // Coerce an empty/invalid field back to an explicit value so
                    // the persisted interval always reflects what the user sees.
                    const n = Math.round(Number(e.target.value));
                    setMedWeeks(Number.isFinite(n) && n >= 1 ? String(n) : '8');
                  }}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <StepTitle>Quer um lembrete diário pra registrar?</StepTitle>
              <StepLead>Um toque gentil no fim do dia, no horário que você preferir.</StepLead>

              <button
                type="button"
                role="switch"
                aria-checked={reminderOn}
                aria-label="Lembrete diário"
                onClick={() => setReminderOn((v) => !v)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  background: COLORS.card,
                  border: `1.5px solid ${COLORS.line}`,
                  borderRadius: 14,
                  padding: '12px 14px',
                  minHeight: 44,
                  cursor: 'pointer',
                  marginBottom: 16,
                }}
              >
                <span style={{ fontSize: 15.5, color: COLORS.ink }}>Lembrete diário</span>
                <span
                  style={{
                    width: 46,
                    height: 28,
                    borderRadius: 999,
                    background: reminderOn ? COLORS.accent : COLORS.line,
                    display: 'flex',
                    alignItems: 'center',
                    padding: 3,
                    transition: 'background .15s',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: COLORS.onAccent,
                      transform: reminderOn ? 'translateX(18px)' : 'none',
                      transition: 'transform .15s',
                    }}
                  />
                </span>
              </button>

              {reminderOn && (
                <div>
                  <FieldLabel>Horário</FieldLabel>
                  <input
                    type="time"
                    style={inputStyle}
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                  />
                  <Hint>
                    Na web os lembretes são na medida do possível — funcionam melhor com o app aberto
                    ou instalado.
                  </Hint>
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <DoneStep name={trimmedName} />
          )}
        </div>

        {/* Footer CTA — step 0 and 5 own their own primary button. */}
        {step >= 1 && step <= 4 && (
          <div style={{ marginTop: 24 }}>
            {step === 3 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Btn primary onClick={next} disabled={!medName.trim()}>
                  continuar
                </Btn>
                <Btn
                  onClick={() => {
                    setMedName('');
                    next();
                  }}
                >
                  pular
                </Btn>
              </div>
            ) : (
              <Btn
                primary
                onClick={next}
                disabled={step === 1 && (!trimmedName || !emailValid)}
              >
                continuar
              </Btn>
            )}
          </div>
        )}

        {step === 5 && (
          <div style={{ marginTop: 24 }}>
            <Btn primary onClick={handleFinish} disabled={finishing}>
              abrir meu diário
            </Btn>
            {finishError && (
              <div
                style={{
                  fontSize: 13,
                  color: COLORS.soft,
                  textAlign: 'center',
                  marginTop: 12,
                  lineHeight: 1.45,
                }}
              >
                Não consegui salvar agora. Toque novamente para tentar de novo.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- step 1 -------------------------------- */

function WelcomeStep({ onStart }: { onStart: () => void }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <Card
          accent
          pad={0}
          style={{
            width: 96,
            height: 96,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <HFace mood="bom" size={56} color={COLORS.onAccent} variant="soft" />
        </Card>
      </div>

      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 34,
          fontWeight: 800,
          color: COLORS.accent,
          letterSpacing: '-0.01em',
          marginBottom: 12,
        }}
      >
        Chronologia
      </div>
      <p
        style={{
          fontSize: 16,
          color: COLORS.soft,
          lineHeight: 1.55,
          margin: '0 auto 28px',
          maxWidth: 320,
        }}
      >
        Um diário tranquilo para acompanhar o seu dia a dia.
      </p>

      <Btn primary onClick={onStart}>
        começar
      </Btn>
    </div>
  );
}

/* ------------------------------- step 6 -------------------------------- */

function DoneStep({ name }: { name: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: '50%',
            background: COLORS.accentSoft,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="check" size={40} color={COLORS.accent} />
        </div>
      </div>

      <StepTitle>Tudo pronto{name ? `, ${name}` : ''}!</StepTitle>
      <p style={{ fontSize: 15, color: COLORS.soft, lineHeight: 1.55, margin: '0 auto', maxWidth: 320 }}>
        No seu ritmo. Registre quando quiser — cada dia conta a sua história.
      </p>
    </div>
  );
}
