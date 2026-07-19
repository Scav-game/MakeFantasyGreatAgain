import { Link, useParams, Navigate } from 'react-router-dom';
import { teams, teamsById, HERO_BASE_PATH, CURRENT_WEEK } from '../data/teams';
import { getTeamSchedule } from '../data/schedule';
import TeamLogo from '../components/TeamLogo';

const STARTER_SLOTS = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF'];
const BENCH_SLOTS = ['BN', 'BN', 'BN', 'BN', 'BN', 'IR'];

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

export default function TeamPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const team = teamId ? teamsById[teamId] : undefined;

  if (!team) {
    return <Navigate to="/" replace />;
  }

  const divisionRivals = teams.filter(
    (t) => t.division === team.division && t.id !== team.id,
  );
  const fullSchedule = getTeamSchedule(team.id);
  const upcoming = fullSchedule
    .filter((row) => !row.isBye && row.week >= CURRENT_WEEK)
    .slice(0, 5);
  const nextGame = upcoming[0];
  const nextOpponent = nextGame?.opponent ? teamsById[nextGame.opponent] : null;
  const nextGameStadium = nextGame
    ? nextGame.isHome
      ? team.stadium
      : nextOpponent?.stadium
    : null;

  const nameWords = team.name.split(' ');
  const rgb = hexToRgb(team.colors.bg);
  const overlayGradient = `linear-gradient(to right, rgba(${rgb.r},${rgb.g},${rgb.b},0.92) 0%, rgba(0,0,0,0.75) 45%, rgba(0,0,0,0.35) 100%)`;

  return (
    <div
      className="min-h-screen text-neutral-100"
      style={{ backgroundColor: team.colors.bg }}
    >
      {/* Nav */}
      <header
        className="sticky top-0 z-30 border-b border-white/10 backdrop-blur"
        style={{
          backgroundColor: `rgba(${rgb.r},${rgb.g},${rgb.b},0.9)`,
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link to={`/team/${team.id}`} className="flex items-center gap-3">
            <TeamLogo team={team} size={36} />
            <span className={`${team.fontClass} text-xl tracking-wide`}>
              {team.name}
            </span>
          </Link>
          <nav className="flex gap-6 font-mono text-xs tracking-widest text-neutral-300 uppercase">
            <Link to="/" className="hover:text-white">
              Home
            </Link>
            <a href="#team" className="hover:text-white">
              Team
            </a>
            <a href="#schedule" className="hover:text-white">
              Schedule
            </a>
            <a href="#draft" className="hover:text-white">
              Draft
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="flex min-h-[560px] flex-col lg:flex-row">
        <div
          className="relative flex min-h-[380px] flex-1 basis-[65%] items-end bg-cover bg-center p-8 sm:p-12 lg:min-h-[560px]"
          style={{
            backgroundImage: team.heroImage
              ? `url('${HERO_BASE_PATH}${team.heroImage}')`
              : `linear-gradient(160deg, ${team.colors.primary}, ${team.colors.bg})`,
          }}
        >
          <div
            className="absolute inset-0"
            style={{ backgroundImage: overlayGradient }}
          />
          <div className="relative">
            <h1
              className={`${team.fontClass} text-5xl leading-[0.95] font-bold text-white sm:text-6xl lg:text-7xl`}
            >
              {nameWords.map((word, i) => (
                <span
                  key={i}
                  style={i === 1 ? { color: team.colors.accent } : undefined}
                >
                  {word}
                  {i !== nameWords.length - 1 ? ' ' : ''}
                </span>
              ))}
            </h1>
            <p className="mt-4 max-w-lg text-lg text-neutral-200">
              {team.tagline}
            </p>
            <p className="mt-1 font-mono text-xs tracking-widest text-neutral-400 uppercase">
              Owned by {team.owner}
            </p>
            <a
              href="#schedule"
              className="mt-6 inline-block rounded px-6 py-3 font-mono text-sm font-bold tracking-widest uppercase"
              style={{
                backgroundColor: team.colors.accent,
                color: team.colors.bg,
              }}
            >
              View Schedule
            </a>
          </div>
        </div>

        {/* Sidebar */}
        <div
          className="flex flex-1 basis-[35%] flex-col gap-4 border-t border-white/10 p-6 lg:border-t-0 lg:border-l"
          style={{
            backgroundColor: `rgba(0,0,0,0.35)`,
            borderColor: 'rgba(255,255,255,0.1)',
          }}
        >
          {/* Next game */}
          <div className="rounded-lg border border-white/10 bg-black/40 p-5">
            <p className="mb-4 font-mono text-xs font-semibold tracking-widest text-neutral-400 uppercase">
              Next Game
            </p>
            <div className="flex items-center justify-between">
              <TeamLogo team={team} size={48} />
              <span
                className="font-mono text-sm font-bold"
                style={{ color: team.colors.accent }}
              >
                VS
              </span>
              {nextOpponent ? (
                <TeamLogo team={nextOpponent} size={48} />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-md border-2 border-dashed border-neutral-600 text-xs text-neutral-500">
                  BYE
                </div>
              )}
            </div>
            <p className="mt-4 text-sm text-neutral-300">
              {nextGame ? `Week ${nextGame.week} · 2026 Season` : 'Bye week'}
            </p>
            <p className="text-sm text-neutral-500">
              {nextGameStadium ?? team.stadium}
            </p>
          </div>

          {/* Featured / stats */}
          <div className="rounded-lg border border-white/10 bg-black/40 p-5">
            <p className="mb-4 font-mono text-xs font-semibold tracking-widest text-neutral-400 uppercase">
              Team Stats
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold">0-0</p>
                <p className="font-mono text-xs text-neutral-500 uppercase">
                  Record
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold">0.0</p>
                <p className="font-mono text-xs text-neutral-500 uppercase">
                  Points For
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold">0.0</p>
                <p className="font-mono text-xs text-neutral-500 uppercase">
                  Points Against
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold">—</p>
                <p className="font-mono text-xs text-neutral-500 uppercase">
                  Division Rank
                </p>
              </div>
            </div>
          </div>

          {/* History */}
          <div className="rounded-lg border border-white/10 bg-black/40 p-5">
            <p className="mb-3 font-mono text-xs font-semibold tracking-widest text-neutral-400 uppercase">
              Team History
            </p>
            <p className="text-sm font-semibold text-neutral-200">
              2026 — Current Season
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Season history will appear here once the year concludes.
            </p>
          </div>
        </div>
      </section>

      {/* Schedule strip */}
      <section
        id="schedule"
        className="scroll-mt-16 border-y border-white/10 bg-black/30"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-6 py-4">
          <span className="font-mono text-xs font-semibold tracking-widest text-neutral-400 uppercase">
            Schedule
          </span>
          {upcoming.map((row) => {
            const opp = row.opponent ? teamsById[row.opponent] : null;
            return (
              <div
                key={row.week}
                className="flex shrink-0 items-center gap-2 rounded border border-white/10 bg-black/40 px-3 py-2"
              >
                <span className="font-mono text-xs text-neutral-500">
                  WK{row.week}
                </span>
                {opp ? (
                  <>
                    <span className="text-xs text-neutral-500">
                      {row.isHome ? 'vs' : '@'}
                    </span>
                    <span className="text-sm font-semibold text-neutral-100">
                      {opp.abbr}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-neutral-500">BYE</span>
                )}
              </div>
            );
          })}
          <a
            href="#full-schedule"
            className="ml-auto shrink-0 font-mono text-xs font-semibold tracking-widest whitespace-nowrap uppercase hover:underline"
            style={{ color: team.colors.accent }}
          >
            View Full Schedule →
          </a>
        </div>
      </section>

      <main id="team" className="mx-auto max-w-7xl space-y-16 px-6 py-16">
        {/* Roster */}
        <section>
          <h2 className="mb-6 font-mono text-xs font-semibold tracking-[0.2em] text-neutral-400 uppercase">
            Full Roster
          </h2>
          <div className="overflow-hidden rounded-lg border border-white/10 bg-black/30">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs tracking-wider text-neutral-500 uppercase">
                  <th className="px-4 py-3 font-medium">Pos</th>
                  <th className="px-2 py-3 font-medium">Player</th>
                  <th className="px-2 py-3 font-medium">NFL Team</th>
                  <th className="px-2 py-3 font-medium">Bye</th>
                  <th className="px-2 py-3 font-medium">Pts</th>
                  <th className="px-2 py-3 font-medium">Avg</th>
                  <th className="px-4 py-3 font-medium">Trade</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    colSpan={7}
                    className="bg-white/5 px-4 py-1 font-mono text-[10px] font-semibold tracking-widest text-neutral-500 uppercase"
                  >
                    Starters
                  </td>
                </tr>
                {STARTER_SLOTS.map((pos, i) => (
                  <tr key={`start-${i}`} className="border-t border-white/5">
                    <td className="px-4 py-2 font-mono text-neutral-400">
                      {pos}
                    </td>
                    <td className="px-2 py-2 text-neutral-600">—</td>
                    <td className="px-2 py-2 text-neutral-600">—</td>
                    <td className="px-2 py-2 text-neutral-600">—</td>
                    <td className="px-2 py-2 text-neutral-600">—</td>
                    <td className="px-2 py-2 text-neutral-600">—</td>
                    <td className="px-4 py-2">
                      <button
                        className="rounded border border-white/20 px-3 py-1 font-mono text-xs text-neutral-400 hover:border-white/40 hover:text-white"
                        disabled
                      >
                        Trade
                      </button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td
                    colSpan={7}
                    className="bg-white/5 px-4 py-1 font-mono text-[10px] font-semibold tracking-widest text-neutral-500 uppercase"
                  >
                    Bench
                  </td>
                </tr>
                {BENCH_SLOTS.map((pos, i) => (
                  <tr key={`bench-${i}`} className="border-t border-white/5">
                    <td className="px-4 py-2 font-mono text-neutral-400">
                      {pos}
                    </td>
                    <td className="px-2 py-2 text-neutral-600">—</td>
                    <td className="px-2 py-2 text-neutral-600">—</td>
                    <td className="px-2 py-2 text-neutral-600">—</td>
                    <td className="px-2 py-2 text-neutral-600">—</td>
                    <td className="px-2 py-2 text-neutral-600">—</td>
                    <td className="px-4 py-2">
                      <button
                        className="rounded border border-white/20 px-3 py-1 font-mono text-xs text-neutral-400 hover:border-white/40 hover:text-white"
                        disabled
                      >
                        Trade
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Full schedule */}
        <section id="full-schedule" className="scroll-mt-16">
          <h2 className="mb-6 font-mono text-xs font-semibold tracking-[0.2em] text-neutral-400 uppercase">
            Full Schedule
          </h2>
          <div className="overflow-hidden rounded-lg border border-white/10 bg-black/30">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs tracking-wider text-neutral-500 uppercase">
                  <th className="px-4 py-3 font-medium">Week</th>
                  <th className="px-2 py-3 font-medium">Opponent</th>
                  <th className="px-2 py-3 font-medium">Result</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {fullSchedule.map((row) => {
                  const opp = row.opponent ? teamsById[row.opponent] : null;
                  return (
                    <tr
                      key={row.week}
                      className={`border-t border-white/5 ${row.isBye ? 'opacity-40' : ''}`}
                    >
                      <td className="px-4 py-2 font-mono text-neutral-400">
                        {row.week}
                      </td>
                      <td className="px-2 py-2">
                        {row.isBye ? (
                          <span className="text-neutral-500">BYE WEEK</span>
                        ) : (
                          <Link
                            to={`/team/${opp!.id}`}
                            className="flex items-center gap-2 font-medium text-neutral-200 hover:text-white"
                          >
                            <span className="font-mono text-xs text-neutral-500">
                              {row.isHome ? 'vs' : '@'}
                            </span>
                            <TeamLogo team={opp!} size={22} />
                            {opp!.name}
                          </Link>
                        )}
                      </td>
                      <td className="px-2 py-2 text-neutral-600">—</td>
                      <td className="px-4 py-2 font-mono text-neutral-600">
                        —
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Draft picks */}
        <section id="draft" className="scroll-mt-16">
          <h2 className="mb-6 font-mono text-xs font-semibold tracking-[0.2em] text-neutral-400 uppercase">
            Draft Picks
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {(['2026', '2027'] as const).map((year) => (
              <div
                key={year}
                className="overflow-hidden rounded-lg border border-white/10 bg-black/30"
              >
                <div className="border-b border-white/10 bg-white/5 px-4 py-3">
                  <h3 className="font-mono text-sm font-semibold tracking-widest text-neutral-300">
                    {year}
                  </h3>
                </div>
                <ul>
                  {['1st', '2nd', '3rd'].map((round) => (
                    <li
                      key={round}
                      className="flex items-center justify-between border-t border-white/5 px-4 py-3 text-sm first:border-t-0"
                    >
                      <span className="font-medium text-neutral-200">
                        {round} Round
                      </span>
                      <span className="font-mono text-xs text-neutral-500">
                        Own pick
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/40">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <p className={`${team.fontClass} text-2xl text-white`}>
            {team.name}
          </p>
          <p className="mt-1 text-sm text-neutral-400">
            {team.stadium} · {team.division} Division
          </p>
          <p className="mt-1 text-xs text-neutral-600">
            Division rivals:{' '}
            {divisionRivals.map((r) => r.abbr).join(' · ')}
          </p>
          <Link
            to="/"
            className="mt-6 inline-block font-mono text-xs font-semibold tracking-widest uppercase hover:underline"
            style={{ color: team.colors.accent }}
          >
            ← Back to League Homepage
          </Link>
        </div>
      </footer>
    </div>
  );
}
