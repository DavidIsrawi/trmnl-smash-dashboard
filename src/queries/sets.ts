import { gql } from 'graphql-request';

export const GET_PLAYER_SETS = gql`
  query GetPlayerSets($playerId: ID!, $page: Int!, $perPage: Int!) {
    player(id: $playerId) {
      sets(page: $page, perPage: $perPage, sortType: RECENT) {
        nodes {
          id
          displayScore
          winnerId
          totalGames
          completedAt
          slots {
            entrant {
              id
              name
              participants {
                player {
                  id
                  gamerTag
                }
              }
            }
          }
          event {
            id
            name
            tournament {
              name
            }
          }
          games {
            selections {
              selectionType
              selectionValue
              entrant {
                id
              }
            }
          }
        }
      }
    }
  }
`;
