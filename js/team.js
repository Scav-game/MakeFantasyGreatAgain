/* =========================================================
   Team page — dynamic theming, roster, schedule, charts, trades
   ========================================================= */

let CURRENT_TEAM = null;
let PENDING_TRADE_PLAYER = null;

(async function init() {
  const teamId = getQueryParam('team');
  const [league, teams, rosters, matchups, tradeBlockData] = await Promise.all([
    DataStore.getLeague(),
    DataStore.getTeams(),
    DataStore.getRosters(),
    DataStore.getMatchups(),
    DataStore.getTradeBlock(),
  ]);

  const teams_by_id = teamMap(teams);
  const team = teams_by_id[teamId];

  if (!team) {
    document.body.innerHTML = `
      <div style="padding:80px 32px;text-align:center;">
        <h1 style="font-family:'Barlow Condensed';font-size:32px;margin-bottom:12px;">Team not found</h1>
        <p style="color:var(--text-2);margin-bottom:20px;">No team matches "${escapeHTML(teamId || '')}" in the league data.</p>
        <a href="index.html" style="color:var(--accent);">← Back to league</a>
      </div>`;
    return;
  }

  CURRENT_TEAM = team;
  applyTeamTheme(team);
  renderNav(team);
  renderHero(team, teams, league);
  renderRoster(team, rosters[team.id] || {}, tradeBlockData);
  renderSeasonStats(team, matchups);
  renderSchedule(team, teams_by_id, matchups);
  renderDraftPicks(team.id, await DataStore.getDraftPicks());
  renderFooter(league);
  wireMobileNav();
  wireTradeModal(tradeBlockData);
})();

/* ---------- theming ---------- */
function applyTeamTheme(team) {
  document.title = `${team.name} — MFGA`;
  const root = document.documentElement.style;
  root.setProperty('--team-primary', team.primaryColor);
  root.setProperty('--team-secondary', team.secondaryColor);
  root.setProperty('--team-text', team.textColor || '#FFFFFF');
}

/* ---------- nav ---------- */
function renderNav(team) {
  document.getElementById('nav-team-brand').innerHTML = `
    ${teamLogoHTML(team, 'team-logo')}
    <div class="name" style="color:var(--team-secondary)">${escapeHTML(team.name)}</div>`;
  document.getElementById('nav-team-record').textContent = fmtRecord(team);
}

function wireMobileNav() {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('nav-toggle');
  toggle.addEventListener('click', () => nav.classList.toggle('open'));
}

/* ---------- hero ---------- */
function renderHero(team, teams, league) {
  document.getElementById('hero-logo').innerHTML = teamLogoInner(team);

  document.getElementById('hero-division-tag').textContent = `${team.division} Division`;
  document.getElementById('hero-name').textContent = team.name;

  const divTeams = sortStandings(teams.filter(t => t.division === team.division));
  const overallTeams = sortStandings(teams);
  const divRank = divTeams.findIndex(t => t.id === team.id) + 1;
  const overallRank = overallTeams.findIndex(t => t.id === team.id) + 1;

  document.getElementById('hero-meta').innerHTML = `
    <span>Owner: <strong>${escapeHTML(team.owner)}</strong></span>
    <span>Division: <strong>${escapeHTML(team.division)}</strong></span>
    <span>Div Rank: <strong>#${divRank}</strong></span>
    <span>League Rank: <strong>#${overallRank} of ${teams.length}</strong></span>
  `;

  document.getElementById('hero-stats').innerHTML = `
    <div class="team-hero-stat"><div class="label">Record</div><div class="value">${fmtRecord(team)}</div></div>
    <div class="team-hero-stat"><div class="label">Points For</div><div class="value accent">${team.pointsFor.toFixed(1)}</div></div>
    <div class="team-hero-stat"><div class="label">Points Against</div><div class="value">${team.pointsAgainst.toFixed(1)}</div></div>
    <div class="team-hero-stat"><div class="label">Streak</div><div class="value">${team.streak || '—'}</div></div>
  `;
}

function teamLogoInner(team) {
  const abbr = team.id.length <= 4 ? team.id.toUpperCase() : initials(team.name);
  return `<img src="${team.logo}" alt="${team.id} logo"
            onerror="this.parentElement.textContent='${abbr}'; this.remove();"
            style="width:100%;height:100%;object-fit:cover;">`;
}

/* ---------- roster ---------- */
const POSITION_ORDER = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DEF', 'BENCH'];

