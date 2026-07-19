Build the full MFGA (Make Fantasy Great Again) fantasy football league website. This is a React + Vite project. Use Tailwind CSS for styling and React Router for navigation.

## HERO IMAGES
I have AI-generated hero images for each team at these exact paths. Use these as full-width background images on each team's hero section with a dark gradient overlay so text is readable on top:

- public/Images/heros/Pakitsaan Bombers.png → Pakistan Bombers
- public/Images/heros/Nabers in Pris.png → Nabers In Paris
- public/Images/heros/Mount olympus.png → Mount Olympus Yogurt Dressing
- public/Images/heros/The Vile Horredus.png → The Vile Horrendous
- public/Images/heros/Fort Bragg Confederates.png → Fort Bragg Confederates
- public/Images/heros/Chicago Zestiest Man.png → Chicago Zestiest Man
- public/Images/heros/Beer.png → Beer
- public/Images/heros/Pluto Shrazz.png → Pluto Shraazinatorz
- public/Images/heros/The Wtaremark.png → The Watermark
- public/Images/heros/doobs agency.png → Doob's Agency
- public/Images/heros/Aman Ra doggin.png → Amon Ra Dawgin (note: intentional spelling)
- public/Images/heros/I Heart Gingers.png → I Love Gingers
- public/Images/heros/VancouverPanteisdejerome.png → VancouverPantiesDeJarome
- public/Images/heros/MFGA Home hero.png → League homepage hero

Also use any team logo SVGs or PNGs already in the public folder. If logos are missing, use colored placeholder squares with the team abbreviation.

## TEAM DATA
Create a data file (src/data/teams.ts) with all 14 teams:

### East Division:
1. id: "BOMB", name: "Pakistan Bombers", abbr: "BOMB", division: "East", colors: { primary: "#C62828", accent: "#D4A017", bg: "#080400" }, stadium: "Bomber Stadium", city: "Islamabad, Pakistan", tagline: "Dropping touchdowns. Taking names.", font: "Teko", bye: 11
2. id: "NIP", name: "Nabers In Paris", abbr: "NIP", division: "East", colors: { primary: "#C0392B", accent: "#D4A84B", bg: "#0A0610" }, stadium: "Stade de Nabers", city: "Paris, France", tagline: "Style. Speed. Statements.", font: "Playfair Display", bye: 13
3. id: "MOYD", name: "Mount Olympus Yogurt Dressing", abbr: "MOYD", division: "East", colors: { primary: "#EC5829", accent: "#FD9767", bg: "#0C0808" }, stadium: "The Pantheon Arena", city: "Mount Olympus, Greece", tagline: "Where legends are forged.", font: "Cinzel", bye: 11
4. id: "TVH", name: "The Vile Horrendous", abbr: "TVH", division: "East", colors: { primary: "#1C75BC", accent: "#BE2026", bg: "#06040A" }, stadium: "The Dungeon", city: "Shadowmoor", tagline: "Fear has a new name.", font: "Creepster", bye: 10
5. id: "FBC", name: "Fort Bragg Confederates", abbr: "FBC", division: "East", colors: { primary: "#A26F64", accent: "#875C50", bg: "#0C0A08" }, stadium: "Bragg Field", city: "Fayetteville, NC", tagline: "Strength through discipline.", font: "Oswald", bye: 11
6. id: "ROSE", name: "Chicago Zestiest Man", abbr: "ROSE", division: "East", colors: { primary: "#42A5F5", accent: "#F48FB1", bg: "#060A14" }, stadium: "Zest Field", city: "Chicago, IL", tagline: "Bringing the zest since 2026.", font: "Fredoka", bye: 10
7. id: "MARB", name: "Beer", abbr: "MARB", division: "East", colors: { primary: "#6D6E71", accent: "#BCBEC0", bg: "#0E0A06" }, stadium: "The Brewery", city: "Milwaukee, WI", tagline: "Crafted with care. Served cold.", font: "Playfair Display", bye: 11

### West Division:
8. id: "SRZ", name: "Pluto Shraazinatorz", abbr: "SRZ", division: "West", colors: { primary: "#00A14B", accent: "#EEC42C", bg: "#040810" }, stadium: "Shraaz Station", city: "Pluto Orbital", tagline: "Beyond the edge of known space.", font: "Orbitron", bye: 12
9. id: "TWM", name: "The Watermark", abbr: "TWM", division: "West", colors: { primary: "#ED2246", accent: "#F15E60", bg: "#0A0404" }, stadium: "Tidal Arena", city: "Watermark Bay, CA", tagline: "Leave your mark.", font: "Oswald", bye: 5
10. id: "Doob", name: "Doob's Agency", abbr: "Doob", division: "West", colors: { primary: "#AC620E", accent: "#29ABE2", bg: "#0A0806" }, stadium: "The Compound", city: "[CLASSIFIED]", tagline: "Intelligence wins championships.", font: "Roboto Condensed", bye: 13
11. id: "ENG", name: "Englewood Ninjas", abbr: "ENG", division: "West", colors: { primary: "#212121", accent: "#FAAF42", bg: "#06060A" }, stadium: "Shadow Dojo", city: "Englewood, IL", tagline: "We don't play fair. We strike.", font: "Noto Serif JP", bye: 6
12. id: "GING", name: "I Love Gingers", abbr: "GING", division: "West", colors: { primary: "#BF360C", accent: "#FF7043", bg: "#100806" }, stadium: "Ginger Field", city: "Dublin, Ireland", tagline: "Red hair, don't care.", font: "Amatic SC", bye: 12
13. id: "CPU1", name: "Amon Ra Dawgin", abbr: "CPU1", division: "West", colors: { primary: "#5C2E14", accent: "#E9BC52", bg: "#0A0804" }, stadium: "Temple of Ra", city: "Giza, Egypt", tagline: "Loyalty. Discipline. Dominance.", font: "Cinzel", bye: 5
14. id: "VPDJ", name: "VancouverPantiesDeJarome", abbr: "VPDJ", division: "West", colors: { primary: "#1E3A5A", accent: "#64B5F6", bg: "#060A10" }, stadium: "Liberty Stadium", city: "Vancouver, BC", tagline: "We exist. We compete. We win.", font: "Oswald", bye: 6

