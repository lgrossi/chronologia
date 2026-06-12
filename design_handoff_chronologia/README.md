# Handoff: Chronologia — daily Crohn's tracker

## Overview
Chronologia is a calm, personal mobile app for tracking life with Crohn's disease day to day: a fast daily check-in (mood + symptom "waves" + symptoms), a unified timeline (calendar + diary), health events (infusions, exams), and gentle monthly trends framed for a doctor's visit. It is **responsive (mobile-first, works on desktop)** and the UI copy is **Brazilian Portuguese (pt-BR)**.

The design grew directly out of the user's paper notebook. Three things from that notebook are load-bearing and must survive implementation:
1. **Severity "waves"** (∿) colored by intensity — **blue = leve, orange = moderado, purple = grave**. The number of waves = how many episodes that day.
2. **Three mood faces** — bom / neutro / ruim.
3. **Per-symptom notes** with their own intensity.

## About the design files
The files in `prototype/` are **design references created in HTML/React-via-Babel** — they demonstrate the intended look, layout, and behavior. **They are not production code to ship.** Your task is to **recreate these designs in the target codebase**, using its established framework, component library, and conventions. If there is no codebase yet, a good default stack is **React + Vite + Tailwind CSS** (the provided `tailwind.config.js` is ready to drop in), or **React Native / Expo** if this is going native — the token files apply equally.

The prototype was authored as a single scaling phone frame for demo purposes. In a real app you do **not** need the device bezel / scaling wrapper (`Device`, `StatusBar`, `HomeIndicator` in `proto-core.jsx`) — those are prototype scaffolding. Build real screens with your router and safe-area handling instead.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, shadows, and interactions are final and intentional. Recreate the UI faithfully using your codebase's primitives. Exact values are in `design-tokens.json`, `tokens.css`, and `tailwind.config.js`. Detailed per-screen and per-component specs are in `SCREENS.md` and `COMPONENTS.md`.

## The visual system (read first)
- **Aesthetic:** "Caderno" — a warm paper diary. Cream surfaces, a slightly-lifted warm charcoal for text (`#3A352E`, never pure black), tactile cards whose "shadow" is a **solid 2px bottom edge** (`0 2px 0 #E3DAC6`), not a blur.
- **One accent only:** **Floresta green `#3F5A43`** carries every primary action — the starter card, the FAB, active nav, selected toggles, the wordmark. Don't introduce other UI accent colors.
- **Severity inks are sacred:** blue/orange/purple appear **only** to encode symptom intensity (waves, dots, calendar cells, charts). Never reuse them for buttons or chrome — that's what keeps the data legible.
- **Type:** *Schibsted Grotesk* for display/headings/numbers; *Hanken Grotesk* for everything else.
- **Tone of voice:** gentle, first-person-friendly, never clinical. "Vamos registrar o seu dia?", "foi um bom dia", "um olhar tranquilo sobre o mês". A good day must be loggable in ~1 second.

## Screens / Views
Full detail in **`SCREENS.md`**. Summary:

| Screen | Route idea | Purpose |
|---|---|---|
| **Hoje** (Home) | `/` | Greeting, yesterday recap, the daily-register entry point (or a "registered ✓" summary), infusion-cycle progress, week-in-color, reminder. |
| **Registro** (overlay) | `/registro` (modal) | The progressive daily check-in. Mood → "teve algo para anotar?" gate → (if yes) intensity slider + wave counter + symptom checklist + custom add → note → save. A "não" answer saves a good day immediately. |
| **Adicionar evento** (overlay) | `/evento` (modal) | Log infusion / exam / appointment / new med / result. Type chips, date, type-specific details (infusion → medication + next-dose reminder), attachment. |
| **Linha do tempo** | `/linha` | Calendar ⇄ Diary toggle, filter chips, colored month grid, tap a day → bottom-sheet day detail. |
| **Tendências** | `/tendencias` | Gentle monthly summary: good/so-so/hard proportion bar, infusion-cycle curve insight, top symptoms, month nav, "export for doctor". |
| **Perfil** | `/perfil` | Medications, reminders, custom symptoms, exam attachments, account. |

Global chrome: a **bottom tab bar** (Hoje · Linha · ⊕ FAB · Tendências · Perfil). The center **FAB opens "Adicionar evento."**

## Interactions & behavior
- **Progressive disclosure (Registro):** the gate and report blocks reveal with a `fadeIn .2s`. Picking **"não, tranquilo"** collapses the report and changes the save button to *"guardar — foi um bom dia"*. Picking **"sim, tive sintomas"** reveals the ondas + symptoms.
- **Intensity slider:** 5 snap positions (`leve`, `leve a moderado`, `moderado`, `moderado a grave`, `grave`). The knob border + the wave glyphs interpolate color between the three severity inks as you move. See `COMPONENTS.md → IntensitySlider`.
- **Wave counter:** −/+ stepper (1–6) controlling how many wave glyphs render; label updates "{n} onda(s) hoje".
- **Symptom rows:** tapping cycles intensity none → leve → moderado → grave → none (checkbox fills + 3-dot indicator updates).
- **Custom symptom:** "adicionar outro sintoma" swaps to an inline text input (Enter or "ok" commits, adds it to the list pre-selected at leve).
- **Day detail:** bottom sheet, `slideUp .25s`, dim scrim behind, drag-handle affordance, closes on scrim tap.
- **Toast:** after save, a charcoal toast ("Dia registrado" / "Bom dia registrado" / "Infusão adicionada") for 2200ms.
- **Calendar filter:** selecting a filter chip dims (opacity ~0.25) the days that don't match.
- **Tendências month nav:** ‹ › arrows move between months (clamped to available range); the proportion bar, curve, and symptom bars update.

