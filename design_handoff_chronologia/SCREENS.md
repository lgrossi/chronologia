# Screen specs — Chronologia

Per-screen layout, content, and behavior. Copy is final pt-BR. Screen horizontal padding is **20px**; content sits between the status bar (top ~54px) and the bottom tab bar (~96px clearance). Mobile-first; on wider viewports, center the column at a comfortable max-width (~420–480px) or expand to a two-pane layout for Linha/Tendências if desired.

---

## 1. Hoje (Home) — `proto-hoje.jsx`
**Purpose:** orient and invite today's log in one glance.

**Layout (vertical stack, 16px gaps):**
1. **Header row** — left: wordmark "Chronologia" (display 16/600, **accent**), "Bom dia, Ana" (display 30/700), "domingo · 10 junho" (sans 14.5, soft). Right: 44px circular avatar "A" (card bg, line border).
2. **Yesterday recap** — small HFace(bom, 22, soft) + "Ontem foi um dia **bom** · leve" (sans 14, soft; the day word bold ink).
3. **Primary card — two states:**
   - *Not logged yet:* **accent starter card** (bg accent, shadow elevated). 52px paper circle holding HFace(bom, accent) + "Vamos registrar o seu dia?" (display 21/600, accent.on). Below, a full-width button styled **inverted** (bg `accent.on`, text accent): "registrar hoje ›". Tapping → opens **Registro**.
   - *Logged:* a normal Card (tappable → reopens Registro to edit). Row: 46px accent-soft circle with HFace(mood) + "Dia registrado ✓" (display 17/700) + subline ("{count}× {sev}" or "dia tranquilo") + pencil icon. If symptoms: a divider then symptom chips (dot in severity color + name).
4. **Infusion card** — header "ciclo da infusão" (drop icon in `grave`) + "Infliximabe" (faint). "dia 6" (display 30/700) + "· faltam 22 p/ a próxima". Progress track (height 9, `line` bg) filled 21% in `severity.leve`.
5. **Week strip** — label row "esta semana" + "ver tudo ›" link (accent → opens Linha). Seven equal columns: a 42px cell (rounded 12) colored by that day's severity (or `card` if none); **today** gets a `2.5px accent` border. Day letter below (S T Q Q S S D), today bold ink.
6. **Reminder strip** — dashed-border row: bell icon + "Lembrete diário às 21h" + "editar" (accent).

---

## 2. Registro (overlay) — `proto-registro.jsx`
**Purpose:** the daily check-in. Progressive: a good day is ~1 second; symptoms only appear if there are any. **This is the most important screen.**

**Header:** back chevron (circular card button) · "domingo, 10 jun" (display 18/700) · (spacer).

**Flow, top to bottom:**
1. **Mood card** (always visible) — bg `accent.soft`, radius 20. "Como você passou hoje?" (display 18/600, centered). Three HFace options (size 38) with labels **bem / mais ou menos / difícil**. Selected = 58px accent-filled circle, face in accent.on, label bold ink. Picking a mood reveals step 2.
2. **Gate** (`{mood && …}`, fadeIn) — "Teve algo para anotar?" (display 17/600). Two buttons:
   - **"não, tranquilo"** → when selected, accent-filled (collapses any report). Save button becomes *"guardar — foi um bom dia"*.
   - **"sim, tive sintomas"** → when selected, `accent.soft` bg + `2px accent` border. Reveals step 3.
3. **Report** (`{gate==='sim' && …}`, fadeIn):
   - **"As ondas de hoje"** (display 17/600) + hint "a cor é a força · você desenha quantas". Card containing the **IntensitySlider** (5 stops, gradient track, interpolating knob — see COMPONENTS) with the current stop label (e.g. "leve a moderado") top-right, then a dashed divider, then the **WaveCounter** (− / waves / +) and "{n} onda(s) hoje".
   - **"Sintomas"** (display 17/600). Card of **SymptomRow**s (diarreia, pontadas, gases, cansaço, intestino ativo, náusea) each cycling intensity; then a dashed **"adicionar outro sintoma"** row → inline input.
4. **Note** (`{mood && …}`) — card with pencil icon + textarea placeholder "uma nota do dia (opcional)" (grows to ~3 rows).
5. **Save** (`{gate && …}`) — primary Btn: "guardar o dia" (sim) / "guardar — foi um bom dia" (não), with check icon. On save → close overlay, return to Hoje (now in *logged* state), show toast.

