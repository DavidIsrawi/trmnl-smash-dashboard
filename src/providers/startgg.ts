import { GraphQLClient } from "graphql-request";
import { STARTGG_API_URL } from "../constants.js";
import { GET_CURRENT_USER } from "../queries/user.js";
import {
  GET_UPCOMING_TOURNAMENTS,
  GET_RECENT_EVENTS,
} from "../queries/tournaments.js";
import { GET_PLAYER_SETS } from "../queries/sets.js";
import {
  getCharacterName,
  getCharacterStockIcon,
  getCharacterIcon,
} from "../characters.js";
import {
  calculateDaysRemaining,
  formatDate,
  calculateUpsetFactor,
} from "../utils.js";
import type {
  ISmashData,
  SmashPluginData,
  User,
  UpcomingTournament,
  RecentEventNode,
  Set,
} from "../types.js";
import {
  CharacterInfo,
  EventSetRecord,
  ProcessedEvent,
  ProcessedTournament,
} from "./startgg.types.js";

export class StartGGSmashData implements ISmashData {
  private client: GraphQLClient;
  private cachedUser: User | null = null;

  constructor(token: string) {
    this.client = new GraphQLClient(STARTGG_API_URL, {
      headers: { authorization: `Bearer ${token}` },
    });
  }

  async fetchData(): Promise<SmashPluginData> {
    const userData = await this.fetchCurrentUser();

    console.log(
      `User found: ${userData.player.gamerTag} (ID: ${userData.player.id})`,
    );

    const [upcoming, recentEvents, recentSets] = await Promise.all([
      this.fetchUpcomingTournaments(userData.id),
      this.fetchRecentEvents(userData.id),
      this.fetchPlayerSets(userData.player.id, 1, 25),
    ]);

    return this.buildPayload(userData, upcoming, recentEvents, recentSets);
  }

  // ─── API Methods ─────────────────────────────────────────────────

  private async fetchCurrentUser(): Promise<User> {
    if (this.cachedUser) return this.cachedUser;

    const data = await this.client.request<{ currentUser: User }>(
      GET_CURRENT_USER,
    );
    if (!data.currentUser) {
      throw new Error(
        "Could not resolve user from token. Is your STARTGG_TOKEN valid?",
      );
    }

    this.cachedUser = data.currentUser;
    return data.currentUser;
  }

  private async fetchUpcomingTournaments(
    userId: string,
  ): Promise<UpcomingTournament[]> {
    try {
      const data = await this.client.request<{
        user: { tournaments: { nodes: UpcomingTournament[] } };
      }>(GET_UPCOMING_TOURNAMENTS, { userId });
      return data.user.tournaments.nodes;
    } catch (e) {
      console.error("Error fetching upcoming tournaments:", e);
      return [];
    }
  }

  private async fetchRecentEvents(userId: string): Promise<ProcessedEvent[]> {
    try {
      const data = await this.client.request<{
        user: { events: { nodes: RecentEventNode[] } };
      }>(GET_RECENT_EVENTS, { userId });

      return data.user.events.nodes.map((node) => ({
        ...node,
        placement: node.userEntrant?.standing?.placement || 0,
        initialSeedNum: node.userEntrant?.initialSeedNum ?? undefined,
      }));
    } catch (e) {
      console.error("Error fetching recent events:", e);
      return [];
    }
  }

  private async fetchPlayerSets(
    playerId: string,
    page: number,
    perPage: number,
  ): Promise<Set[]> {
    const data = await this.client.request<{
      player: { sets: { nodes: Set[] } };
    }>(GET_PLAYER_SETS, { playerId, page, perPage });
    return data.player.sets.nodes;
  }

  // ─── Processing Logic ────────────────────────────────────────────

