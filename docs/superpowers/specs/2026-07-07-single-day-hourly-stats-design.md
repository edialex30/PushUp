# Single-day hourly breakdown driven by chart selection

## Problem

The "Pe ore, fiecare zi" panel on the Statistici screen stacks every day's
hourly breakdown one under another, which gets crowded. We want to show only
one day's hourly breakdown at a time, switchable by tapping a bar in the
7-day chart above.

## Behavior

- On entering Statistici, the hourly panel shows only the current day
  (`state.today.date`).
- Tapping a bar in the 7-day chart selects that day; the hourly panel below
  switches to show that day's hourly breakdown.
- The selected day's bar is visually highlighted (brighter green) so it's
  clear which day is shown below.
- If the selected day has no saved sets, the panel shows that date's header
  with an empty message (`Nicio serie in aceasta zi.`).

## Implementation

Single file: `public/js/app.js` (plus minor CSS if needed).

**State**
- Module-level `selectedStatsDay` (`YYYY-MM-DD`), defaults to
  `state.today.date`.
- On refresh, keep the current selection if it's still within the 7-day
  window; otherwise reset to today.

**Rendering (`renderStats`)**
- Instead of mapping over all `hourlyStatsByDay` entries, render only the
  entry matching `selectedStatsDay`.
- Empty selected day: render the date header + empty message.

**Chart (`new Chart`)**
- `backgroundColor` becomes a per-bar array: selected day `#86efac`,
  others `#35c46a`.
- `options.onClick`: map clicked bar index -> `lastDays[index].date`, set
  `selectedStatsDay`, re-render.
- `onHover`: pointer cursor over bars.

## Out of scope

- No changes to `stats.js` aggregation logic.
- No persistence of the selected day across sessions.
