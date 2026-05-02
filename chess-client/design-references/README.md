# SnapFen Design References

These files are the **visual source of truth** for the SnapFen UI. Open each HTML file in a browser to see exactly how the corresponding page should look. When implementing a page, treat the matching HTML as the design spec — match the spacing, gradients, colors, glows, and component structure exactly. Use the build instructions in this README, not the inline styles in the HTML, for the actual implementation approach.

## Files

| File | Page | Notes |
|---|---|---|
| `home.html` | Home / dashboard | Two-column layout: play chess (left) + scan board (right) |
| `game-playing.html` | Live game board | Chat panel, resign/draw/abort, active timer is glowing blue |
| `game-analyzing.html` | Analysis board | Eval bar, engine lines, move-quality dots, blunder annotation |

## Design Tokens

These should be added to `chess-client/src/index.css` as CSS variables and configured in Tailwind v4 (via `@theme`).

### Backgrounds
| Token | Value | Usage |
|---|---|---|
| `--bg-base` | `#07091a` | Page background (deepest navy) |
| `--bg-mid` | `#0a1027` | Mid stop in radial gradient |
| `--bg-elevated` | `#131c3d` | Top-left light stop in radial gradient |
| `--bg-panel` | `rgba(255,255,255,0.025)` | Default panel/card surface |
| `--bg-panel-hover` | `rgba(255,255,255,0.04)` | Hover state for panels |
| `--bg-board` | `#1a1f3a` | Board/canvas background fallback |

The page uses `background: radial-gradient(ellipse at top left, #131c3d 0%, #0a1027 45%, #07091a 100%)` plus two radial glows positioned absolutely (purple top-right, blue mid-left).

### Brand
| Token | Value | Usage |
|---|---|---|
| `--brand-blue` | `#5b8def` | Primary brand blue |
| `--brand-purple` | `#a374f0` | Primary brand purple |
| `--brand-gradient` | `linear-gradient(135deg, #5b8def, #a374f0)` | Logo wordmark, primary buttons, avatar |

### Text
| Token | Value | Usage |
|---|---|---|
| `--text-primary` | `#fff` | Headings, primary content |
| `--text-secondary` | `#c9d1e2` | Body text, labels |
| `--text-tertiary` | `#8892a8` | Subtle text, metadata |
| `--text-muted` | `#6b7488` | Muted/inactive (e.g. inactive timer) |

### Borders
| Token | Value | Usage |
|---|---|---|
| `--border-subtle` | `rgba(255,255,255,0.06)` | Default panel border |
| `--border-default` | `rgba(255,255,255,0.07)` | Slightly emphasized |
| `--border-strong` | `rgba(255,255,255,0.1)` | Hover/emphasis |
| `--border-brand` | `rgba(91,141,239,0.35)` | Brand-tinted border (active states) |

### Semantic
| Token | Value | Usage |
|---|---|---|
| `--accent-success` | `#1d9e75` | Online status, good moves |
| `--accent-warning` | `#ef9f27` | Inaccuracy, GM badge |
| `--accent-mistake` | `#d85a30` | Mistake severity |
| `--accent-danger` | `#e24b4a` | Blunder, resign button |
| `--accent-info` | `#5b8def` | Info, current move |

### Board colors (wood theme)
- Light squares: `#e8d5b7`
- Dark squares: `#7a5a3a`
- Last-move highlight: `rgba(91, 141, 239, 0.5)` light / `rgba(91, 141, 239, 0.35)` dark

### Spacing & shape
- Card border radius: `10px` (most panels), `12px` (hero cards), `14px` (modals)
- Pill border radius: `999px`
- Border width: `0.5px` everywhere (intentional — thinner than default)
- Standard panel padding: `12px 14px` (compact), `16px 18px` (hero), `22px 24px` (modal)