---

## 3. Adicionar evento (overlay) — `proto-evento.jsx`
**Purpose:** log infusions, exams, appointments, etc. Opened by the **center FAB**.

**Header:** "cancelar" (soft) · "Novo evento" (display 18/700) · (spacer).
1. **"O que aconteceu?"** — wrap of type chips, each icon + label: **infusão**(drop, default-selected) · **exame**(flask) · **consulta**(user) · **remédio novo**(plus) · **resultado**(list) · **outro**(spark). Selected = accent fill / accent.on; else card bg / soft, `2px` border.
2. **"Quando"** — card row: calendar icon + "hoje · 10 jun 2026" + "alterar ›".
3. **Type-specific (infusão)** (fadeIn when type=infusão): "Detalhes da infusão" — medication row ("medicamento" → "Infliximabe ›"); reminder row with a checkbox "lembrar da próxima dose" + "em 8 semanas".
4. **Attachment** — dashed row: pencil icon + "anexar foto do exame ou uma nota".
5. **Save** — primary Btn "salvar evento" + check. → close + toast.

---

## 4. Linha do tempo — `proto-linha.jsx`
**Purpose:** browse history.

**Header row:** "Junho" (display 26/700) + a segmented **Calendário | Diário** toggle (selected segment accent-filled).
**Filter chips:** tudo · diarreia · pontadas · cansaço · infusão. Selected = `ink`-filled / accent.on; else transparent / soft with line border.

**Calendário view:** weekday header (S T Q Q S S D, faint). 7-col grid (gap 5), each day a square (aspect 1, radius 9): severity-colored fill (or card if none); **infusão** days get an `ink` border + a small ring marker bottom-right; day number top-left (white on colored, soft on empty). **Filtering dims** non-matching days to ~0.25 opacity. Selected day gets a `2.5px accent` outline. Below: a legend (leve/moderado/grave swatches + infusão ring). Tap a day → **DayDetail** sheet.

**Diário view:** vertical list of day cards (most recent first), each: left date block (display 22/700 + weekday), HWave(count) or "infusão", symptom/infusão tags, HFace at right. Infusão rows tinted `accent.soft`. Tap → DayDetail.

**DayDetail:** see COMPONENTS → DayDetail.

---

## 5. Tendências — `proto-tend.jsx`
**Purpose:** gentle monthly patterns, framed for a doctor. **Calm, not an anxiety nest** — positive lead, plain language, muted colors.

1. **Month nav** — ‹ / › circular buttons around month name (display 24/700, capitalized) + "2026" (faint). Clamped to available range; updates everything below. Subtitle "um olhar tranquilo sobre o mês".
2. **Lead card** (`accent.soft`) — "Mais dias tranquilos do que difíceis." (display 18/600) + **ProportionBar** + legend (n bons / n +/− / n difíceis).
3. **"Ao longo do ciclo"** card — **CycleCurve** SVG + axis labels (infusão · dia 14 · próxima dose) + plain sentence: "Os primeiros ~12 dias foram leves. O desconforto começou a voltar perto do **dia 21** — um bom assunto para a próxima consulta."
4. **"O que mais apareceu"** — top symptoms as horizontal bars (label · accent bar · "{n} dias"). Bars in `accent` at 0.85 opacity over `line.soft` track.
5. **Btn (secondary):** list icon + "levar um resumo p/ o médico".

---

## 6. Perfil — `proto-perfil.jsx`
**Purpose:** settings hub.

Centered header: 76px `accent.soft` avatar "A", "Ana" (display 22/700), "Crohn · desde 2021" (soft). Then a list of setting rows (card, icon-chip in accent-soft + title + subtitle + chevron): **Meus medicamentos** (Infliximabe · a cada 8 semanas) · **Lembretes** (Diário às 21h) · **Meus sintomas** (6 predefinidos + personalizados) · **Exames e documentos** (3 anexos) · **Conta** (ana@email.com). Footer: "Chronologia · v0.1" (faint, centered).

---

## Responsive notes
The prototype is a fixed 390×844 phone for demo. For production: build fluid mobile screens (full-width column, safe-area insets top/bottom), and on tablet/desktop either center the column (~max 480px) or split Linha (calendar + persistent detail pane) and Tendências (multi-column cards) into two-pane layouts. Keep min tap targets ≥ 44px. The bottom tab bar can become a left rail on desktop if you prefer.
