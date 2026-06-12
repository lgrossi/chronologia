/**
 * Perfil — the settings hub (SCREENS.md §6). Self-contained: reads everything
 * through the reactive hooks and writes through `repo`, so it never imports the
 * store. Each setting row opens a BottomSheet editor; Backup is the v1
 * durability story (export → JSON download, import → JSON file → repo.importAll).
 */
import { useRef, useState, type ReactNode } from 'react';
import {
  useEventsInRange,
  useMedications,
  useProfile,
  useReminders,
  useSymptoms,
} from '@/data/hooks';
import { repo } from '@/data/repo';
import type { Backup, HealthEvent, Medication, Profile, Symptom } from '@/lib/types';
import { localDayKey, formatLongPt } from '@/lib/date';
import { COLORS } from '@/theme/tokens';
import { Icon, type IconName } from '@/components/Icon';
import { Card } from '@/components/Card';
import { Btn } from '@/components/Btn';
import { BottomSheet } from '@/components/BottomSheet';

/** Which editor sheet is open, or null. */
type Sheet = 'meds' | 'reminders' | 'symptoms' | 'docs' | 'account' | 'backup' | null;

/** Wide window so "Exames e documentos" counts attachments across all history. */
const RANGE_FROM = '2000-01-01';
const RANGE_TO = '2100-12-31';

const EVENT_LABELS: Record<HealthEvent['type'], string> = {
  infusao: 'Infusão',
  exame: 'Exame',
  consulta: 'Consulta',
  remedio: 'Remédio novo',
  resultado: 'Resultado',
  outro: 'Outro',
};

export function Perfil() {
  const profile = useProfile();
  const meds = useMedications();
  const reminders = useReminders();
  const symptoms = useSymptoms();
  const events = useEventsInRange(RANGE_FROM, RANGE_TO);

  const [sheet, setSheet] = useState<Sheet>(null);
  const close = () => setSheet(null);

  const withAttachments = events.filter((e) => (e.attachments?.length ?? 0) > 0);
  const customCount = symptoms.filter((s) => !s.isPreset && !s.archived).length;
  const presetCount = symptoms.filter((s) => s.isPreset && !s.archived).length;

  const primaryMed = meds[0];
  const medSub = primaryMed
    ? `${primaryMed.name} · a cada ${weeksLabel(primaryMed.intervalDays)}`
    : 'nenhum medicamento';

  const initial = (profile.name.trim()[0] ?? 'A').toUpperCase();

  const rows: Array<{ key: Sheet; icon: IconName; title: string; sub: string }> = [
    { key: 'meds', icon: 'drop', title: 'Meus medicamentos', sub: medSub },
    {
      key: 'reminders',
      icon: 'bell',
      title: 'Lembretes',
      sub: reminders.dailyEnabled ? `Diário às ${reminders.dailyTime}` : 'desativado',
    },
    {
      key: 'symptoms',
      icon: 'list',
      title: 'Meus sintomas',
      sub: `${presetCount} predefinidos${customCount ? ` + ${customCount} personalizados` : ''}`,
    },
    {
      key: 'docs',
      icon: 'flask',
      title: 'Exames e documentos',
      sub: `${withAttachments.length} ${withAttachments.length === 1 ? 'anexo' : 'anexos'}`,
    },
    { key: 'account', icon: 'user', title: 'Conta', sub: profile.email ?? 'sem e-mail' },
    { key: 'backup', icon: 'spark', title: 'Backup', sub: 'exportar ou importar seus dados' },
  ];

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Centered identity header */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: 8,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: '50%',
            background: COLORS.accentSoft,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display, "Schibsted Grotesk", sans-serif)',
              fontSize: 30,
              fontWeight: 700,
              color: COLORS.accent,
            }}
          >
            {initial}
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font-display, "Schibsted Grotesk", sans-serif)', fontSize: 22, fontWeight: 700, color: COLORS.ink }}>
          {profile.name}
        </div>
        <div style={{ fontSize: 14, color: COLORS.soft }}>
          {profile.condition} · desde {profile.sinceYear}
        </div>
      </div>

      {/* Setting rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((r) => (
          <Card key={r.title} pad={0} onClick={() => setSheet(r.key)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
              <IconChip name={r.icon} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15.5, fontWeight: 600, color: COLORS.ink }}>{r.title}</div>
                <div
                  style={{
                    fontSize: 13,
                    color: COLORS.soft,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {r.sub}
                </div>
              </div>
              <Icon name="chevR" size={18} color={COLORS.faint} />
            </div>
          </Card>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 26, fontSize: 13, color: COLORS.faint }}>
        Chronologia · v0.1
      </div>

      <BottomSheet open={sheet === 'meds'} onClose={close}>
        <MedsEditor meds={meds} onClose={close} />
      </BottomSheet>
      <BottomSheet open={sheet === 'reminders'} onClose={close}>
        <RemindersEditor reminders={reminders} onClose={close} />
      </BottomSheet>
      <BottomSheet open={sheet === 'symptoms'} onClose={close}>
        <SymptomsEditor symptoms={symptoms} />
      </BottomSheet>
      <BottomSheet open={sheet === 'docs'} onClose={close}>
        <DocsViewer events={withAttachments} />
      </BottomSheet>
      <BottomSheet open={sheet === 'account'} onClose={close}>
        <AccountEditor profile={profile} onClose={close} />
      </BottomSheet>
      <BottomSheet open={sheet === 'backup'} onClose={close}>
        <BackupPanel />
      </BottomSheet>
    </div>
  );
}

/* ----------------------------- shared bits ------------------------------ */

function weeksLabel(intervalDays: number): string {
  const weeks = Math.round(intervalDays / 7);
  return weeks === 1 ? '1 semana' : `${weeks} semanas`;
}

function IconChip({ name }: { name: IconName }) {
  return (
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: 11,
        background: COLORS.accentSoft,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon name={name} size={19} color={COLORS.accent} />
    </div>
  );
}

function SheetTitle({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-display, "Schibsted Grotesk", sans-serif)',
        fontSize: 18,
        fontWeight: 700,
        color: COLORS.ink,
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.soft, marginBottom: 6 }}>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  background: COLORS.card,
  border: `1.5px solid ${COLORS.line}`,
  borderRadius: 14,
  padding: '12px 14px',
  fontSize: 15.5,
  color: COLORS.ink,
  outline: 'none',
  minHeight: 44,
  boxSizing: 'border-box' as const,
};

