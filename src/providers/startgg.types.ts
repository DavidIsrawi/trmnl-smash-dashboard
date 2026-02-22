export interface ProcessedEvent {
  id: string;
  name: string;
  numEntrants: number;
  placement: number;
  initialSeedNum?: number;
  tournament: {
    name: string;
    startAt: number;
    city?: string;
    addrState?: string;
    images: { url: string; type: string }[];
  };
}

export interface ProcessedTournament {
  rank: number;
  upset_factor?: number;
  event_name: string;
  tournament_name: string;
  date: string;
  location: string;
  entrants: number;
  wins: number;
  losses: number;
  char_image_url?: string;
  char_played?: string;
}

export interface CharacterInfo {
  name: string;
  icon?: string;
}

export interface EventSetRecord {
  wins: number;
  losses: number;
}