function renderRoster(team, roster, tradeBlockData) {
  LAST_ROSTER = roster;
  const container = document.getElementById('roster-groups');
  const onBlockFromFile = new Set(
    tradeBlockData.filter(e => e.team === team.id).map(e => e.player)
  );

  container.innerHTML = POSITION_ORDER.map(pos => {
    const players = roster[pos] || [];
    const rows = players.length
      ? players.map(p => renderPlayerRow(team, pos, p, onBlockFromFile)).join('')
      : `<tr class="roster-empty-row"><td colspan="7">No players rostered at ${pos}.</td></tr>`;

    return `
      <div class="roster-group">
        <div class="roster-group-label">${pos}</div>
        <div class="roster-scroll">
          <table class="roster-table">
            <thead><tr>
              <th>Pos</th><th>Player</th><th>NFL</th><th class="num">Bye</th>
              <th class="num">Pts</th><th class="num">Avg</th><th></th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
  }).join('');
}

function renderPlayerRow(team, pos, player, onBlockFromFile) {
  const onBlock = onBlockFromFile.has(player.name) || LocalTradeBlock.isOnBlock(team.id, player.name);
  const points = player.points ?? 0;
  const avg = player.gamesPlayed ? (points / player.gamesPlayed).toFixed(1) : '0.0';
  const btnHTML = onBlock
    ? `<button class="trade-btn on-block" disabled>On Trade Block</button>`
    : `<button class="trade-btn" onclick="openTradeModal('${escapeHTML(player.name).replace(/'/g, "\\'")}')">📦 Trade</button>`;

  return `
    <tr>
      <td><span class="roster-pos-tag">${pos === 'BENCH' ? (player.position || 'BN') : pos}</span></td>
      <td><span class="roster-player-name">${escapeHTML(player.name)}</span></td>
      <td>${escapeHTML(player.team || '—')}</td>
      <td class="num">${player.bye ?? '—'}</td>
      <td class="num">${points.toFixed(1)}</td>
      <td class="num">${avg}</td>
      <td>${btnHTML}</td>
    </tr>`;
}

/* ---------- trade modal ---------- */
function openTradeModal(playerName) {
  PENDING_TRADE_PLAYER = playerName;
  document.getElementById('trade-modal-player').textContent = `Add "${playerName}" to trade block`;
  document.getElementById('trade-modal-note').value = '';
  document.getElementById('trade-modal').classList.remove('hidden');
}

function wireTradeModal() {
  const overlay = document.getElementById('trade-modal');
  document.getElementById('trade-modal-cancel').addEventListener('click', () => {
    overlay.classList.add('hidden');
    PENDING_TRADE_PLAYER = null;
  });
  document.getElementById('trade-modal-confirm').addEventListener('click', () => {
    if (!PENDING_TRADE_PLAYER) return;
    const note = document.getElementById('trade-modal-note').value.trim();
    // MVP: trade block persists to localStorage only (no backend yet).
    // League home page reads this alongside data/trade-block.json.
    LocalTradeBlock.add({
      player: PENDING_TRADE_PLAYER,
      position: findPlayerPosition(PENDING_TRADE_PLAYER),
      team: CURRENT_TEAM.id,
      nflTeam: findPlayerNflTeam(PENDING_TRADE_PLAYER),
      note,
    });
    overlay.classList.add('hidden');
    showToast(`${PENDING_TRADE_PLAYER} added to the trade block.`);
    PENDING_TRADE_PLAYER = null;
    location.reload();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });
}

let LAST_ROSTER = {};
function findPlayerPosition(name) {
  for (const pos of POSITION_ORDER) {
    const found = (LAST_ROSTER[pos] || []).find(p => p.name === name);
    if (found) return pos === 'BENCH' ? (found.position || 'BN') : pos;
  }
  return '—';
}
function findPlayerNflTeam(name) {
  for (const pos of POSITION_ORDER) {
    const found = (LAST_ROSTER[pos] || []).find(p => p.name === name);
    if (found) return found.team || '—';
  }
  return '—';
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2400);
}

/* ---------- season stats chart ---------- */
function renderSeasonStats(team, matchups) {
  const weeks = Object.keys(matchups.weeks).map(Number).sort((a, b) => a - b);
  const pf = [];
  const pa = [];
  const labels = [];

  weeks.forEach(w => {
    const games = matchups.weeks[w] || [];
    const game = games.find(g => g.home === team.id || g.away === team.id);
    if (!game || game.status !== 'final') return;
    const isHome = game.home === team.id;
    const teamScore = isHome ? game.homeScore : game.awayScore;
    const oppScore = isHome ? game.awayScore : game.homeScore;
    labels.push(`Wk ${w}`);
    pf.push(teamScore);
    pa.push(oppScore);
  });

  const ctx = document.getElementById('scoring-chart');
  if (labels.length === 0) {
    ctx.parentElement.innerHTML = `<div class="empty-state">No completed games yet this season.</div>`;
  } else {
    new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Points For', data: pf, borderColor: team.secondaryColor, backgroundColor: team.secondaryColor + '33', tension: 0.3, fill: true },
          { label: 'Points Against', data: pa, borderColor: '#666', backgroundColor: 'transparent', borderDash: [4, 4], tension: 0.3 },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { color: '#1a1a1a' }, ticks: { color: '#888' } },
          y: { grid: { color: '#1a1a1a' }, ticks: { color: '#888' } }
        },
        plugins: {
          legend: { labels: { color: '#888', font: { family: 'Space Grotesk', size: 11 } } }
        }
      }
    });
  }

  const avgPF = pf.length ? (pf.reduce((a, b) => a + b, 0) / pf.length) : 0;
  const avgPA = pa.length ? (pa.reduce((a, b) => a + b, 0) / pa.length) : 0;
  document.getElementById('stats-summary').innerHTML = `
    <div class="stat"><div class="label">Avg Points For</div><div class="value pf">${avgPF.toFixed(1)}</div></div>
    <div class="stat"><div class="label">Avg Points Against</div><div class="value pa">${avgPA.toFixed(1)}</div></div>
    <div class="stat"><div class="label">Games Played</div><div class="value">${pf.length}</div></div>
  `;
}

