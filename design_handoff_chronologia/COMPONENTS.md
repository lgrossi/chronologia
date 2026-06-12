# Component specs — Chronologia

Exact specs for the bespoke and shared components. Values are the literal ones used in the prototype. Port the bespoke SVG components (`HWave`, `HFace`) faithfully — they are the brand.

---

## HWave — the severity "wave" glyph  ⟿
The signature mark. A smooth horizontal squiggle; **color encodes intensity, repeat-count encodes episode frequency.** From `hf-shell.jsx`.

**Props:** `color` (hex), `count` (how many glyphs, 1–6), `h` (height, default 18), `w` (single-glyph width, default 32), `sw` (stroke width, default 3), `gap` (px between repeats, default 3), `amp` (wave amplitude, defaults to `h*0.34`).

**Geometry:** one glyph is an SVG path of 4 quadratic segments alternating up/down across width `w`, vertically centered, `stroke-linecap: round`, no fill. Render `count` copies in an inline flex row with `gap`.

```jsx
// path for one glyph (viewBox 0 0 w+4 h), mid = h/2, seg = w/4, dir alternates -1/+1
let d = `M2 ${mid}`;
for (let i=0;i<4;i++){ const x0=2+i*seg, dir=i%2===0?-1:1;
  d += ` Q ${x0+seg/2} ${mid+dir*amp} ${x0+seg} ${mid}`; }
```
**Color rule:** in the register slider the color is *interpolated* between severity inks (see IntensitySlider). Everywhere else it's a fixed `severity.{leve|moderado|grave}`.

---

## HFace — mood face
Three states. From `hf-shell.jsx`.

**Props:** `mood` ('bom' | 'neutro' | 'ruim'), `size` (default 40), `color`, `sw` (stroke, default 2.2).

**Geometry (viewBox 0 0 30 30):** circle cx15 cy15 r13.5 (stroke = color, no fill); two eye dots at (10.5,12) & (19.5,12), radius `sw*0.62`; mouth path by mood:
- bom: `M9 16 Q15 22 21 16` (smile)
- neutro: `M9.5 17.5 H20.5` (flat)
- ruim: `M9 19 Q15 13 21 19` (frown)

When "selected", it sits on an accent-filled circle and `color` flips to `accent.on`.

---

## Icon
Inline line-icon set (stroke 2, round caps, viewBox 0 0 24 24). Names used: `home, list, trend, user, plus, bell, chevL, chevR, pencil, check, drop, cal, flask, spark`. Swap for **Lucide** equivalents in production (home, list, trending-up, user, plus, bell, chevron-left/right, pencil, check, droplet, calendar, flask-conical, sparkles).

---

## Card
`background: card (#FBF7EC)`, `border: 1.5px solid line (#E3DAC6)`, `border-radius: 20px`, `box-shadow: 0 2px 0 #E3DAC6` (the solid edge — do not replace with a blurred shadow), `padding: 16–20px`. An **accent variant** (starter card) uses `background: accent`, `box-shadow: elevated`, text in `accent.on`.

## Btn
Full-width, `border-radius: 16px`, `padding: 16px`, `font: Hanken 700/16`, flex-center with 9px gap, `white-space: nowrap`.
- **Primary:** `background: accent`, `color: accent.on`, `box-shadow: 0 8px 18px -8px rgba(63,90,67,.53)`. Disabled → `background: ink.faint`, no shadow.
- **Secondary:** `background: card`, `color: ink`, `border: 1.5px solid line`, no shadow.

## SevDots — severity indicator / picker
Three circles (size 16) in a row, gap 5. The active severity's circle is filled with its ink and bordered same; the others are transparent with a `2px #CFC7B6` border. Used read-only (day detail) and as a tap target (symptom rows cycle through it).

## IntensitySlider (register)
A custom 5-stop slider. Track: a 7px-tall bar with `linear-gradient(90deg, leve, moderado, grave)`, rounded. Five tap targets at 0/25/50/75/100%. The selected stop renders a 24px knob: `background: card`, `border: 3px solid {interpolatedColor}`, subtle drop shadow; unselected stops render an 11px hollow dot (`card` fill, `2px faint` border). Labels under the track: leve / moderado / grave. The five stop labels are: `leve`, `leve a moderado`, `moderado`, `moderado a grave`, `grave`.

**Color interpolation** (so in-between days read correctly): linear-interpolate RGB leve→moderado for p∈[0,.5], moderado→grave for p∈[.5,1]. The interpolated color drives both the knob border and the `HWave` color in the counter below.
```
RGB: leve [63,109,176], moderado [224,137,43], grave [138,78,162]
```

## WaveCounter (register)
Row: `−` step button | centered `HWave(count, interpolatedColor)` | `+` step button. Count clamps 1–6. Caption below: "{count} onda(s) hoje". Step buttons: 40×40, radius 12; `+` is accent-filled, `−` is card with `2px line` border.

## SymptomRow (register)
`[checkbox] label …………… [SevDots | "tocar"]`. Tapping anywhere cycles none→leve→moderado→grave→none. Checkbox: 23×23, radius 8; checked = accent fill + white check. Rows separated by `1.5px solid line`, inside a Card with `padding: 6` (rows pad 12). Preset symptoms: **diarreia, pontadas, gases, cansaço, intestino ativo, náusea**. "adicionar outro sintoma" is a dashed-border row that becomes an inline input (commit on Enter/ok → appended, pre-selected at leve).

## TabBar
Fixed bottom, `background: card`, `border-top: 1.5px solid line`, `box-shadow: 0 -8px 24px -16px rgba(40,30,20,.3)`, `padding: 12px 14px 24px` (last value = safe-area). Five slots: Hoje, Linha, **FAB**, Tendências, Perfil. Inactive = `ink.faint`; active = `accent` (icon stroke thicker + label 700). **FAB:** 54×54, `border-radius: 18` (squircle), `background: accent`, `3px solid card` ring, `margin-top: -30` (floats above bar), `box-shadow: fab`. FAB opens **Adicionar evento**.

## DayDetail (bottom sheet)
Scrim `rgba(40,32,22,.4)` (tap to close) + panel anchored bottom: `background: paper`, `border-radius: 26px 26px 0 0`, `padding: 12px 22px 40px`, `max-height: 78%`, scrollable, `box-shadow: sheet`, `animation: slideUp .25s`. Drag handle (40×5, `line`, centered). Header: date (display 24/700) + weekday; mood circle if logged. Body: infusion banner (accent-soft) if event; wave + count; symptom rows with SevDots; italic note with left rule; "fechar" secondary button.

## Toast
Absolute, bottom 104px, centered. `background: ink`, `color: accent.on`, `padding: 12px 20px`, `radius: 14`, check icon + message, `box-shadow: toast`, `white-space: nowrap`. Auto-dismiss 2200ms.

## ProportionBar (Tendências)
Single rounded bar (height 26, radius 9, `1.5px line` border) split by flex-grow into three muted segments: `well.bom #9CB79A` / `well.mid #E7CFA0` / `well.ruim #D9B2AE`. Legend row below: "{n} bons / {n} +/− / {n} difíceis".

## CycleCurve (Tendências)
Small inline SVG (viewBox 0 0 300 60): a baseline, a soft area+line in `moderado` (low after infusion, rising toward the next dose), and a hollow ring marker at the infusion point. Caption axis: infusão · dia 14 · próxima dose. Accompanied by a plain-language sentence — the calm, non-alarming framing is the point.
