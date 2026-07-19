/* =========================================================
   Standings engine — records, head-to-head tiebreakers, and
   playoff clinch/elimination detection, all derived live from
   data/matchups.json game results (not from static fields).

   League tiebreaker rule (as specified by the commissioner):
     1. Head-to-head record among the tied teams
     2. Total points for
   If a tiebreaker step separates out only SOME of the tied teams,
   the full procedure (starting back at head-to-head) restarts for
   whoever is still tied. E.g. a 3-way cycle (A beat B, B beat C,
   C beat A) is dead-even on head-to-head, so it falls to points
   for; if that singles out just one team, the remaining two go
   back to head-to-head to be ordered between themselves.
   ========================================================= */

/* ---------- game log / records ---------- */

function buildGameLog(teams, matchups) {
  const log = new Map();
  teams.forEach(t => log.set(t.id, []));

  const weekNums = Object.keys(matchups.weeks).map(Number).sort((a, b) => a - b);
  weekNums.forEach(w => {
    (matchups.weeks[w] || []).forEach(g => {
      if (g.status !== 'final' || g.homeScore == null || g.awayScore == null) return;
      const homeResult = g.homeScore > g.awayScore ? 'W' : g.homeScore < g.awayScore ? 'L' : 'T';
      const awayResult = homeResult === 'W' ? 'L' : homeResult === 'L' ? 'W' : 'T';
      if (log.has(g.home)) {
        log.get(g.home).push({ week: w, opponentId: g.away, teamScore: g.homeScore, oppScore: g.awayScore, result: homeResult });
      }
      if (log.has(g.away)) {
        log.get(g.away).push({ week: w, opponentId: g.home, teamScore: g.awayScore, oppScore: g.homeScore, result: awayResult });
      }
    });
  });
  return log;
}

function streakString(games) {
  if (!games.length) return '';
  const last = games[games.length - 1].result;
  let count = 0;
  for (let i = games.length - 1; i >= 0; i--) {
    if (games[i].result !== last) break;
    count++;
  }
  return `${last}${count}`;
}

/* Computes each team's record (wins/losses/ties, PF/PA, streak, game
   log) purely from completed games in matchups.json. This is the
   single source of truth for standings — data/teams.json's wins/
   losses/pointsFor/pointsAgainst/streak fields are not used anymore. */
function computeRecords(teams, matchups) {
  const gameLog = buildGameLog(teams, matchups);
  const records = {};
  teams.forEach(t => {
    const games = gameLog.get(t.id) || [];
    let wins = 0, losses = 0, ties = 0, pointsFor = 0, pointsAgainst = 0;
    games.forEach(g => {
      if (g.result === 'W') wins++;
      else if (g.result === 'L') losses++;
      else ties++;
      pointsFor += g.teamScore;
      pointsAgainst += g.oppScore;
    });
    const gamesPlayed = games.length;
    records[t.id] = {
      teamId: t.id,
      wins, losses, ties,
      pointsFor, pointsAgainst,
      gamesPlayed,
      winPct: gamesPlayed ? (wins + ties * 0.5) / gamesPlayed : 0,
      streak: streakString(games),
      gameLog: games,
    };
  });
  return records;
}

/* ---------- head-to-head tiebreaker cascade ---------- */

function allPairsPlayed(teamIds, records) {
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      const played = records[teamIds[i]].gameLog.some(g => g.opponentId === teamIds[j]);
      if (!played) return false;
    }
  }
  return true;
}

function headToHeadPct(teamId, groupIds, records) {
  const groupSet = new Set(groupIds);
  const games = records[teamId].gameLog.filter(g => groupSet.has(g.opponentId));
  if (!games.length) return null;
  let w = 0, t = 0;
  games.forEach(g => { if (g.result === 'W') w++; else if (g.result === 'T') t++; });
  return (w + t * 0.5) / games.length;
}

/* Orders a group of teams tied on win percentage. Peels off one
   winner at a time using the full tiebreaker cascade, then restarts
   the cascade (from head-to-head) on whoever's left — see header
   comment for why. */
