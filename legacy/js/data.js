/* =========================================================
   Shared utilities — data loading, formatting, DOM helpers
   ========================================================= */

const DataStore = (() => {
  const cache = {};

  async function loadJSON(path) {
    if (cache[path]) return cache[path];
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    const json = await res.json();
    cache[path] = json;
    return json;
  }

  return {
    getLeague: () => loadJSON('data/league.json'),
    getTeams: () => loadJSON('data/teams.json'),
    getRosters: () => loadJSON('data/rosters.json'),
    getMatchups: () => loadJSON('data/matchups.json'),
    getTradeBlock: () => loadJSON('data/trade-block.json'),
    getDraftPicks: () => loadJSON('data/draft-picks.json'),
  };
})();

/* ---------- formatting helpers ---------- */

function fmtScore(score) {
  return (score === null || score === undefined) ? '—' : score.toFixed(1);
}

function fmtRecord(team) {
  return team.ties ? `${team.wins}-${team.losses}-${team.ties}` : `${team.wins}-${team.losses}`;
}

function fmtStreak(streak) {
  if (!streak) return { text: '—', cls: 'streak-none' };
  const cls = streak.startsWith('W') ? 'streak-w' : streak.startsWith('L') ? 'streak-l' : 'streak-none';
  return { text: streak, cls };
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

/* Team lookup map builder */
function teamMap(teams) {
  const map = {};
  teams.forEach(t => { map[t.id] = t; });
  return map;
}

/* Games back calculation relative to division leader */
function gamesBack(team, leader) {
  if (team.id === leader.id) return '—';
  const gb = ((leader.wins - team.wins) + (team.losses - leader.losses)) / 2;
  return gb === 0 ? '—' : gb.toFixed(1);
}

/* Renders a team logo — image if provided & loads, else colored placeholder with abbreviation */
function teamLogoHTML(team, sizeClass = 'team-logo') {
  const abbr = team.id.length <= 4 ? team.id.toUpperCase() : initials(team.name);
  return `<div class="${sizeClass}" style="background:${team.primaryColor}"
            data-fallback-text="${abbr}">
            <img src="${team.logo}" alt="${team.id} logo"
                 onerror="this.parentElement.textContent=this.parentElement.dataset.fallbackText; this.remove();">
          </div>`;
}

/* Escape helper for user-supplied strings inserted via innerHTML */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

/* ---------- localStorage trade block (client-added listings) ---------- */

const LocalTradeBlock = {
  KEY: 'mfga_trade_block',

  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY)) || [];
    } catch {
      return [];
    }
  },

  add(entry) {
    const all = this.getAll();
    all.push(entry);
    localStorage.setItem(this.KEY, JSON.stringify(all));
  },

  isOnBlock(teamId, playerName) {
    return this.getAll().some(e => e.team === teamId && e.player === playerName);
  },

  remove(teamId, playerName) {
    const all = this.getAll().filter(e => !(e.team === teamId && e.player === playerName));
    localStorage.setItem(this.KEY, JSON.stringify(all));
  }
};

/* Simple query param helper */
function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}