/* ----------------------------- medications ------------------------------ */

function MedsEditor({ meds, onClose }: { meds: Medication[]; onClose: () => void }) {
  const [drafts, setDrafts] = useState<Record<string, { name: string; weeks: string }>>(() =>
    Object.fromEntries(
      meds.map((m) => [m.id, { name: m.name, weeks: String(Math.round(m.intervalDays / 7)) }]),
    ),
  );

  const save = async (m: Medication) => {
    const d = drafts[m.id];
    if (!d) return;
    const weeks = Math.max(1, Math.round(Number(d.weeks) || 1));
    await repo.putMedication({ ...m, name: d.name.trim() || m.name, intervalDays: weeks * 7 });
    onClose();
  };

  return (
    <div>
      <SheetTitle>Meus medicamentos</SheetTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {meds.length === 0 && (
          <div style={{ fontSize: 14, color: COLORS.soft }}>Nenhum medicamento cadastrado.</div>
        )}
        {meds.map((m) => {
          const d = drafts[m.id] ?? { name: m.name, weeks: String(Math.round(m.intervalDays / 7)) };
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <FieldLabel>Nome</FieldLabel>
                <input
                  style={inputStyle}
                  value={d.name}
                  onChange={(e) =>
                    setDrafts((p) => ({ ...p, [m.id]: { ...d, name: e.target.value } }))
                  }
                />
              </div>
              <div>
                <FieldLabel>Intervalo (semanas)</FieldLabel>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  style={inputStyle}
                  value={d.weeks}
                  onChange={(e) =>
                    setDrafts((p) => ({ ...p, [m.id]: { ...d, weeks: e.target.value } }))
                  }
                />
              </div>
              <Btn primary onClick={() => save(m)}>
                <Icon name="check" size={18} color={COLORS.onAccent} />
                guardar
              </Btn>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------ reminders ------------------------------- */

function RemindersEditor({
  reminders,
  onClose,
}: {
  reminders: { dailyEnabled: boolean; dailyTime: string };
  onClose: () => void;
}) {
  const [enabled, setEnabled] = useState(reminders.dailyEnabled);
  const [time, setTime] = useState(reminders.dailyTime);

  const save = async () => {
    await repo.putReminders({ dailyEnabled: enabled, dailyTime: time });
    onClose();
  };

  return (
    <div>
      <SheetTitle>Lembretes</SheetTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <button
          type="button"
          onClick={() => setEnabled((v) => !v)}
          style={{
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
          }}
        >
          <span style={{ fontSize: 15.5, color: COLORS.ink }}>Lembrete diário</span>
          <span
            style={{
              width: 46,
              height: 28,
              borderRadius: 999,
              background: enabled ? COLORS.accent : COLORS.line,
              display: 'flex',
              alignItems: 'center',
              padding: 3,
              transition: 'background .15s',
            }}
          >
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: COLORS.onAccent,
                transform: enabled ? 'translateX(18px)' : 'none',
                transition: 'transform .15s',
              }}
            />
          </span>
        </button>

        {enabled && (
          <div>
            <FieldLabel>Horário</FieldLabel>
            <input
              type="time"
              style={inputStyle}
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        )}

        <Btn primary onClick={save}>
          <Icon name="check" size={18} color={COLORS.onAccent} />
          guardar
        </Btn>
      </div>
    </div>
  );
}

/* ------------------------------- symptoms ------------------------------- */

function SymptomsEditor({ symptoms }: { symptoms: Symptom[] }) {
  const [newName, setNewName] = useState('');
  const active = symptoms.filter((s) => !s.archived);

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    const id = `custom-${Date.now()}`;
    await repo.putSymptom({ id, name, isPreset: false, archived: false });
    setNewName('');
  };

  const archive = async (s: Symptom) => {
    await repo.putSymptom({ ...s, archived: true });
  };

  return (
    <div>
      <SheetTitle>Meus sintomas</SheetTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
        {active.map((s) => (
          <div
            key={s.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: COLORS.card,
              border: `1.5px solid ${COLORS.line}`,
              borderRadius: 14,
              padding: '10px 14px',
              minHeight: 44,
            }}
          >
            <span style={{ flex: 1, fontSize: 15, color: COLORS.ink }}>{s.name}</span>
            {s.isPreset ? (
              <span style={{ fontSize: 12, color: COLORS.faint }}>predefinido</span>
            ) : (
              <button
                type="button"
                onClick={() => archive(s)}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: COLORS.accent,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px 4px',
                }}
              >
                arquivar
              </button>
            )}
          </div>
        ))}
      </div>

      <FieldLabel>Adicionar sintoma</FieldLabel>
      <div style={{ display: 'flex', gap: 10 }}>
        <input
          style={inputStyle}
          placeholder="ex.: dor nas juntas"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add();
          }}
        />
        <Btn
          primary
          onClick={add}
          disabled={!newName.trim()}
          style={{ width: 'auto', padding: '0 18px' }}
        >
          <Icon name="plus" size={18} color={COLORS.onAccent} />
        </Btn>
      </div>
    </div>
  );
}

