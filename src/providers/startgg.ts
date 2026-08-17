import { GraphQLClient } from "graphql-request";
import {
  STARTGG_API_URL,
  RECENT_SETS_LIMIT,
  SETS_PER_REQUEST,
  CHARACTER_SELECTION_TYPE,
} from "../constants.js";
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
  sameId,
  withRetry,
} from "../utils.js";
import type {
  ISmashData,
  SmashPluginData,
  User,
  UpcomingTournament,
  RecentEventNode,
  PlayerSet,
  Game,
  GameSelection,
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
      this.fetchPlayerSets(userData.player.id, RECENT_SETS_LIMIT),
    ]);

    return this.buildPayload(userData, upcoming, recentEvents, recentSets);
  }

  // ─── API Methods ─────────────────────────────────────────────────

  private async fetchCurrentUser(): Promise<User> {
    if (this.cachedUser) return this.cachedUser;

    const data = await withRetry(
      () => this.client.request<{ currentUser: User }>(GET_CURRENT_USER),
      "Fetching current user",
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
      const data = await withRetry(
        () =>
          this.client.request<{
            user: { tournaments: { nodes: UpcomingTournament[] } };
          }>(GET_UPCOMING_TOURNAMENTS, { userId }),
        "Fetching upcoming tournaments",
      );
      return data.user.tournaments.nodes;
    } catch (e) {
      console.error("Error fetching upcoming tournaments:", e);
      return [];
    }
  }

  private async fetchRecentEvents(userId: string): Promise<ProcessedEvent[]> {
    try {
      const data = await withRetry(
        () =>
          this.client.request<{
            user: { events: { nodes: RecentEventNode[] } };
          }>(GET_RECENT_EVENTS, { userId }),
        "Fetching recent events",
      );

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
    limit: number,
  ): Promise<PlayerSet[]> {
    const sets: PlayerSet[] = [];

    for (let page = 1; sets.length < limit; page++) {
      const perPage = Math.min(SETS_PER_REQUEST, limit - sets.length);

      const data = await withRetry(
        () =>
          this.client.request<{
            player: { sets: { nodes: PlayerSet[] } | null } | null;
          }>(GET_PLAYER_SETS, { playerId, page, perPage }),
        `Fetching player sets (page ${page})`,
      );

      const nodes = data.player?.sets?.nodes ?? [];
      sets.push(...nodes);

      if (nodes.length < perPage) break;
    }

    return sets;
  }

  // ─── Processing Logic ────────────────────────────────────────────

  private buildPayload(
    userData: User,
    upcoming: UpcomingTournament[],
    recentEvents: ProcessedEvent[],
    recentSets: PlayerSet[],
  ): SmashPluginData {
    const playerId = userData.player.id;

    const { wins, losses, charUsage } = this.computeSeasonStats(
      recentSets,
      playerId,
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

    const [latestEvent, previousEvent] = recentEvents;

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
      latest_result: this.buildEventResult(latestEvent, recentSets, playerId),
      previous_result: this.buildEventResult(
        previousEvent,
        recentSets,
        playerId,
      ),
    };
  }

  /** Combines an event with the record and character usage derived from its sets. */
  private buildEventResult(
    event: ProcessedEvent | undefined,
    recentSets: PlayerSet[],
    playerId: string,
  ): ProcessedTournament | undefined {
    if (!event) return undefined;

    return this.processTournament(
      event,
      this.computeEventRecord(recentSets, event.id, playerId),
      this.findMostPlayedCharInEvent(recentSets, event.id, playerId),
    );
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
    recentSets: PlayerSet[],
    playerId: string,
  ): { wins: number; losses: number; charUsage: Record<string, number> } {
    let wins = 0;
    let losses = 0;
    const charUsage: Record<string, number> = {};

    for (const set of recentSets) {
      const userEntrantId = this.findUserEntrantId(set, playerId);
      if (!userEntrantId) continue;

      for (const game of set.games ?? []) {
        if (sameId(game.winnerId, userEntrantId)) wins++;
        else losses++;

        const selection = this.findCharacterSelection(game, userEntrantId);
        if (selection) {
          const charId = selection.selectionValue;
          charUsage[charId] = (charUsage[charId] || 0) + 1;
        }
      }
    }

    return { wins, losses, charUsage };
  }

  private computeEventRecord(
    recentSets: PlayerSet[],
    eventId: string,
    playerId: string,
  ): EventSetRecord {
    let wins = 0;
    let losses = 0;

    for (const set of this.setsForEvent(recentSets, eventId)) {
      const userEntrantId = this.findUserEntrantId(set, playerId);
      if (!userEntrantId) continue;

      if (sameId(set.winnerId, userEntrantId)) wins++;
      else losses++;
    }

    return { wins, losses };
  }

  private findMostPlayedCharInEvent(
    recentSets: PlayerSet[],
    eventId: string,
    playerId: string,
  ): CharacterInfo | undefined {
    const charCounts: Record<string, number> = {};

    for (const set of this.setsForEvent(recentSets, eventId)) {
      const userEntrantId = this.findUserEntrantId(set, playerId);
      if (!userEntrantId) continue;

      for (const game of set.games ?? []) {
        const selection = this.findCharacterSelection(game, userEntrantId);
        if (selection) {
          const charId = selection.selectionValue;
          charCounts[charId] = (charCounts[charId] || 0) + 1;
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

  private setsForEvent(recentSets: PlayerSet[], eventId: string): PlayerSet[] {
    return recentSets.filter((s) => sameId(s.event?.id, eventId));
  }

  /** Resolves which entrant in a set belongs to the given player. */
  private findUserEntrantId(
    set: PlayerSet,
    playerId: string,
  ): string | undefined {
    const slot = set.slots?.find((s) =>
      s.entrant?.participants?.some((p) => sameId(p.player?.id, playerId)),
    );
    return slot?.entrant?.id;
  }

  /**
   * Game selections are matched by entrant id rather than by nested
   * participants, keeping GET_PLAYER_SETS under start.gg's complexity cap.
   */
  private findCharacterSelection(
    game: Game,
    userEntrantId: string,
  ): GameSelection | undefined {
    return game.selections?.find(
      (s) =>
        s.selectionType === CHARACTER_SELECTION_TYPE &&
        sameId(s.entrant?.id, userEntrantId),
    );
  }
}
