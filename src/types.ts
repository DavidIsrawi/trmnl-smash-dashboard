// ─── Start.gg API Types ──────────────────────────────────────────────

import { ProcessedTournament } from "./providers/startgg.types.js";

export interface Image {
  id: string;
  url: string;
  type: string;
}

export interface Player {
  id: string;
  gamerTag: string;
}

export interface User {
  id: string;
  slug: string;
  images: Image[];
  player: Player;
}

export interface Tournament {
  id: string;
  name: string;
  slug: string;
  startAt: number;
  endAt: number;
  images: Image[];
  city?: string;
  addrState?: string;
}

export interface Event {
  id: string;
  name: string;
  numEntrants: number;
  tournament: Tournament;
}

export interface Standing {
  id: string;
  placement: number;
  entrant: {
    id: string;
    name: string;
    event: Event;
  };
}

export interface SetSlot {
  entrant: {
    id: string;
    name: string;
    participants: {
      player: {
        id: string;
        gamerTag: string;
      };
    }[];
  };
}

export interface GameSelection {
  selectionType: string;
  selectionValue: number;
  entrant: {
    id: string;
    participants: {
      player: {
        id: string;
      };
    }[];
  };
}

export interface Game {
  id: string;
  winnerId: number;
  selections: GameSelection[];
}

export interface Set {
  id: string;
  displayScore: string;
  winnerId: number;
  totalGames: number;
  slots: SetSlot[];
  games: Game[];
  event: Event;
  completedAt: number;
}

export interface UpcomingTournament {
  id: string;
  name: string;
  startAt: number;
  images: Image[];
  city?: string;
}

export interface RecentEventNode {
  id: string;
  name: string;
  numEntrants: number;
  tournament: {
    name: string;
    startAt: number;
    city?: string;
    addrState?: string;
    images: { url: string; type: string }[];
  };
  userEntrant?: {
    initialSeedNum?: number;
    standing?: {
      placement: number;
    };
  };
}

// ─── Character Data Types (from smasher project) ─────────────────────

export interface CharacterImage {
  id: number;
  type: 'icon' | 'stockIcon';
  url: string;
}

export interface CharacterData {
  id: number;
  name: string;
  images: CharacterImage[];
}

export interface CharactersJson {
  entities: {
    character: {
      id: number;
      name: string;
      images: {
        id: number;
        type: string;
        url: string;
      }[];
    }[];
  };
}

// ─── Provider Interface ──────────────────────────────────────────────

export interface ISmashData {
  fetchData(): Promise<SmashPluginData>;
}

// ─── Plugin Payload Types ────────────────────────────────────────────

export interface SeasonStats {
  win_rate: number;
  wins: number;
  losses: number;
  top_chars: TopCharacter[];
}

export interface TopCharacter {
  name: string;
  usage_count: number;
  image_url?: string;
}

export interface NextTournament {
  name: string;
  days_remaining: number;
  image_url?: string;
}

export interface SmashPluginData {
  user: {
    gamerTag: string;
    images: Image[];
  };
  season: SeasonStats;
  next_tournament?: NextTournament;
  latest_result?: ProcessedTournament;
  previous_result?: ProcessedTournament;
}
