/* =========================================================
   League home page — standings, matchups, trade block, playoffs
   ========================================================= */

(async function init() {
  const [league, rawTeams, matchups, tradeBlockData] = await Promise.all([
    DataStore.getLeague(),
    DataStore.getTeams(),
    DataStore.getMatchups(),
    DataStore.getTradeBlock(),
  ]);

  // Records (wins/losses/PF/PA/streak) are computed live from game
  // results in matchups.json — data/teams.json only supplies identity
  // and theming fields (name, owner, division, colors) now.
  const { records } = computeClinchElimination(rawTeams, matchups, league);
  const teams = rawTeams.map(t => enrichTeamWithRecord(t, records[t.id]));
  const teams_by_id = teamMap(teams);
  const currentWeek = matchups.currentWeek;
  const nextWeek = currentWeek + 1;

  renderNav(league, currentWeek);
  renderTicker(matchups.weeks[currentWeek] || [], teams_by_id);
  renderStandings(league, teams, records);
  renderMatchups(currentWeek, matchups.weeks[currentWeek] || [], teams, teams_by_id);
  renderNextWeek(nextWeek, matchups.weeks[nextWeek] || [], teams_by_id);
  renderTradeBlock(tradeBlockData, teams_by_id);
  renderClinchScenarios(rawTeams, matchups, league);
  renderOddsChart(rawTeams, matchups, league, teams_by_id);
  renderFooter(league, teams);
  wireMobileNav();
})();

function enrichTeamWithRecord(team, record) {
  return {
    ...team,
    wins: record.wins,
    losses: record.losses,
    ties: record.ties,
    pointsFor: record.pointsFor,
    pointsAgainst: record.pointsAgainst,
    streak: record.streak,
  };
}

/* ---------- nav ---------- */
function renderNav(league, currentWeek) {
  document.getElementById('league-name').textContent = (league.leagueName || 'MFGA').split(' — ')[0];
  document.getElementById('nav-week-num').textContent = currentWeek;
}

function wireMobileNav() {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('nav-toggle');
  toggle.addEventListener('click', () => nav.classList.toggle('open'));
}

/* ---------- ticker ---------- */
function renderTicker(games, teams_by_id) {
  const el = document.getElementById('ticker');
  if (!games.length) {
    el.innerHTML = `<div class="ticker-empty">No games scheduled this week.</div>`;
    return;
  }
  el.innerHTML = games.map(g => {
    const home = teams_by_id[g.home];
    const away = teams_by_id[g.away];
    if (!home || !away) return '';
    const statusHTML = g.status === 'live'
      ? `<span class="ticker-status live">● Live</span>`
      : g.status === 'final'
        ? `<span class="ticker-status final">Final</span>`
        : `<span class="ticker-status upcoming">${g.kickoff || 'Upcoming'}</span>`;
    return `
      <a class="ticker-game" href="#matchups">
        <div class="ticker-team">
          ${teamLogoHTML(home, 'ticker-logo')}
          <span class="ticker-abbr">${home.id}</span>
          <span class="ticker-score">${fmtScore(g.homeScore)}</span>
        </div>
        <span class="ticker-vs">—</span>
        <div class="ticker-team">
          ${teamLogoHTML(away, 'ticker-logo')}
          <span class="ticker-abbr">${away.id}</span>
          <span class="ticker-score">${fmtScore(g.awayScore)}</span>
        </div>
        ${statusHTML}
      </a>`;
  }).join('');
}

