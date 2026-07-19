import { Link } from 'react-router-dom';
import type { Team } from '../data/types';
import TeamLogo from './TeamLogo';

export default function StandingsTable({
  division,
  teams,
}: {
  division: string;
  teams: Team[];
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#1a1a1a] bg-[#111111]">
      <div className="border-b border-[#1a1a1a] bg-black/40 px-4 py-3">
        <h3 className="font-mono text-sm font-semibold tracking-widest text-[#D4A017] uppercase">
          {division} Division
        </h3>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs tracking-wider text-neutral-500 uppercase">
            <th className="px-4 py-2 font-medium">#</th>
            <th className="px-2 py-2 font-medium">Team</th>
            <th className="px-2 py-2 font-medium">Record</th>
            <th className="px-2 py-2 font-medium">PF</th>
            <th className="px-2 py-2 font-medium">PA</th>
            <th className="px-4 py-2 font-medium">Streak</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team, i) => (
            <tr
              key={team.id}
              className="border-t border-[#1a1a1a] hover:bg-white/5"
            >
              <td className="px-4 py-2 text-neutral-500">{i + 1}</td>
              <td className="px-2 py-2">
                <Link
                  to={`/team/${team.id}`}
                  className="flex items-center gap-2 font-medium text-neutral-100 hover:text-[#D4A017]"
                >
                  <TeamLogo team={team} size={26} />
                  <span className="truncate">{team.name}</span>
                </Link>
              </td>
              <td className="px-2 py-2 font-mono text-neutral-300">0-0</td>
              <td className="px-2 py-2 font-mono text-neutral-300">0.0</td>
              <td className="px-2 py-2 font-mono text-neutral-300">0.0</td>
              <td className="px-4 py-2 font-mono text-neutral-500">—</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