function breakTiedGroup(teamIds, records) {
  let remaining = [...teamIds];
  const ordered = [];

  while (remaining.length > 1) {
    let contenders = remaining;

    // Step 1: head-to-head among the remaining teams. Only meaningful
    // once every pair in the group has actually played each other —
    // otherwise we don't have enough information yet and fall through
    // to points for.
    if (allPairsPlayed(remaining, records)) {
      const h2h = remaining.map(id => ({ id, val: headToHeadPct(id, remaining, records) }));
      const maxVal = Math.max(...h2h.map(v => v.val));
      const h2hContenders = h2h.filter(v => v.val === maxVal).map(v => v.id);
      if (h2hContenders.length < remaining.length) contenders = h2hContenders;
    }

    // Step 2: total points for, only if head-to-head didn't separate anyone.
    if (contenders.length === remaining.length) {
      const maxPF = Math.max(...remaining.map(id => records[id].pointsFor));
      const pfContenders = remaining.filter(id => records[id].pointsFor === maxPF);
      if (pfContenders.length < remaining.length) contenders = pfContenders;
    }

    if (contenders.length === remaining.length) {
      // No tiebreaker (defined so far) separates anyone — true dead tie.
      // TODO: extend with another tiebreaker if the league adopts one;
      // for now keep a stable order rather than guessing.
      ordered.push(...contenders);
      remaining = [];
    } else if (contenders.length === 1) {
      ordered.push(contenders[0]);
      remaining = remaining.filter(id => id !== contenders[0]);
    } else {
      // A subset (more than one, fewer than all) separated out as the
      // top tier — order that subset with its own fresh cascade, then
      // continue the outer loop (which restarts at head-to-head) for
      // whoever's left.
      ordered.push(...breakTiedGroup(contenders, records));
      remaining = remaining.filter(id => !contenders.includes(id));
    }
  }
  if (remaining.length === 1) ordered.push(remaining[0]);
  return ordered;
}

/* Ranks a set of team IDs best-to-worst: by win percentage, then by
   the head-to-head/points-for cascade within any group tied on win%. */
function rankTeams(teamIds, records) {
  const byPct = new Map();
  teamIds.forEach(id => {
    const pct = records[id].winPct;
    if (!byPct.has(pct)) byPct.set(pct, []);
    byPct.get(pct).push(id);
  });
  const pcts = [...byPct.keys()].sort((a, b) => b - a);
  const ordered = [];
  pcts.forEach(pct => {
    const group = byPct.get(pct);
    ordered.push(...(group.length > 1 ? breakTiedGroup(group, records) : group));
  });
  return ordered;
}

/* ---------- playoff clinch / elimination ---------- */

function remainingGamesFor(teamId, matchups) {
  const weeks = Object.keys(matchups.weeks).map(Number).sort((a, b) => a - b);
  let count = 0;
  weeks.forEach(w => {
    (matchups.weeks[w] || []).forEach(g => {
      if (g.status === 'final') return;
      if (g.home === teamId || g.away === teamId) count++;
    });
  });
  return count;
}

/* Projects a hypothetical final record set where every team in
   `winners` wins ALL of its remaining games and every other team in
   `teamIds` loses all of ITS remaining games. This exact joint
   scenario may not be realizable (two "winners" might play each
   other), but that only ever makes the projection MORE extreme in
   the direction we're using it for — see computeClinchElimination. */
function projectExtreme(teamIds, records, matchups, winners) {
  const winnerSet = new Set(winners);
  const projected = {};
  teamIds.forEach(id => {
    const base = records[id];
    const rem = remainingGamesFor(id, matchups);
    const wins = base.wins + (winnerSet.has(id) ? rem : 0);
    const losses = base.losses + (winnerSet.has(id) ? 0 : rem);
    const gamesPlayed = base.gamesPlayed + rem;
    projected[id] = {
      ...base,
      wins, losses, gamesPlayed,
      winPct: gamesPlayed ? (wins + base.ties * 0.5) / gamesPlayed : 0,
      // gameLog intentionally left as real games only — head-to-head
      // among hypothetical future games isn't knowable, so projected
      // ties fall through to points for, which stays conservative.
    };
  });
  return projected;
}

/* For each team: 'clinched' (guaranteed a top-N division finish no
   matter what happens), 'eliminated' (cannot possibly reach a top-N
   finish), or 'alive'. Uses a best-case/worst-case bound rather than
   exhaustively enumerating every possible remaining outcome — that's
   the standard "magic number" approach and it is safe in both
   directions: it will never call a clinch or elimination early, it
   can only be conservative (a game or two late) in rare edge cases
   where two contenders' hypothetical "both win out" paths overlap. */
