# MFGA — Make Fantasy Great Again Website — Build Prompt

## Overview

Build a fantasy football league website for a 14-team league. The site should feel like a real sports broadcast dashboard — dark theme, clean data presentation, and team identity throughout. Think ESPN meets a war-room tactical dashboard.

**Tech stack:** Static site (HTML, CSS, vanilla JS). All data lives in JSON files so it's easy to update manually or hook up to an API later. No backend required — this can be hosted on GitHub Pages or Netlify.

**Design direction:** Dark background (#0A0A0A), with a gold (#D4A017) accent color for the league brand. Each team page uses that team's own color scheme. Typography: `Barlow Condensed` for big numbers/headers, `Inter` for body text, `Space Grotesk` for stats/monospace data. Grid-heavy layout. Thin 1px borders (#1a1a1a) to separate sections. Think tactical/broadcast, not corporate.

---

## File Structure

```
/
├── index.html              (League home page)
├── team.html               (Template — loads team data dynamically from ?team=BOMB query param)
├── css/
│   └── style.css           (Global styles + league page + team page styles)
├── js/
│   ├── league.js           (League page logic — standings, matchups, charts)
│   ├── team.js             (Team page logic — roster, trade block, draft picks)
│   └── data.js             (Shared utilities — load JSON, format numbers, etc.)
├── data/
│   ├── league.json         (Standings, schedule, current week, playoff settings)
│   ├── teams.json          (All 14 teams — name, abbrev, division, colors, logo path, owner)
│   ├── rosters.json        (Player rosters for all 14 teams)
│   ├── matchups.json       (Weekly matchups and scores)
│   ├── trade-block.json    (Players listed for trade)
│   └── draft-picks.json    (Draft pick ownership for each team)
└── logos/                  (Team logo images — I'll provide these later)
    ├── BOMB.png
    ├── SRZ.png
    └── ... etc
```

---

## Data Schemas

### teams.json
```json
[
  {
    "id": "BOMB",
    "name": "Pakistan Bombers",
    "owner": "Lucas",
    "division": "East",
    "primaryColor": "#01411C",
    "secondaryColor": "#E8C547",
    "textColor": "#FFFFFF",
    "logo": "logos/BOMB.png",
    "wins": 0,
    "losses": 0,
    "pointsFor": 0,
    "pointsAgainst": 0,
    "streak": ""
  },
  {
    "id": "SRZ",
    "name": "Pluto Shraazinatorz",
    "owner": "Shrey",
    "division": "West",
    "primaryColor": "#4B0082",
    "secondaryColor": "#9B59B6",
    "textColor": "#FFFFFF",
    "logo": "logos/SRZ.png",
    "wins": 0,
    "losses": 0,
    "pointsFor": 0,
    "pointsAgainst": 0,
    "streak": ""
  }
]
```
(Repeat for all 14 teams. Use placeholder colors — I'll provide final ones later.)

### Full team list to seed:
```
#   ID      Name                            Division    Owner
1   BOMB    Pakistan Bombers                East        (TBD)
2   SRZ     Pluto Shraazinatorz             West        (TBD)
3   Butt    Nabers In Paris                 East        (TBD)
4   MOYD    Mount Olympus Yogurt Dressing   East        (TBD)
5   TWM     The Watermark                   West        (TBD)
6   Doob    Doob's Agency                   West        (TBD)
7   ENG     Englewood Ninjas                West        (TBD)
8   TVH     The Vile Horrendous             East        (TBD)
9   GING    I Love Gingers                  West        (TBD)
10  CPU1    Amon Ra Dawgin                  West        (TBD)
11  FBC     Fort Bragg Confederates         East        (TBD)
12  ROSE    Chicago Zestiest Man            East        (TBD)
13  VPDJ    VancouverPantiesDeJarome        West        (TBD)
14  MARB    Beer                            East        (TBD)
```

### rosters.json
```json
{
  "BOMB": {
    "QB": [{"name": "Jalen Hurts", "team": "PHI", "bye": 5}],
    "RB": [{"name": "Derrick Henry", "team": "BAL", "bye": 14}],
    "WR": [{"name": "Tyreek Hill", "team": "MIA", "bye": 6}],
    "TE": [{"name": "Travis Kelce", "team": "KC", "bye": 6}],
    "FLEX": [],
    "K": [],
    "DEF": [],
    "BENCH": []
  }
}
```
(Seed with empty rosters for now — structure matters more than data.)

### matchups.json
```json
{
  "currentWeek": 1,
  "weeks": {
    "1": [
      {"home": "BOMB", "away": "TVH", "homeScore": null, "awayScore": null, "status": "upcoming"},
      {"home": "SRZ", "away": "Butt", "homeScore": 142.3, "awayScore": 128.7, "status": "final"}
    ]
  }
}
```

### trade-block.json
```json
[
  {"player": "Tyreek Hill", "position": "WR", "team": "BOMB", "note": "Looking for RB help"},
  {"player": "Travis Kelce", "position": "TE", "team": "SRZ", "note": "Will take WR1 or picks"}
]
```

### draft-picks.json
```json
{
  "BOMB": {
    "2026": ["1st (own)", "3rd (own)", "5th (from SRZ)"],
    "2027": ["1st (own)", "2nd (own)", "3rd (own)"]
  }
}
```

---

## Page 1: League Home (index.html)

This is the league hub. When someone opens the site, they see everything happening in the league at a glance.

### Layout (top to bottom):

**1. Top navigation bar**
- League name/logo on the left: "MFGA — Make Fantasy Great Again" (or whatever name — make it configurable in data)
- Horizontal links to key sections (scrolls within page): Standings, Matchups, Trade Block, Playoff Picture
- Right side: current week indicator ("Week 7")

**2. Hero / scoreboard ticker**
- Horizontal scrolling row of current week's matchup scores
- Each matchup shows: Team A logo + abbreviation + score vs Team B logo + abbreviation + score
- Live games show a green dot + "Live", completed show "Final", upcoming show day/time
- Clicking a matchup scrolls to the detailed matchup section or links to the relevant team page

**3. Standings section**
- Two side-by-side tables: East Division and West Division
- Columns: Rank, Team (logo + name), Record (W-L), PF, PA, Streak, GB (games back)
- Rows are sorted by wins, then points for as tiebreaker
- Clicking a team name navigates to their team page (team.html?team=BOMB)
- Top 3 in each division highlighted subtly (playoff spots)
- Row colors use a subtle tint of each team's primary color on hover

**4. This week's matchups (detailed)**
- Grid of matchup cards (2 columns, 7 rows for 14 teams / 7 matchups, or 6 + byes)
- Each card shows:
  - Both team logos, names, records
  - Current score (or "Upcoming" with date)
  - Top scorer from each team so far this week
  - Projected winner (just use current score or placeholder)
- Bye week teams shown in a separate small "On Bye" section

**5. Next week's matchups**
- Simpler grid showing next week's pairings
- Team logo + name vs Team logo + name
- No scores — just the preview

**6. Trade block**
- Table/list of all players that owners have marked as available for trade
- Columns: Player Name, Position, NFL Team, Fantasy Team (with logo), Owner's Note
- Sorted by position (QB, RB, WR, TE, etc.)

**7. Playoff picture**
- *Clinch scenarios section* — text-based, pulled from data or computed
  - "BOMB clinches playoff berth with a win OR a TVH loss"
  - "SRZ clinches division with a win AND a Doob loss"
  - If no clinch scenarios yet: "No teams have clinched. Check back after Week 10."
  - This will be computed by an algorithm we'll add later — for now, show placeholder text

- *Championship odds chart*
  - Horizontal bar chart or table showing each team's probability of:
    - Making playoffs (%)
    - Winning division (%)
    - Winning championship (%)
  - Use Chart.js (load from CDN) for a clean horizontal bar chart grouped by team
  - For now, seed with placeholder percentages
  - Bars colored with each team's primary color
  - Sort by championship odds descending

**8. Footer**
- League name, season year
- "Powered by [league name]"
- Links to all 14 team pages

---

## Page 2: Team Page (team.html?team=BOMB)

Each team gets its own page. The page reads the `?team=` query parameter and loads that team's data. The entire page is themed with that team's colors.

### Dynamic theming:
- Page background stays dark (#0A0A0A)
- Team's primary color used for accent borders, header backgrounds, and highlights
- Team's secondary color used for hover states and charts
- Team logo displayed prominently

### Layout (top to bottom):

**1. Navigation bar**
- Same as league page but with "← Back to League" link on the left
- Team name + logo in the center
- Right side: team record (W-L)

**2. Team hero header**
- Full-width banner with team's primary color as a subtle gradient overlay
- Large team logo (centered or left-aligned)
- Team name in huge text
- Owner name, division, record, points for/against
- Rank in division + rank overall

**3. Roster section**
- Table grouped by position: QB, RB, WR, TE, FLEX, K, DEF, BENCH
- Columns: Position, Player Name, NFL Team, Bye Week, Points (season total), Avg Pts/Week
- Starters section vs Bench section visually separated
- Each player row has a small "📦 Trade" button on the right
  - Clicking it adds the player to the trade block (updates trade-block.json — for now just toggles a visual state and shows a confirmation)
  - If the player is already on the trade block, show "On Trade Block" badge instead
  - Include a text input for the owner to add a trade note (e.g., "Looking for RB help")

**4. Season stats**
- Points For and Points Against with a simple line chart (Chart.js) showing week-by-week scoring
- Both lines on the same chart — team color for PF, gray for PA
- Season averages displayed as numbers below the chart

**5. Schedule / results**
- List of all 14 weeks (13 games + 1 bye)
- Each row: Week #, Opponent (logo + name), Result (W/L), Score, Point Differential
- Bye week shown as "BYE" in a muted row
- Current week highlighted
- Future weeks show opponent but no score ("@ MOYD — Week 9")

**6. Draft picks**
- Simple table showing what draft picks this team owns
- Grouped by year (2026, 2027, etc.)
- Shows round and original owner ("1st Round — own", "3rd Round — from SRZ via TWM")

**7. Team footer**
- Team-colored bottom border
- Back to league link

---

## Interaction Details

### Trade block functionality
For the MVP, the trade block works like this:
1. On a team page, an owner clicks "Trade" next to a player
2. A small modal or inline form appears asking for a note (optional)
3. The player gets added to a `localStorage` trade block list (since we have no backend)
4. The league home page reads from localStorage to display the trade block
5. Later, we can swap localStorage for a real backend/database

### Playoff odds / clinch scenarios
These sections should be clearly marked as "algorithm placeholder" in the code with comments like:
```js
// TODO: Plug in playoff simulation algorithm
// For now, display placeholder data from league.json
```
The UI should be fully built and ready to receive real data.

### Responsive design
- Desktop-first but should not break on mobile
- Standings tables scroll horizontally on mobile
- Matchup cards stack to 1 column on mobile
- Navigation collapses to hamburger menu on mobile

---

## Style Guide Summary

| Element | Value |
|---|---|
| Background | #0A0A0A |
| Surface/cards | #111111 |
| Borders | #1a1a1a (1px solid) |
| League accent | #D4A017 |
| Text primary | #FFFFFF |
| Text secondary | #888888 |
| Text muted | #444444 |
| Headings font | Barlow Condensed, 700 |
| Body font | Inter, 400/500 |
| Data/stats font | Space Grotesk, 500 |
| Section labels | 10-11px, uppercase, letter-spacing: 3-4px, color: accent |
| Card border-radius | 8px |
| Stat numbers | Barlow Condensed, 44-72px |
| Table row hover | rgba(team-color, 0.05) |
| "Live" indicator | Green dot + "LIVE" text |

---

## Important Notes

- All data comes from JSON files in the `/data/` directory. No hardcoded team names or scores in HTML.
- Team pages are a single `team.html` that reads the query parameter — NOT 14 separate HTML files.
- Use Chart.js from CDN (https://cdn.jsdelivr.net/npm/chart.js) for all charts.
- Logo images will be provided later — use colored placeholder squares with team abbreviation text for now.
- The playoff algorithm and championship odds algorithm are NOT part of this build. Build the UI, wire it to placeholder data, and leave clear TODO comments for where the algorithms will plug in.
- Keep the code clean and well-commented. This project will be iterated on.
- Test that all 14 teams render correctly on the team page by cycling through query params.

---

## Build Order

1. Set up file structure and JSON data files with all 14 teams seeded
2. Build `style.css` with the full design system (colors, typography, layout utilities)
3. Build `index.html` — league home page with all sections
4. Build `league.js` — load JSON data, render standings, matchups, trade block, charts
5. Build `team.html` — team page template
6. Build `team.js` — load team-specific data, render roster, schedule, charts, trade block UI
7. Test all 14 teams render correctly
8. Responsive polish
