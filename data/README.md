# League data

Everything on the site — standings, streaks, points, the clinch scenarios,
championship odds, record comparisons, news, and the League History page —
is computed from the seven CSV files in this folder. Edit them in Excel,
Numbers, or Google Sheets (export/save back to CSV, same filename, same
folder), then tell Claude to refresh the site. Nothing here is hand-edited
code — these are just data.

**Workflow:** edit a CSV → save it in this folder under the same name → ask
to have the site rebuilt and redeployed. Behind the scenes that runs
`npm run build:data` (turns these CSVs into `lib/generated/league-data.json`)
followed by `npm run build`.

There is no separate "current week" field to update — `CURRENT_WEEK` is
figured out automatically from `schedule.csv`: it's the first week that
doesn't yet have scores filled in for every game. Just fill in scores as
games get played; the site figures out where the season is.

## teams.csv — one row per team, rarely changes

| Column | Meaning |
|---|---|
| `slug` | Unique id used everywhere else in these CSVs to reference this team (e.g. `pakistan-bombers`). Don't change once set — every other CSV points to it. |
| `name` | Full team name. |
| `nameLine1` / `nameLine2` | The team name split across two lines for the big hero headline (e.g. "PAKISTAN" / "BOMBERS"). |
| `accentLine` | `0` or `1` — which of the two name lines gets the team's accent color on the hero. |
| `division` | `East` or `West`. |
| `tagline` | Short tagline shown on the team page. |
| `theme` | Short theme description (e.g. "Military · Explosive · War Zone"). |
| `stadiumName` / `stadiumCity` | Home stadium name and city. |
| `hero` | Path to the team's hero photo under `/public` (e.g. `/teams/pakistan-bombers.png`). |
| `colorPrimary` / `colorAccent` / `colorDark` / `colorLight` | Hex colors used throughout the team's page and cards. `light` and `dark` should stay a light/dark pastel-and-ink pair — they're used as the page background and text ink now, not just accents. |

## schedule.csv — one row per team per week (14 teams × 14 weeks = 196 rows)

| Column | Meaning |
|---|---|
| `slug` | Team this row belongs to. |
| `week` | Week number, 1–14. |
| `opponent` | Opponent's `slug`. |
| `date` | Display date, e.g. `Sep 7, 2026`. |
| `home` | `yes` if this team is home, `no` if away. |
| `teamScore` / `oppScore` | This team's score and the opponent's score. **Leave both blank for games that haven't been played yet.** Filling these in is what advances the season and moves `CURRENT_WEEK` forward. |

Each team's row is independent — you don't need the two teams in a matchup
to agree on anything, just fill in each team's own perspective.

## rosters.csv — one row per player

| Column | Meaning |
|---|---|
| `teamSlug` | Team this player belongs to. |
| `group` | `starter` or `bench`. |
| `pos` | Position (QB, RB, WR, TE, FLEX, K, DEF, …). |
| `name` | Player name. |
| `nflTeam` | Player's NFL team abbreviation. |
| `points` | Season points scored so far. |

## draft-picks.csv — one row per owned future draft pick

| Column | Meaning |
|---|---|
| `teamSlug` | Team that owns the pick. |
| `year` | Draft year. |
| `round` | e.g. `1st Round`. |
| `origin` | `Own` or the name of the team the pick was acquired from. |

## history.csv — one row per team, mostly one-time setup

| Column | Meaning |
|---|---|
| `slug` | Team. |
| `yearJoined` | Year the franchise joined the league. |
| `allTimeWins` / `allTimeLosses` | All-time regular season record. |
| `totalPointsFor` | All-time total points scored. |
| `playoffAppearances` | Count of playoff appearances. |
| `playoffWins` | Count of playoff game wins. |
| `championships` | Count of championships won. |

This is also what powers the sortable table on the `/history` page — plus
two stats it computes for you from these columns, not separate fields to
fill in: **Win %** (`allTimeWins` / total games) and **PF / Year**
(`totalPointsFor` / seasons since `yearJoined`).

## news.csv — one row per news story, this is the entire League News section