function computeClinchElimination(teams, matchups, league) {
  const records = computeRecords(teams, matchups);
  const spots = league.playoffSpotsPerDivision || 4;
  const results = {};

  const divisions = {};
  teams.forEach(t => (divisions[t.division] = divisions[t.division] || []).push(t.id));

  Object.values(divisions).forEach(divTeamIds => {
    divTeamIds.forEach(teamId => {
      const others = divTeamIds.filter(id => id !== teamId);

      const bestCase = projectExtreme(divTeamIds, records, matchups, [teamId]);
      const bestCaseRank = rankTeams(divTeamIds, bestCase).indexOf(teamId);

      const worstCase = projectExtreme(divTeamIds, records, matchups, others);
      const worstCaseRank = rankTeams(divTeamIds, worstCase).indexOf(teamId);

      if (bestCaseRank >= spots) {
        results[teamId] = 'eliminated';
      } else if (worstCaseRank < spots) {
        results[teamId] = 'clinched';
      } else {
        results[teamId] = 'alive';
      }
    });
  });

  return { records, status: results };
}

/* Builds the {team, text} list the UI renders in the playoff picture
   section, from real clinch/elimination status. */
function buildClinchScenarios(teams, matchups, league) {
  const { status } = computeClinchElimination(teams, matchups, league);
  const teams_by_id = teamMap(teams);
  const entries = [];

  teams.forEach(t => {
    if (status[t.id] === 'clinched') {
      entries.push({ team: t.id, type: 'clinched', text: `have clinched a playoff spot in the ${t.division} Division.` });
    } else if (status[t.id] === 'eliminated') {
      entries.push({ team: t.id, type: 'eliminated', text: `have been eliminated from playoff contention.` });
    }
  });

  // clinched teams first, then eliminated
  entries.sort((a, b) => (a.type === b.type ? 0 : a.type === 'clinched' ? -1 : 1));
  return entries;
}