### Typography
- Font family: system stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`)
- Mono: monospace stack (used for timers, FEN, move notation, eval scores)
- Weight: only `400` (regular) and `500` (medium) — never bolder
- Heading sizes: `19px` (h2), `15px` (h3), `13px` (label-bold)
- Body sizes: `12px–14px` for most UI, `11px` for metadata, `10px` for tiny labels (uppercase + 0.4-0.6px letter-spacing)

### Effects
- **Glow on active timer**: `box-shadow: 0 0 18px rgba(91,141,239,0.35)` + brand gradient background
- **Glow on status dots**: `box-shadow: 0 0 8px <color, 0.6 alpha>`
- **Modal backdrop**: `background: rgba(7,9,26,0.75); backdrop-filter: blur(8px);`
- **Modal panel**: gradient background `linear-gradient(135deg, #131c3d 0%, #0a1027 100%)` + `box-shadow: 0 12px 48px rgba(0,0,0,0.5), 0 0 60px rgba(91,141,239,0.1)`

## Reusable Components (build these first)

Before building pages, extract these into `src/components/ui/`:

1. **`<Logo />`** — SVG knight icon + gradient "SnapFen" wordmark
2. **`<Avatar initial size />`** — gradient-filled circle with letter
3. **`<StatusPill icon label color />`** — rounded pill with optional glowing dot (used for "Rated · 5+0 Blitz", "Analyzing · Stockfish 16", "1,247 players online")
4. **`<Panel padding>{children}</Panel>`** — standard `bg-panel` + `border-default` + `radius-lg` card
5. **`<SegmentedRow />`** — flex row with vertical dividers between flex-1 children (used for Play a friend / Play computer, Black's view / Side to move, stats row)
6. **`<Toggle checked onChange />`** — pill-shaped switch
7. **`<IconButton icon variant="default|brand|danger" />`** — used for nav controls and action buttons
8. **`<Modal open onClose>{children}</Modal>`** — backdrop blur + gradient panel

## Page-specific Notes

### `home.html`
- The "Play online" hero card has a special radial glow in its top-right corner — preserve that
- The "SIGNATURE FEATURE" tag has a subtle gradient background and gradient-tinted text
- Drag-drop area has THREE layered effects: faint chessboard pattern (8% opacity SVG pattern), two radial color glows in opposite corners, and a glowing gradient cloud icon. All three matter.
- Time control pills: 5 options shown, only one is "selected" (filled with brand-blue tint + border)

### `game-playing.html`
- **Critical**: the active player's timer has gradient fill + glow; opponent's timer is muted gray. This is the ONLY indicator of whose turn it is — do not add "Your turn" text.
- Resign button is danger-tinted (red-ish), Draw and Abort are neutral
- Chat panel has emoji quick-reactions in its header (👍 😂 😱 🔥) and a borderless input at the bottom
- Settings is a button (not always-visible options) that opens the modal at the bottom

### `game-analyzing.html`
- Eval bar is on the LEFT of the board, NOT inside the right column
- Eval number sits above the bar, "EVAL" vertical label below
- Engine Lines panel has its own gradient (purple-blue tinted) — different from other panels
- Move history dots: green = good, amber = inaccuracy, orange = mistake, red = blunder
- The "Blunder" annotation row appears below move history when a flagged move is selected
- Bottom-right of footer has a tiny color legend

## Implementation Approach for Claude Code

When building each page:

1. Use **Tailwind v4 utility classes** wherever possible, NOT inline styles. Inline styles in the HTML are for browser-render fidelity only.
2. Add the design tokens above to `index.css` as CSS variables, then expose them to Tailwind via `@theme { --color-bg-base: var(--bg-base); ... }`.
3. Build the shared UI components first, then compose pages from them.
4. The chess board itself should use **chessground** (already installed) — match the wood theme via custom chessground CSS overrides, not by writing your own SVG board. The SVG board in the HTML is a visual placeholder ONLY.
5. The chess pieces shown in the HTML are Unicode entities for portability — chessground will render real chess pieces; do not try to replicate the Unicode rendering.
6. Wire up real state: `useChessGame` hook for game state, `useAuthStore` for user info. Mock data (Magnus_C, ratings, chat messages) should be replaced with real props/state.
7. Routing: `/` = home, `/play/:roomId` = game-playing mode, `/analyze/:gameId` = game-analyzing mode. Same `<GameBoard>` component handles both via a `mode` prop.

## What NOT to Change

- Color values, gradient stops, glow blur radii — these were tuned and look right
- Border widths (0.5px is intentional)
- Font weight choices (400/500 only — never 600+)
- The active-timer-as-turn-indicator pattern (no extra "Your turn" badge)
- The two-mode-one-component architecture for the game board
