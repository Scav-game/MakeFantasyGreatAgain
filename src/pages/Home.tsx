import { Link } from 'react-router-dom';
import {
  teams,
  teamsById,
  HOME_HERO,
  HERO_BASE_PATH,
  CURRENT_WEEK,
} from '../data/teams';
import { schedule } from '../data/schedule';
import StandingsTable from '../components/StandingsTable';
import TeamLogo from '../components/TeamLogo';

const eastTeams = teams.filter((t) => t.division === 'East');
const westTeams = teams.filter((t) => t.division === 'West');
const weekMatchups = schedule[CURRENT_WEEK];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-neutral-100">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-[#1a1a1a] bg-[#0A0A0A]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="font-mono text-2xl font-extrabold tracking-widest text-[#D4A017]"
          >
            MFGA
          </Link>
          <nav className="hidden gap-8 font-mono text-sm tracking-wide text-neutral-300 md:flex">
            <a href="#standings" className="hover:text-[#D4A017]">
              Standings
            </a>
            <a href="#matchups" className="hover:text-[#D4A017]">
              Matchups
            </a>
            <a href="#trade-block" className="hover:text-[#D4A017]">
              Trade Block
            </a>
            <a href="#playoffs" className="hover:text-[#D4A017]">
              Playoffs
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative flex min-h-[70vh] items-center bg-cover bg-center"
        style={{
          backgroundImage: `url('${HERO_BASE_PATH}${HOME_HERO}')`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
        <div className="relative mx-auto max-w-7xl px-6 py-24">
          <h1 className="font-mono text-6xl leading-none font-extrabold tracking-tight text-white sm:text-8xl">
            MFGA
          </h1>
          <p className="mt-4 text-2xl font-semibold text-[#D4A017] sm:text-4xl">
            Make Fantasy Great Again
          </p>
          <p className="mt-3 font-mono text-sm tracking-widest text-neutral-300 uppercase">
            2026 Season
          </p>
        </div>
      </section>

      {/* Scoreboard ticker */}
      <div className="overflow-x-auto border-b border-[#1a1a1a] bg-[#111111]">
        <div className="mx-auto flex max-w-7xl gap-6 px-6 py-3 whitespace-nowrap">
          {weekMatchups.map((m, i) => {
            const home = teamsById[m.home];
            const away = teamsById[m.away];
            return (
              <div
                key={i}
                className="flex items-center gap-2 font-mono text-sm text-neutral-300"
              >
                <span className="font-semibold text-neutral-100">
                  {away.abbr}
                </span>
                <span className="text-neutral-500">0</span>
                <span className="text-neutral-600">–</span>
                <span className="text-neutral-500">0</span>
                <span className="font-semibold text-neutral-100">
                  {home.abbr}
                </span>
                {i !== weekMatchups.length - 1 && (
                  <span className="ml-6 text-neutral-700">|</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <main className="mx-auto max-w-7xl space-y-16 px-6 py-16">
        {/* Standings */}
        <section id="standings" className="scroll-mt-20">
          <h2 className="mb-6 font-mono text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase">
            Standings
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <StandingsTable division="East" teams={eastTeams} />
            <StandingsTable division="West" teams={westTeams} />
          </div>
        </section>

        {/* This week's matchups */}
        <section id="matchups" className="scroll-mt-20">
          <h2 className="mb-6 font-mono text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase">
            Week {CURRENT_WEEK} Matchups
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {weekMatchups.map((m, i) => {
              const home = teamsById[m.home];
              const away = teamsById[m.away];
              return (
                <div
                  key={i}
                  className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-4"
                >
                  <div className="flex items-center justify-between">
                    <Link
                      to={`/team/${away.id}`}
                      className="flex items-center gap-2 hover:text-[#D4A017]"
                    >
                      <TeamLogo team={away} size={32} />
                      <span className="text-sm font-medium">{away.abbr}</span>
                    </Link>
                    <span className="font-mono text-xs text-neutral-600">
                      VS
                    </span>
                    <Link
                      to={`/team/${home.id}`}
                      className="flex items-center gap-2 hover:text-[#D4A017]"
                    >
                      <span className="text-sm font-medium">{home.abbr}</span>
                      <TeamLogo team={home} size={32} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Trade block */}
        <section id="trade-block" className="scroll-mt-20">
          <h2 className="mb-6 font-mono text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase">
            Trade Block
          </h2>
          <div className="overflow-hidden rounded-lg border border-[#1a1a1a] bg-[#111111]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs tracking-wider text-neutral-500 uppercase">
                  <th className="px-4 py-3 font-medium">Player</th>
                  <th className="px-2 py-3 font-medium">Pos</th>
                  <th className="px-2 py-3 font-medium">NFL Team</th>
                  <th className="px-2 py-3 font-medium">Fantasy Team</th>
                  <th className="px-4 py-3 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-[#1a1a1a]">
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-neutral-500"
                  >
                    No players on the trade block yet.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Playoff picture */}
        <section id="playoffs" className="scroll-mt-20">
          <h2 className="mb-6 font-mono text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase">
            Playoff Picture
          </h2>
          <div className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-10 text-center">
            <p className="font-semibold text-neutral-200">
              Clinch scenarios will appear after Week 10.
            </p>
            <p className="mt-2 font-mono text-sm text-neutral-500">
              Championship odds — TBD
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1a1a1a] bg-[#111111]">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 md:grid-cols-7">
            {teams.map((team) => (
              <Link
                key={team.id}
                to={`/team/${team.id}`}
                className="truncate text-sm text-neutral-400 hover:text-[#D4A017]"
              >
                {team.name}
              </Link>
            ))}
          </div>
          <p className="mt-10 font-mono text-xs tracking-widest text-neutral-600 uppercase">
            MFGA — Make Fantasy Great Again — 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