/* ---------- schedule ---------- */
function renderSchedule(team, teams_by_id, matchups) {
  const totalWeeks = 14; // per league schema (13 games + 1 bye)
  const currentWeek = matchups.currentWeek;
  const body = document.getElementById('schedule-body');
  const rows = [];

  for (let w = 1; w <= totalWeeks; w++) {
    const weekScheduled = Object.prototype.hasOwnProperty.call(matchups.weeks, w);
    const games = matchups.weeks[w] || [];
    const game = games.find(g => g.home === team.id || g.away === team.id);
    const isCurrent = w === currentWeek;

    if (!game && weekScheduled) {
      rows.push(`
        <tr class="bye-row-item ${isCurrent ? 'current-week' : ''}">
          <td>${w}</td><td colspan="4">BYE</td>
        </tr>`);
      continue;
    }

    if (!game) {
      rows.push(`<tr class="${isCurrent ? 'current-week' : ''}"><td>${w}</td><td colspan="4" style="color:var(--text-3)">Schedule not yet set</td></tr>`);
      continue;
    }

    const isHome = game.home === team.id;
    const oppId = isHome ? game.away : game.home;
    const opp = teams_by_id[oppId];
    const teamScore = isHome ? game.homeScore : game.awayScore;
    const oppScore = isHome ? game.awayScore : game.homeScore;

    let resultHTML, scoreHTML, diffHTML;
    if (game.status === 'final') {
      const won = teamScore > oppScore;
      resultHTML = `<span class="result-badge ${won ? 'win' : 'loss'}">${won ? 'W' : 'L'}</span>`;
      scoreHTML = `${teamScore.toFixed(1)} – ${oppScore.toFixed(1)}`;
      const diff = teamScore - oppScore;
      diffHTML = `<span class="${diff >= 0 ? 'diff-pos' : 'diff-neg'}">${diff >= 0 ? '+' : ''}${diff.toFixed(1)}</span>`;
    } else {
      resultHTML = `<span class="result-badge pending">–</span>`;
      scoreHTML = game.status === 'live' ? 'In progress' : `@ ${opp ? opp.id : oppId} — Week ${w}`;
      diffHTML = '—';
    }

    rows.push(`
      <tr class="${isCurrent ? 'current-week' : ''}">
        <td>${w}</td>
        <td><div class="team-cell">${opp ? teamLogoHTML(opp, 'team-logo') : ''} ${opp ? escapeHTML(opp.name) : oppId}</div></td>
        <td>${resultHTML}</td>
        <td class="num">${scoreHTML}</td>
        <td class="num">${diffHTML}</td>
      </tr>`);
  }

  body.innerHTML = rows.join('');
}

/* ---------- draft picks ---------- */
function renderDraftPicks(teamId, draftPicks) {
  const teamPicks = draftPicks[teamId];
  const container = document.getElementById('draft-picks-body');
  if (!teamPicks) {
    container.innerHTML = `<div class="empty-state">No draft pick data available for this team.</div>`;
    return;
  }
  container.innerHTML = Object.keys(teamPicks).sort().map(year => `
    <div class="draft-year-block">
      <div class="draft-year-label">${year}</div>
      <div class="draft-picks-grid">
        ${teamPicks[year].map(pick => {
          const [round, ...rest] = pick.split(' ');
          return `<div class="draft-pick-chip"><strong>${escapeHTML(round)}</strong> Round — ${escapeHTML(rest.join(' ').replace(/[()]/g, ''))}</div>`;
        }).join('')}
      </div>
    </div>`).join('');
}

/* ---------- footer ---------- */
function renderFooter(league) {
  document.getElementById('footer-copy').innerHTML =
    `${escapeHTML(league.leagueName || 'MFGA')} &bull; ${league.season} Season`;
}