/* =========================================================
   Playoff odds simulation — Monte Carlo season replay.

   Playoff bracket (as specified by the commissioner): each division's
   top 4 (by regular-season standing) play a single-elimination bracket
   seeded 1v4 and 2v3; the two semifinal winners play a division final;
   the two division champions then play a championship game. Semifinal
   losers are eliminated — no consolation bracket.

   For each trial: every remaining regular-season game gets a sampled
   score for both teams (drawn from each team's own scoring average/
   spread, blended toward the league average when a team has few games
   played, so early-season odds aren't overconfident on tiny samples).
   Those results are run through the exact same tiebreaker cascade
   used everywhere else on the site to seed the division, then the
   bracket is played out the same way. Repeating this thousands of
   times and counting outcomes gives playoff / division / championship
   odds. This is the standard approach real playoff-odds calculators
   use — exhaustively enumerating every possible outcome isn't
   tractable at this scale.
   ========================================================= */

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function sampleStdev(arr, avg) {
  if (arr.length < 2) return null;
  const variance = arr.reduce((s, x) => s + (x - avg) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

/* Box-Muller transform for a sampled Normal(mean, stdev) score. */
function sampleNormal(avg, stdev) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return avg + z * stdev;
}

/* Per-team scoring model, shrunk toward the league average when a
   team has only played a few games (so week-1 randomness doesn't
   produce overconfident odds). A team with zero games played gets
   the pure league-average model. */
function buildScoreModel(teams, records) {
  const allScores = [];
  teams.forEach(t => records[t.id].gameLog.forEach(g => allScores.push(g.teamScore)));
  const leagueMean = allScores.length ? mean(allScores) : 115;
  const leagueStdev = Math.max(sampleStdev(allScores, leagueMean) ?? 20, 8);

  const SHRINK_GAMES = 3; // "phantom" league-average games blended into small samples
  const model = { __league: { mean: leagueMean, stdev: leagueStdev } };

  teams.forEach(t => {
    const scores = records[t.id].gameLog.map(g => g.teamScore);
    const n = scores.length;
    if (n === 0) {
      model[t.id] = { mean: leagueMean, stdev: leagueStdev };
      return;
    }
    const teamMean = mean(scores);
    const teamStdev = Math.max(sampleStdev(scores, teamMean) ?? leagueStdev, 8);
    const weight = n / (n + SHRINK_GAMES);
    model[t.id] = {
      mean: weight * teamMean + (1 - weight) * leagueMean,
      stdev: weight * teamStdev + (1 - weight) * leagueStdev,
    };
  });
  return model;
}

function scoreFor(teamId, scoreModel) {
  const m = scoreModel[teamId] || scoreModel.__league;
  return sampleNormal(m.mean, m.stdev);
}

/* Samples one hypothetical result for every not-yet-final game. */
function simulateRemainingSchedule(matchups, scoreModel) {
  const results = [];
  const weeks = Object.keys(matchups.weeks).map(Number).sort((a, b) => a - b);
  weeks.forEach(w => {
    (matchups.weeks[w] || []).forEach(g => {
      if (g.status === 'final') return;
      results.push({
        week: w, home: g.home, away: g.away,
        homeScore: scoreFor(g.home, scoreModel),
        awayScore: scoreFor(g.away, scoreModel),
      });
    });
  });
  return results;
}

/* Extends the real (already-played) records with one trial's worth of
   simulated remaining games, producing a full hypothetical final
   season in the same shape rankTeams()/breakTiedGroup() expect. */
function buildTrialRecords(teams, baseRecords, simulatedGames) {
  const trial = {};
  teams.forEach(t => {
    const base = baseRecords[t.id];
    trial[t.id] = {
      teamId: t.id,
      wins: base.wins, losses: base.losses, ties: base.ties,
      pointsFor: base.pointsFor, pointsAgainst: base.pointsAgainst,
      gameLog: [...base.gameLog],
    };
  });

  function applyResult(teamId, opponentId, week, teamScore, oppScore) {
    const rec = trial[teamId];
    if (!rec) return;
    const result = teamScore > oppScore ? 'W' : teamScore < oppScore ? 'L' : 'T';
    rec.gameLog.push({ week, opponentId, teamScore, oppScore, result });
    if (result === 'W') rec.wins++; else if (result === 'L') rec.losses++; else rec.ties++;
    rec.pointsFor += teamScore;
    rec.pointsAgainst += oppScore;
  }

  simulatedGames.forEach(g => {
    applyResult(g.home, g.away, g.week, g.homeScore, g.awayScore);
    applyResult(g.away, g.home, g.week, g.awayScore, g.homeScore);
  });

  teams.forEach(t => {
    const r = trial[t.id];
    const gp = r.wins + r.losses + r.ties;
    r.gamesPlayed = gp;
    r.winPct = gp ? (r.wins + r.ties * 0.5) / gp : 0;
  });
  return trial;
}

function simulateBracketGame(idA, idB, scoreModel) {
  return scoreFor(idA, scoreModel) >= scoreFor(idB, scoreModel) ? idA : idB;
}

/* Plays out one trial's bracket: division semis (1v4, 2v3) -> division
   final -> championship. `seedsByDivision` must already be ranked
   1-4 (best first) per division. */
function simulateBracket(seedsByDivision, scoreModel) {
  const divisionChampions = {};
  Object.entries(seedsByDivision).forEach(([div, seeds]) => {
    const semiA = simulateBracketGame(seeds[0], seeds[3], scoreModel); // 1 vs 4
    const semiB = simulateBracketGame(seeds[1], seeds[2], scoreModel); // 2 vs 3
    divisionChampions[div] = simulateBracketGame(semiA, semiB, scoreModel);
  });
  const [divA, divB] = Object.keys(divisionChampions);
  const champion = divB
    ? simulateBracketGame(divisionChampions[divA], divisionChampions[divB], scoreModel)
    : divisionChampions[divA];
  return { divisionChampions, champion };
}

/* Runs the full Monte Carlo simulation and returns, per team,
   { playoffPct, divisionPct, championshipPct } — the live replacement
   for the placeholder odds previously seeded in league.json. */
function runSeasonSimulation(teams, matchups, league, trials = 3000) {
  const baseRecords = computeRecords(teams, matchups);
  const scoreModel = buildScoreModel(teams, baseRecords);
  const spots = league.playoffSpotsPerDivision || 4;

  const divisions = {};
  teams.forEach(t => (divisions[t.division] = divisions[t.division] || []).push(t.id));

  const counts = {};
  teams.forEach(t => { counts[t.id] = { playoffs: 0, division: 0, championship: 0 }; });

  for (let i = 0; i < trials; i++) {
    const simGames = simulateRemainingSchedule(matchups, scoreModel);
    const trialRecords = buildTrialRecords(teams, baseRecords, simGames);

    const seeds = {};
    Object.entries(divisions).forEach(([div, ids]) => {
      const ranked = rankTeams(ids, trialRecords);
      seeds[div] = ranked.slice(0, spots); // bracket assumes a 1v4/2v3 shape, i.e. spots === 4
      seeds[div].forEach(id => counts[id].playoffs++);
    });

    const { divisionChampions, champion } = simulateBracket(seeds, scoreModel);
    Object.values(divisionChampions).forEach(id => counts[id].division++);
    if (champion) counts[champion].championship++;
  }

  const odds = {};
  teams.forEach(t => {
    odds[t.id] = {
      playoffPct: Math.round((counts[t.id].playoffs / trials) * 100),
      divisionPct: Math.round((counts[t.id].division / trials) * 100),
      championshipPct: Math.round((counts[t.id].championship / trials) * 100),
    };
  });
  return odds;
}
