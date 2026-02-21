import { gql } from 'graphql-request';

export const GET_UPCOMING_TOURNAMENTS = gql`
  query GetUpcoming($userId: ID!) {
    user(id: $userId) {
      tournaments(query: { filter: { upcoming: true }, perPage: 3, sortBy: "startAt asc" }) {
        nodes {
          id
          name
          startAt
          city
          images {
            url
            type
          }
        }
      }
    }
  }
`;

export const GET_RECENT_EVENTS = gql`
  query GetRecentEvents($userId: ID!) {
    user(id: $userId) {
      events(query: { perPage: 5, sortBy: "startAt desc" }) {
        nodes {
          id
          name
          numEntrants
          tournament {
            name
            startAt
            city
            addrState
            images {
              url
              type
            }
          }
          userEntrant {
            standing {
              placement
            }
          }
        }
      }
    }
  }
`;
