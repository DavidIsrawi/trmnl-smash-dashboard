import { gql } from "graphql-request";

// Keep this selection set as narrow as possible: start.gg rejects any request
// whose estimated object count reaches 1000. Nested object lists multiply that
// count, so game selections resolve only the entrant id and are matched against
// the entrant ids already resolved from `slots`.
export const GET_PLAYER_SETS = gql`
  query GetPlayerSets($playerId: ID!, $page: Int!, $perPage: Int!) {
    player(id: $playerId) {
      sets(page: $page, perPage: $perPage) {
        nodes {
          id
          winnerId
          completedAt
          slots {
            entrant {
              id
              participants {
                player {
                  id
                }
              }
            }
          }
          event {
            id
          }
          games {
            winnerId
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