## State management
Minimal client state (no backend in the prototype; wire to your API/store).

- `today: DayLog | null` — today's entry. `DayLog = { mood: 'bom'|'neutro'|'ruim', sev: 'leve'|'moderado'|'grave'|null, sevLabel?: string, count?: number, symptoms: {name, sev}[], note?: string }`. `sev: null` ⇒ a "tranquilo" day. Drives whether Hoje shows the green starter or the "registrado ✓" summary.
- `tab` — active bottom tab.
- `overlay` — `'registro' | 'evento' | null`.
- `filter` — active Linha filter chip.
- Registro-local: `mood`, `gate ('nao'|'sim'|null)`, `sevIdx (0–4)`, `count (1–6)`, `syms (map name→sev)`, `custom[]`, `note`.

The prototype persists `{today, tab}` to `localStorage` under `chronologia_proto_v1`. In production, replace with your data layer; a day log is keyed by date. Historical data (calendar/diary/trends) is seeded mock data in `proto-linha.jsx` / `proto-tend.jsx` — replace with real queries.

## Data model (suggested)
```ts
type Severity = 'leve' | 'moderado' | 'grave';
type Mood = 'bom' | 'neutro' | 'ruim';

interface SymptomEntry { name: string; severity: Severity; }
interface DayLog {
  date: string;            // ISO yyyy-mm-dd (one per day)
  mood: Mood;
  overallSeverity: Severity | null;  // null = tranquilo / no symptoms
  waveCount: number;       // 1–6 episodes; 0 when null
  symptoms: SymptomEntry[];
  note?: string;
}
interface HealthEvent {
  date: string;
  type: 'infusao' | 'exame' | 'consulta' | 'remedio' | 'resultado' | 'outro';
  medication?: string;     // for infusao
  remindNextDoseWeeks?: number;
  attachments?: string[];
  note?: string;
}
```

## Design tokens
See `design-tokens.json` (canonical), `tokens.css` (CSS vars), `tailwind.config.js` (Tailwind theme). Quick reference:
- **Surfaces:** paper `#F4EEE0`, card `#FBF7EC`
- **Text:** ink `#3A352E`, soft `#6F685B`, faint `#A79F8E`
- **Line:** `#E3DAC6`
- **Accent (Floresta):** `#3F5A43`, soft `#E5ECDF`, on-accent `#F4EEE0`
- **Severity:** leve `#3F6DB0`, moderado `#E0892B`, grave `#8A4EA2`
- **Radii:** cards 20px, buttons 16px, chips 11–14px, sheet 26px
- **Card shadow:** `0 2px 0 #E3DAC6` (solid edge — signature)
- **Fonts:** Schibsted Grotesk (display), Hanken Grotesk (sans)

## Assets
- **Fonts:** Schibsted Grotesk + Hanken Grotesk via Google Fonts (URL in `design-tokens.json`). Self-host for production.
- **Icons:** simple line icons, drawn inline as SVG paths in `hf-shell.jsx` → `Icon` (home, list, trend, user, plus, bell, chev, pencil, check, drop, cal, flask, spark). Replace with your icon set (Lucide is a near-match: home, list, trending-up, user, plus, bell, chevrons, pencil, check, droplet, calendar, flask-conical, sparkles).
- **Wave glyph & mood faces:** custom SVG generators in `hf-shell.jsx` (`HWave`, `HFace`). These are bespoke and central to the brand — port them faithfully (see `COMPONENTS.md`). No raster assets.
- **No logo file** yet; the wordmark is just "Chronologia" set in Schibsted Grotesk 600, accent color.

## Files
Reference prototype source (in `prototype/`):
- `Chronologia Prototype.html` — entry; mounts the app, holds top-level state/persistence.
- `hf-shell.jsx` — **severity palette, `HWave`, `HFace`, `Icon`** (the bespoke primitives — port these first).
- `proto-core.jsx` — Floresta theme object `FL`, device frame, `Screen`, `TabBar`, `Card`, `Btn`, `SevDots`, `Toast`.
- `proto-hoje.jsx` — Hoje screen.
- `proto-registro.jsx` — Registro flow (the most logic-heavy; intensity slider + symptom cycling live here).
- `proto-evento.jsx` — Adicionar evento.
- `proto-linha.jsx` — Calendar/diary + day-detail sheet + mock month data.
- `proto-tend.jsx` — Tendências + mock rollups.
- `proto-perfil.jsx` — Perfil.

> Note: the prototype shares components via `window.*` (a Babel-in-browser constraint). In your codebase use real imports/exports. The `FL` theme object should become your Tailwind theme / token import.

## Implementation order (suggested)
1. Port `HWave`, `HFace`, `Icon`, and the severity palette (`hf-shell.jsx`). Everything else depends on them.
2. Set up tokens (Tailwind config or CSS vars) + fonts.
3. Build shared primitives: `Card`, `Btn`, `SevDots`, `Toast`, bottom `TabBar`.
4. Hoje → Registro (the core loop) → wire `today` state.
5. Adicionar evento, Linha (calendar/diary + sheet), Tendências, Perfil.
6. Replace mock data with real persistence; add reminders/notifications.
