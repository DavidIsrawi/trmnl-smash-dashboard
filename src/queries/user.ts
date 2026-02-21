import { gql } from 'graphql-request';

export const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    currentUser {
      id
      slug
      images {
        id
        url
        type
      }
      player {
        id
        gamerTag
      }
    }
  }
`;