/* ---------- standings ---------- */
function renderStandings(league, teams, records) {
  const grid = document.getElementById('standings-grid');
  const divisions = league.divisions || ['East', 'West'];
  const playoffSpots = league.playoffSpotsPerDivision || 4;

  grid.innerHTML = divisions.map(div => {
    const divTeamsUnordered = teams.filter(t => t.division === div);
    const orderedIds = rankTeams(divTeamsUnordered.map(t => t.id), records);
    const divTeams = orderedIds.map(id => divTeamsUnordered.find(t => t.id === id));
    const leader = divTeams[0];
    const rows = divTeams.map((t, i) => {
      const streak = fmtStreak(t.streak);
      const playoffClass = i < playoffSpots ? 'playoff' : '';
      return `
        <tr class="${playoffClass}" onclick="location.href='team.html?team=${encodeURIComponent(t.id)}'">
          <td>${i + 1}</td>
          <td><div class="team-cell">
            ${teamLogoHTML(t)}
            <div class="team-name-col"><span class="name">${escapeHTML(t.name)}</span><span class="owner">${escapeHTML(t.owner)}</span></div>
          </div></td>
          <td><span class="record">${fmtRecord(t)}</span></td>
          <td class="num">${t.pointsFor.toFixed(1)}</td>
          <td class="num">${t.pointsAgainst.toFixed(1)}</td>
          <td class="num"><span class="${streak.cls}">${streak.text}</span></td>
          <td class="num">${leader ? gamesBack(t, leader) : '—'}</td>
        </tr>`;
    }).join('');

    return `
      <div class="standings-scroll">
        <div class="division-label">${escapeHTML(div)} Division</div>
        <table class="standings-table">
          <thead><tr>
            <th style="width:30px">#</th><th>Team</th><th>Record</th>
            <th class="num">PF</th><th class="num">PA</th><th class="num">Strk</th><th class="num">GB</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }).join('');
}

/* ---------- this week's matchups ---------- */
function renderMatchups(week, games, teams, teams_by_id) {
  document.getElementById('matchups-heading').textContent = `Week ${week} matchups`;
  const grid = document.getElementById('matchups-grid');

  if (!games.length) {
    grid.innerHTML = `<div class="empty-state">No matchups scheduled for Week ${week} yet.</div>`;
  } else {
    grid.innerHTML = games.map(g => {
      const home = teams_by_id[g.home];
      const away = teams_by_id[g.away];
      if (!home || !away) return '';
      const isFinal = g.status === 'final';
      const homeWin = isFinal && g.homeScore > g.awayScore;
      const awayWin = isFinal && g.awayScore > g.homeScore;
      const statusHTML = g.status === 'live'
        ? `<div class="status live">● Live</div>`
        : g.status === 'final'
          ? `<div class="status final">Final</div>`
          : `<div class="status upcoming">${g.kickoff || 'Upcoming'}</div>`;
      return `
        <div class="matchup-card" onclick="location.href='team.html?team=${encodeURIComponent(home.id)}'">
          <div class="matchup-team">
            ${teamLogoHTML(home, 'matchup-logo')}
            <div class="matchup-info">
              <div class="name">${escapeHTML(home.name)}</div>
              <div class="record-small">${fmtRecord(home)}</div>
            </div>
          </div>
          <div class="matchup-center">
            <div class="matchup-score ${homeWin ? 'winner' : ''}">${fmtScore(g.homeScore)}</div>
            <div class="vs">—</div>
            <div class="matchup-score ${awayWin ? 'winner' : ''}">${fmtScore(g.awayScore)}</div>
            ${statusHTML}
          </div>
          <div class="matchup-team away">
            ${teamLogoHTML(away, 'matchup-logo')}
            <div class="matchup-info">
              <div class="name">${escapeHTML(away.name)}</div>
              <div class="record-small">${fmtRecord(away)}</div>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  // Bye teams — any team not appearing in this week's games
  const playing = new Set();
  games.forEach(g => { playing.add(g.home); playing.add(g.away); });
  const byeTeams = teams.filter(t => !playing.has(t.id));
  const byeRow = document.getElementById('bye-row');
  byeRow.innerHTML = byeTeams.length
    ? byeTeams.map(t => `
        <div class="bye-card">
          ${teamLogoHTML(t)}
          <span class="bye-label">${t.id} — Bye</span>
        </div>`).join('')
    : '';
}

/* ---------- next week's matchups (preview) ---------- */
function renderNextWeek(week, games, teams_by_id) {
  document.getElementById('next-week-heading').textContent = `Week ${week} matchups`;
  const grid = document.getElementById('next-week-grid');
  if (!games.length) {
    grid.innerHTML = `<div class="empty-state">Week ${week} schedule not yet set.</div>`;
    return;
  }
  grid.innerHTML = games.map(g => {
    const home = teams_by_id[g.home];
    const away = teams_by_id[g.away];
    if (!home || !away) return '';
    return `
      <div class="preview-card" onclick="location.href='team.html?team=${encodeURIComponent(home.id)}'">
        <div class="preview-team">
          ${teamLogoHTML(home)}
          <span class="name">${escapeHTML(home.name)}</span>
        </div>
        <span class="preview-vs">VS</span>
        <div class="preview-team away">
          ${teamLogoHTML(away)}
          <span class="name">${escapeHTML(away.name)}</span>
        </div>
      </div>`;
  }).join('');
}

/* ---------- trade block ---------- */
function renderTradeBlock(tradeBlockData, teams_by_id) {
  const localEntries = LocalTradeBlock.getAll();
  const all = [...tradeBlockData, ...localEntries];
  const posOrder = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DEF'];
  all.sort((a, b) => posOrder.indexOf(a.position) - posOrder.indexOf(b.position));

  const body = document.getElementById('trade-block-body');
  if (!all.length) {
    body.innerHTML = `<tr><td colspan="5" class="empty-state">No players currently on the trade block.</td></tr>`;
    return;
  }
  body.innerHTML = all.map(e => {
    const team = teams_by_id[e.team];
    if (!team) return '';
    return `
      <tr>
        <td><span class="trade-player">${escapeHTML(e.player)}</span></td>
        <td><span class="trade-pos">${escapeHTML(e.position)}</span></td>
        <td>${escapeHTML(e.nflTeam || '—')}</td>
        <td><div class="team-cell">${teamLogoHTML(team, 'team-logo')} ${escapeHTML(team.name)}</div></td>
        <td><span class="trade-note">${e.note ? `"${escapeHTML(e.note)}"` : '—'}</span></td>
      </tr>`;
  }).join('');
}

/* ---------- playoff picture ---------- */
function renderClinchScenarios(rawTeams, matchups, league) {
  // Computed live — see js/standings.js for the head-to-head/points-for
  // tiebreaker cascade and the clinch/elimination bound it's built on.
  const list = document.getElementById('clinch-list');
  const entries = buildClinchScenarios(rawTeams, matchups, league);
  if (!entries.length) {
    list.innerHTML = `<div class="empty-state">No teams have clinched or been eliminated yet.</div>`;
    return;
  }
  const teams_by_id = teamMap(rawTeams);
  list.innerHTML = entries.map(e => {
    const team = teams_by_id[e.team];
    const cls = e.type === 'eliminated' ? 'clinch-item eliminated' : 'clinch-item';
    return `
      <div class="${cls}">
        ${team ? teamLogoHTML(team) : ''}
        <span class="scenario"><strong>${escapeHTML(team ? team.name : e.team)}</strong> ${escapeHTML(e.text)}</span>
      </div>`;
  }).join('');
}

function renderOddsChart(rawTeams, matchups, league, teams_by_id) {
  // Live Monte Carlo simulation — see js/standings.js (runSeasonSimulation)
  // for the scoring model and bracket logic.
  const simResults = runSeasonSimulation(rawTeams, matchups, league);
  const odds = rawTeams
    .map(t => ({ team: t.id, ...simResults[t.id] }))
    .sort((a, b) => b.championshipPct - a.championshipPct);
  const ctx = document.getElementById('odds-chart');
  if (!ctx || !odds.length) return;

  const labels = odds.map(o => (teams_by_id[o.team] || {}).id || o.team);
  const colors = odds.map(o => (teams_by_id[o.team] || {}).primaryColor || '#D4A017');

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Playoffs %', data: odds.map(o => o.playoffPct), backgroundColor: colors.map(c => c + 'CC') },
        { label: 'Division %', data: odds.map(o => o.divisionPct), backgroundColor: colors.map(c => c + '88') },
        { label: 'Championship %', data: odds.map(o => o.championshipPct), backgroundColor: colors },
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { beginAtZero: true, max: 100, grid: { color: '#E4DDC8' }, ticks: { color: '#6B6358' } },
        y: { grid: { color: '#E4DDC8' }, ticks: { color: '#1A1A1A', font: { family: 'Barlow Condensed' } } }
      },
      plugins: {
        legend: { labels: { color: '#6B6358', font: { family: 'Space Grotesk', size: 11 } } }
      }
    }
  });
}

/* ---------- footer ---------- */
function renderFooter(league, teams) {
  document.getElementById('footer-teams').innerHTML = teams.map(t =>
    `<a class="footer-team-link" href="team.html?team=${encodeURIComponent(t.id)}">${t.id}</a>`
  ).join('');
  document.getElementById('footer-copy').innerHTML =
    `${escapeHTML(league.leagueName || 'MFGA')} &bull; ${league.season} Season`;
}