  private buildPayload(
    userData: User,
    upcoming: UpcomingTournament[],
    recentEvents: ProcessedEvent[],
    recentSets: Set[],
  ): SmashPluginData {
    const { wins, losses, charUsage } = this.computeSeasonStats(
      recentSets,
      userData.player.id,
    );
    const totalGames = wins + losses;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

    const sortedChars = Object.entries(charUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([idStr, count]) => {
        const charId = Number(idStr);
        return {
          name: getCharacterName(charId),
          usage_count: count,
          image_url: getCharacterStockIcon(charId),
        };
      });

    const nextTournament = upcoming[0]
      ? {
          name: upcoming[0].name,
          days_remaining: calculateDaysRemaining(upcoming[0].startAt),
          image_url: upcoming[0].images.find((i) => i.type === "profile")?.url,
        }
      : undefined;

    const latestEvent = recentEvents[0];
    const latestResult = latestEvent
      ? this.processTournament(
          latestEvent,
          this.computeEventRecord(
            recentSets,
            latestEvent.id,
            userData.player.id,
          ),
          this.findMostPlayedCharInEvent(
            recentSets,
            latestEvent.id,
            userData.player.id,
          ),
        )
      : undefined;

    const previousEvent = recentEvents[1];
    const previousResult = previousEvent
      ? this.processTournament(
          previousEvent,
          this.computeEventRecord(
            recentSets,
            previousEvent.id,
            userData.player.id,
          ),
          this.findMostPlayedCharInEvent(
            recentSets,
            previousEvent.id,
            userData.player.id,
          ),
        )
      : undefined;

    return {
      user: {
        gamerTag: userData.player.gamerTag,
        images: userData.images,
      },
      season: {
        win_rate: winRate,
        wins,
        losses,
        top_chars: sortedChars,
      },
      next_tournament: nextTournament,
      latest_result: latestResult,
      previous_result: previousResult,
    };
  }

  private processTournament(
    event: ProcessedEvent,
    eventSetRecord: EventSetRecord,
    characterInfo: CharacterInfo | undefined,
  ): ProcessedTournament {
    return {
      rank: event.placement,
      upset_factor:
        event.initialSeedNum && event.placement
          ? calculateUpsetFactor(event.initialSeedNum, event.placement)
          : undefined,
      event_name: event.name,
      tournament_name: event.tournament.name,
      date: formatDate(event.tournament.startAt),
      location: event.tournament.city || "Online",
      entrants: event.numEntrants,
      wins: eventSetRecord.wins,
      losses: eventSetRecord.losses,
      char_played: characterInfo?.name,
      char_image_url: characterInfo?.icon,
    };
  }

  private computeSeasonStats(
    recentSets: Set[],
    playerId: string,
  ): { wins: number; losses: number; charUsage: Record<string, number> } {
    let wins = 0;
    let losses = 0;
    const charUsage: Record<string, number> = {};

    for (const set of recentSets) {
      const userSlotIndex = set.slots.findIndex((s) =>
        s.entrant.participants.some((p) => p.player.id === playerId),
      );

      if (userSlotIndex === -1) continue;

      const userEntrantId = Number(set.slots[userSlotIndex].entrant.id);

      if (set.games) {
        for (const game of set.games) {
          if (game.winnerId === userEntrantId) wins++;
          else losses++;

          if (!game.selections) continue;
          const selection = game.selections.find((s) =>
            s.entrant.participants.some((p) => p.player.id === playerId),
          );
          if (selection) {
            const charId = selection.selectionValue;
            charUsage[charId] = (charUsage[charId] || 0) + 1;
          }
        }
      }
    }

    return { wins, losses, charUsage };
  }

  private computeEventRecord(
    recentSets: Set[],
    eventId: string,
    playerId: string,
  ): { wins: number; losses: number } {
    let wins = 0;
    let losses = 0;

    const eventSets = recentSets.filter((s) => s.event.id === eventId);

    for (const set of eventSets) {
      const userSlotIndex = set.slots.findIndex((s) =>
        s.entrant.participants.some((p) => p.player.id === playerId),
      );

      if (userSlotIndex === -1) continue;

      const userEntrantId = Number(set.slots[userSlotIndex].entrant.id);

      if (set.winnerId === userEntrantId) wins++;
      else losses++;
    }

    return { wins, losses };
  }

  private findMostPlayedCharInEvent(
    recentSets: Set[],
    eventId: string,
    playerId: string,
  ): { name: string; icon?: string } | undefined {
    const charCounts: Record<number, number> = {};

    const eventSets = recentSets.filter((s) => s.event.id === eventId);

    for (const set of eventSets) {
      const userSlotIndex = set.slots.findIndex((s) =>
        s.entrant.participants.some((p) => p.player.id === playerId),
      );

      if (userSlotIndex !== -1 && set.games) {
        for (const game of set.games) {
          if (!game.selections) continue;
          const selection = game.selections.find((s) =>
            s.entrant.participants.some((p) => p.player.id === playerId),
          );
          if (selection) {
            charCounts[selection.selectionValue] =
              (charCounts[selection.selectionValue] || 0) + 1;
          }
        }
      }
    }

    const entries = Object.entries(charCounts);
    if (entries.length === 0) return undefined;

    const [topCharIdStr] = entries.sort(([, a], [, b]) => b - a)[0];
    const topCharId = Number(topCharIdStr);

    return {
      name: getCharacterName(topCharId),
      icon: getCharacterIcon(topCharId),
    };
  }
}
