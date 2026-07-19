import type { Team } from '../data/types';

export default function TeamLogo({
  team,
  size = 40,
}: {
  team: Team;
  size?: number;
}) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-md font-bold"
      style={{
        width: size,
        height: size,
        backgroundColor: team.colors.primary,
        color: team.colors.accent,
        border: `2px solid ${team.colors.accent}`,
        fontSize: Math.max(9, size * 0.3),
        lineHeight: 1,
      }}
      title={team.name}
    >
      {team.abbr}
    </div>
  );
}