| Column | Meaning |
|---|---|
| `date` | Whatever you want shown as the story's date — free text, e.g. `Jul 20 2026`. |
| `headline` | Story headline. |
| `body` | Story text (a couple sentences reads best, but nothing stops you writing more). |
| `team` | Optional. A team's `slug` to give the story that team's colored border. Leave blank for a general league story (colored gold). |
| `author` | Optional. The writer's name, e.g. `Marty Hughes`. Shown as a byline ("By Marty Hughes") and controls the picture badge — see below. |

Add as many rows as you want — every row becomes its own card. **Just
append new stories at the bottom of the file** — the last row is treated as
the newest and shows up first on the site, so there's no need to insert
rows at the top. The homepage League News section only shows the 5 most
recent; everything (including those 5) is searchable on the `/history` News
Archive. There's no auto-generated filler — whatever's in this file is
exactly what shows up, so an empty file means an empty section.

### Reporter staff & profile pictures

The little square badge on each article picks a picture in this order:
1. The `author`'s photo, if one exists (see below).
2. Otherwise the `team`'s logo, if a team is set.
3. Otherwise the gold "M" mark.

The six MFGA reporters (Rick "The Hammer" Dalton, Maya Chen, DeShawn
"Showtime" Harris, Claire Westbrook, Tommy "T-Bone" Mancini, Valentina
Rojas) already have photos wired up in `public\Images\Reporters\`. Use
their exact names (with the nicknames, quotes and all) in the `author`
column to get their photo and byline. `data\reporters\personalities.pdf`
has each reporter's voice, tone, and catchphrases — it's a private
reference file (not part of the published site) for keeping their writing
style consistent when drafting new articles as them.

To add a photo for a new author: drop an SVG or PNG into
`public\Images\Reporters\`, named after their slugified name — lowercase,
spaces and punctuation turned into hyphens (e.g. "Marty Hughes" →
`marty-hughes.svg`). Tell Claude once the file's there — the filename needs
to be registered in `components/history/author-avatar.tsx` before it'll
show up (the same one-line step used for team logos). Until a photo exists,
that author gets an initials badge (e.g. "MH") instead — never a broken
image.

## past-teams.csv — one row per team that's no longer in the league

This is the "Past Teams" section on `/history` — a card grid like the
Franchises section on the homepage, except clicking a card zooms into a
popup with that team's all-time stats.

| Column | Meaning |
|---|---|
| `slug` | Unique id for this team — just like `teams.csv`, doesn't need to match anything else. |
| `name` | **Put the team name here.** This is the only place past teams' names go — they don't belong in `teams.csv`, which is only the 14 current franchises. |
| `hero` | Path to their hero photo under `/public`, e.g. `/Images/heros/old-team-name.png` — that's `public\Images\heros\`, the same folder the current teams' hero photos already live in. |
| `colorPrimary` / `colorAccent` / `colorDark` / `colorLight` | Same as `teams.csv` — hex colors for the card and popup styling. |
| `yearJoined` / `yearLeft` | The years they were in the league. |
| `allTimeWins` / `allTimeLosses` | Their all-time record while active. |
| `totalPointsFor` | All-time total points scored. |
| `playoffAppearances` / `playoffWins` / `championships` | Same meaning as `history.csv`. |

This file starts empty (header row only) — add a row per departed team
whenever you have one. There are currently 11 placeholder rows (Bildo's
Army, Derek's Car, Deshaun Watson's Bed, Errect Logomamanator, F Drew
Flynn, Marbins Jew, Michael Vick's Dog Pound, North Korea Pigs, The
Deflatgators, Doob's Daring Team, Drew Flynn Butt Toys) set up from the
hero photos you already dropped in — their `hero` paths are correct, but
the years, record, points, and colors are all just zeroed-out
placeholders. Fill in the real numbers whenever you have them.

## What's pre-filled right now

`teams.csv`, `schedule.csv`, `rosters.csv`, `draft-picks.csv`, and
`history.csv` were seeded from whatever the site was already showing
(placeholder data), so they're already in the right shape — you're
correcting/replacing values, not starting from a blank sheet. `teams.csv`,
`draft-picks.csv`, and `history.csv` will probably only need setting up once;
`schedule.csv` and `rosters.csv` are the ones you'll touch weekly. `news.csv`
is all yours — add, edit, or remove stories whenever you want. `past-teams.csv`
starts completely empty — nothing to correct, just add rows as needed.