/* --------------------------- exams & documents -------------------------- */

function DocsViewer({ events }: { events: HealthEvent[] }) {
  const remove = async (id: string) => {
    await repo.deleteEvent(id);
  };

  return (
    <div>
      <SheetTitle>Exames e documentos</SheetTitle>
      {events.length === 0 ? (
        <div style={{ fontSize: 14, color: COLORS.soft }}>Nenhum anexo ainda.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {events.map((e) => (
            <div
              key={e.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: COLORS.card,
                border: `1.5px solid ${COLORS.line}`,
                borderRadius: 14,
                padding: '12px 14px',
                minHeight: 44,
              }}
            >
              <IconChip name="flask" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.ink }}>
                  {EVENT_LABELS[e.type]}
                </div>
                <div style={{ fontSize: 13, color: COLORS.soft }}>{formatLongPt(e.date)}</div>
              </div>
              <button
                type="button"
                onClick={() => remove(e.id)}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: COLORS.accent,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px 4px',
                }}
              >
                remover
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------- account ------------------------------- */

function AccountEditor({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email ?? '');
  const [since, setSince] = useState(String(profile.sinceYear));

  const save = async () => {
    const year = Math.round(Number(since) || profile.sinceYear);
    await repo.putProfile({
      ...profile,
      name: name.trim() || profile.name,
      email: email.trim() || undefined,
      sinceYear: year,
    });
    onClose();
  };

  return (
    <div>
      <SheetTitle>Conta</SheetTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <FieldLabel>Nome</FieldLabel>
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <FieldLabel>E-mail</FieldLabel>
          <input
            type="email"
            style={inputStyle}
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <FieldLabel>Desde (ano)</FieldLabel>
          <input
            type="number"
            inputMode="numeric"
            style={inputStyle}
            value={since}
            onChange={(e) => setSince(e.target.value)}
          />
        </div>
        <Btn primary onClick={save}>
          <Icon name="check" size={18} color={COLORS.onAccent} />
          guardar
        </Btn>
      </div>
    </div>
  );
}

/* -------------------------------- backup -------------------------------- */

function BackupPanel() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  const exportData = async () => {
    const backup = await repo.exportAll();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chronologia-backup-${localDayKey()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus('Backup exportado.');
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-importing the same file
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Backup;
      await repo.importAll(parsed);
      setStatus('Dados importados.');
    } catch {
      setStatus('Arquivo inválido — não foi possível importar.');
    }
  };

  return (
    <div>
      <SheetTitle>Backup</SheetTitle>
      <p style={{ fontSize: 14, color: COLORS.soft, marginBottom: 18, lineHeight: 1.5 }}>
        Tudo fica no seu aparelho. Exporte um arquivo para guardar em segurança ou importe um backup
        anterior.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Btn primary onClick={exportData}>
          <Icon name="check" size={18} color={COLORS.onAccent} />
          exportar meus dados
        </Btn>
        <Btn onClick={() => fileInput.current?.click()}>
          <Icon name="list" size={18} color={COLORS.ink} />
          importar de um arquivo
        </Btn>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={onPickFile}
        />
      </div>
      {status && (
        <div style={{ marginTop: 14, fontSize: 13.5, color: COLORS.accent, textAlign: 'center' }}>
          {status}
        </div>
      )}
    </div>
  );
}
