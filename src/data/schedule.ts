import { teams, TOTAL_WEEKS } from './teams';
import type { Matchup } from './types';

type Pair = [string, string];

/** Classic circle-method round robin: n teams (n even) -> n-1 rounds, every pair exactly once. */
function roundRobinRounds(teamIds: string[]): Pair[][] {
  const n = teamIds.length;
  const fixed = teamIds[0];
  const rotating = teamIds.slice(1);
  const rounds: Pair[][] = [];

  for (let r = 0; r < n - 1; r++) {
    const full = [fixed, ...rotating];
    const round: Pair[] = [];
    for (let i = 0; i < n / 2; i++) {
      round.push([full[i], full[n - 1 - i]]);
    }
    rounds.push(round);
    rotating.unshift(rotating.pop()!);
  }
  return rounds;
}

function buildSchedule(): Record<number, Matchup[]> {
  const order = teams.map((t) => t.id);
  const byeWeekOf = new Map(teams.map((t) => [t.id, t.bye]));
  const rounds = roundRobinRounds(order); // 13 rounds for 14 teams

  const weekPairs: Record<number, Pair[]> = {};
  for (let week = 1; week <= 13; week++) {
    weekPairs[week] = rounds[week - 1];
  }
  // Extra 14th week: rematch of round 1 with sides swapped.
  weekPairs[14] = rounds[0].map(([a, b]) => [b, a] as Pair);

  const schedule: Record<number, Matchup[]> = {};

  for (let week = 1; week <= TOTAL_WEEKS; week++) {
    const isBye = (id: string) => byeWeekOf.get(id) === week;
    const pairs = weekPairs[week];
    const finalPairs: Pair[] = [];
    const orphans: string[] = [];

    for (const [a, b] of pairs) {
      const aBye = isBye(a);
      const bBye = isBye(b);
      if (aBye && bBye) continue;
      if (aBye || bBye) {
        orphans.push(aBye ? b : a);
        continue;
      }
      finalPairs.push([a, b]);
    }

    // Pair up any teams whose round-robin opponent had a bye this week.
    orphans.sort((x, y) => order.indexOf(x) - order.indexOf(y));
    for (let i = 0; i < orphans.length; i += 2) {
      if (orphans[i + 1]) finalPairs.push([orphans[i], orphans[i + 1]]);
    }

    schedule[week] = finalPairs.map(([a, b], i) => {
      const flip = (week + i) % 2 === 0;
      return {
        home: flip ? a : b,
        away: flip ? b : a,
        homeScore: null,
        awayScore: null,
      };
    });
  }

  return schedule;
}

export const schedule = buildSchedule();

export function getTeamSchedule(teamId: string) {
  const rows: { week: number; opponent: string | null; isHome: boolean; isBye: boolean }[] = [];
  for (let week = 1; week <= TOTAL_WEEKS; week++) {
    const team = teams.find((t) => t.id === teamId)!;
    if (team.bye === week) {
      rows.push({ week, opponent: null, isHome: false, isBye: true });
      continue;
    }
    const game = schedule[week].find((m) => m.home === teamId || m.away === teamId);
    if (!game) {
      rows.push({ week, opponent: null, isHome: false, isBye: true });
      continue;
    }
    const isHome = game.home === teamId;
    rows.push({
      week,
      opponent: isHome ? game.away : game.home,
      isHome,
      isBye: false,
    });
  }
  return rows;
}