Also add a heroImage field to each team that maps to the correct filename from the paths above.

## PAGE 1: LEAGUE HOMEPAGE (/)

Use "public/Images/heros/MFGA Home hero.png" as the hero background.

Layout:
- **Nav:** "MFGA" logo/text in gold (#D4A017) on dark background, links: Standings, Matchups, Trade Block, Playoffs
- **Hero section:** The MFGA hero image as background with dark overlay. Big text: "MFGA" and "Make Fantasy Great Again" with gold accent. "2026 Season" subtitle.
- **Scoreboard ticker:** Horizontal scrolling row of this week's matchup scores (placeholder data, all 0-0)
- **Standings:** Two side-by-side tables — East and West divisions. Columns: Rank, Team (small logo + name), Record, PF, PA, Streak. Each team name is a link to its team page.
- **This week's matchups:** Grid of matchup cards showing team vs team
- **Trade block:** Table of players on the trade block (placeholder/empty for now)
- **Playoff picture:** Placeholder section with "Clinch scenarios will appear after Week 10" and a championship odds placeholder
- **Footer:** Links to all 14 team pages, "MFGA — Make Fantasy Great Again — 2026"

## PAGE 2: TEAM PAGES (/team/:teamId)

This is the key page. Each team page loads dynamically based on the URL parameter, pulling data from the teams data file. The page should look like a REAL professional sports franchise website.

### Layout (matching reference image style):

**Nav bar:** Team logo (small) + team name on left, links: HOME | TEAM | SCHEDULE | DRAFT, dark background tinted with team color

**Hero section — FULL WIDTH, split into two columns:**
- **Left side (~65%):** The team's hero IMAGE as the background filling this entire area. Dark gradient overlay (from left: team-color tinted black at ~70% opacity fading to transparent on the right). On top of the overlay:
  - Team name in HUGE text (60-80px), team's display font, white with the second word in the team's accent color
  - Tagline underneath in smaller text
  - "VIEW SCHEDULE" button in team's accent color
- **Right side (~35%):** Sidebar with three stacked cards on a dark surface background:
  - **NEXT GAME card:** Team logo "VS" opponent placeholder, with date and stadium
  - **FEATURED card (standings/stats):** Record (0-0), Points For (0.0), Points Against (0.0), Division Rank (—) in a 2x2 grid
  - **TEAM HISTORY card:** "2026 — Current Season" with placeholder for past seasons

**Schedule strip:** Full-width horizontal bar below the hero. "SCHEDULE" label, then 5 upcoming opponent matchups in a row, then "VIEW FULL SCHEDULE →" link. Each opponent shows their abbreviation and the week number.

**Below the fold (scroll down from hero):**
- **Full Roster section:** Table with Starters (QB, RB, RB, WR, WR, TE, FLEX, K, DEF) and Bench (BN x5, IR). Columns: Pos, Player, NFL Team, Bye, Pts, Avg, Trade button. All placeholder dashes for now.
- **Full Schedule section:** All 14 weeks listed. Week number, opponent, result, score. Bye week shown as "BYE WEEK" dimmed.
- **Draft Picks section:** 2026 and 2027 picks listed (1st, 2nd, 3rd — all "Own pick" for now)

**Footer:** Team name + stadium + division, link back to league homepage

### CRITICAL DESIGN RULES FOR TEAM PAGES:
- The hero image IS the visual. It should be prominent and dramatic — not a small thumbnail.
- Use background-image with background-size: cover and background-position: center
- The dark gradient overlay goes ON TOP of the image so text is readable
- Each team's accent color tints the gradient (e.g., Bombers get a red-tinted dark gradient, Nabers get a navy-tinted one)
- The hero section should be at least 500px tall on desktop
- The sidebar cards should feel like a sports broadcast overlay
- Dark theme throughout — the team's bg color for the page background, slightly lighter for cards/surfaces

## STYLE SYSTEM
- Load Google Fonts: Teko, Black Ops One, Playfair Display, Cinzel, Cinzel Decorative, Creepster, Oswald, Fredoka, Orbitron, Roboto Condensed, Noto Serif JP, Amatic SC, Quicksand, Abril Fatface, Special Elite, Lato, Inter, JetBrains Mono
- League accent color: Gold #D4A017
- Default dark background: #0A0A0A
- Default surface: #111111  
- Default border: #1a1a1a
- Stats/data font: JetBrains Mono or Space Grotesk
- Body font: Inter

## ROUTING
- / → League homepage
- /team/BOMB → Pakistan Bombers page
- /team/NIP → Nabers In Paris page
- etc. for all 14 teams using their id

## BUILD
- Make sure it builds cleanly with npm run build
- Make sure all routes work
- Make sure all images load correctly (check the exact filenames with spaces)

Start building. Do the data file first, then the league homepage, then the team page template. Make every team page feel like that team's own professional franchise website.
