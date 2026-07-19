export interface TeamColors {
  primary: string;
  accent: string;
  bg: string;
}

export interface Team {
  id: string;
  name: string;
  abbr: string;
  division: 'East' | 'West';
  colors: TeamColors;
  stadium: string;
  city: string;
  tagline: string;
  font: string;
  fontClass: string;
  bye: number;
  owner: string;
  heroImage: string | null;
}

export interface Matchup {
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
}
